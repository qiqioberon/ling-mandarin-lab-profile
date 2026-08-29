import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { guardPurchase } from '../_lib/guards';
import { notifyTelegram, formatIDR } from '../_lib/telegram';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// QRIS unique-code space is only 900 slots per product nominal, so orders
// expire in 24h (not 48h) — a stale order otherwise squats a code. A daily cron
// (api/cron/expire-orders.ts) sweeps the rest.
const ORDER_EXPIRY_MINUTES = 24 * 60;
const MAX_PENDING_PER_EMAIL = 3;
const MAX_CODE_ATTEMPTS = 12;

// Server-side twin of the VITE_ soft-launch gate in Store.tsx. The VITE_ vars
// only gate the browser UI; without this an order can still be POSTed straight
// from DevTools. Keep PAYMENTS_LIVE / PREVIEW_EMAILS byte-for-byte in sync with
// their VITE_ counterparts.
const PAYMENTS_LIVE = process.env.PAYMENTS_LIVE === 'true';
const PREVIEW_EMAILS = (process.env.PREVIEW_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const manualSchema = z.object({
  productId: z.string().min(1),
  buyerEmail: z.string().email(),
  buyerName: z.string().min(2),
  buyerWhatsapp: z
    .string()
    .min(9)
    .regex(/^[0-9+]+$/, 'Hanya masukkan angka'),
  // How the buyer pays: static QRIS scan, or BCA bank transfer.
  method: z.enum(['qris', 'bca']),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const parsed = manualSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message || 'Permintaan tidak valid' });
    }
    const { productId, buyerEmail, buyerName, buyerWhatsapp, method } = parsed.data;

    // Soft-launch gate: before launch only preview emails may create orders.
    if (!PAYMENTS_LIVE && !PREVIEW_EMAILS.includes(String(buyerEmail).toLowerCase())) {
      return res.status(403).json({ error: 'Penjualan belum dibuka untuk umum.' });
    }

    // Same shared guards as checkout.ts (beta whitelist / product / ownership).
    const guard = await guardPurchase(productId, buyerEmail);
    if (!guard.ok) {
      return res.status(guard.status).json({
        error: guard.error,
        ...(guard.alreadyOwned ? { alreadyOwned: true } : {}),
      });
    }
    const { product, normalizedEmail } = guard;

    // Anti-spam: cap unverified submissions per email.
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_email', normalizedEmail)
      .eq('status', 'awaiting_verification');
    if ((count ?? 0) >= MAX_PENDING_PER_EMAIL) {
      return res.status(429).json({
        error:
          'Anda punya beberapa pesanan yang masih menunggu verifikasi. Mohon tunggu kami memproses yang sebelumnya.',
      });
    }

    // No service fee on manual QRIS/BCA: total stays a round 60k + unique code.
    const baseAmount = product.price;
    const orderRef = `LCL-M-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    // Extensionless path: the order is created before the buyer picks a proof
    // file, and Storage serves objects by their upload content-type anyway.
    const proofPath = `proofs/${orderRef}`;
    const expiresAt = new Date(
      Date.now() + ORDER_EXPIRY_MINUTES * 60_000
    ).toISOString();

    // Allocate a 3-digit unique code by inserting and letting the partial unique
    // index reject collisions (error 23505). The DB — not this loop — is the
    // real guarantee against two concurrent orders sharing a nominal.
    let uniqueCode = 0;
    let finalAmount = 0;
    let inserted = false;
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      uniqueCode = Math.floor(Math.random() * 900) + 100; // 100–999
      finalAmount = baseAmount + uniqueCode;

      const { error } = await supabase.from('orders').insert({
        order_ref: orderRef,
        product_id: productId,
        buyer_email: normalizedEmail,
        buyer_name: buyerName,
        buyer_whatsapp: buyerWhatsapp,
        amount: finalAmount,
        base_amount: baseAmount,
        final_amount: finalAmount,
        unique_code: uniqueCode,
        service_fee: 0,
        payment_method: method, // 'qris' | 'bca'
        status: 'awaiting_verification',
        proof_path: proofPath,
        expires_at: expiresAt,
      });
      if (!error) {
        inserted = true;
        break;
      }
      if (error.code !== '23505') throw error; // 23505 = unique_violation
    }
    if (!inserted) {
      return res.status(503).json({
        error: 'Sistem sedang sibuk. Mohon coba lagi dalam beberapa menit.',
      });
    }

    // Signed upload URL: browser PUTs the proof straight to Storage, dodging the
    // 4.5MB Vercel body limit and the 33% base64 bloat.
    const { data: signed, error: signError } = await supabase.storage
      .from('payment-proofs')
      .createSignedUploadUrl(proofPath);
    if (signError || !signed) {
      throw signError || new Error('Gagal membuat URL unggah');
    }

    await notifyTelegram(
      `🧾 <b>Pesanan baru (${method === 'bca' ? 'Transfer BCA' : 'QRIS'})</b>\n` +
        `Ref: <code>${orderRef}</code>\n` +
        `${product.title}\n` +
        `${buyerName} — ${normalizedEmail}\n` +
        `WA: ${buyerWhatsapp}\n` +
        `Nominal: <b>${formatIDR(finalAmount)}</b> (kode ${uniqueCode})\n` +
        `Verifikasi di /admin/verify`
    );

    return res.status(200).json({
      orderRef,
      method,
      uploadUrl: signed.signedUrl,
      token: signed.token,
      path: proofPath,
      baseAmount,
      serviceFee: 0,
      uniqueCode,
      finalAmount,
      expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[manual/create] error:', error);
    return res.status(500).json({ error: message });
  }
}
