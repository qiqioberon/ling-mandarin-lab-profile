import { z } from 'zod';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../_lib/adminAuth';
import { settlePayment } from '../_lib/grantEntitlement';
import { notifyTelegram, formatIDR } from '../_lib/telegram';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const verifySchema = z.object({
  orderRef: z.string().min(1),
  action: z.enum(['approve', 'reject', 'reset_devices']),
  note: z.string().max(500).optional(),
});

function baseUrl() {
  return (process.env.PUBLIC_BASE_URL || 'https://www.lingchineselab.com').replace(/\/$/, '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message || 'Permintaan tidak valid' });
    }
    const { orderRef, action, note } = parsed.data;

    const { data: order } = await supabase
      .from('orders')
      .select('buyer_email, buyer_name, amount, access_token, product:products(title, slug)')
      .eq('order_ref', orderRef)
      .single();
    if (!order) {
      return res.status(404).json({ error: 'Order tidak ditemukan.' });
    }
    const product = (order as unknown as { product: { title: string; slug: string } | null }).product;
    const productTitle = product?.title ?? 'E-Book';
    const productSlug = product?.slug ?? '';

    // Support: clear bound devices so the buyer can activate a new phone/laptop.
    if (action === 'reset_devices') {
      const { error } = await supabase
        .from('orders')
        .update({ access_devices: [], verified_by: auth.email, verified_at: new Date().toISOString() })
        .eq('order_ref', orderRef);
      if (error) throw error;
      // Audit who reset and when (Telegram is the ops log for this flow).
      await notifyTelegram(
        `🔄 <b>Reset perangkat</b>\nRef: <code>${orderRef}</code>\nOleh: ${auth.email}`
      );
      return res.status(200).json({ ok: true, action: 'reset_devices' });
    }

    if (action === 'reject') {
      // Keep the proof for the audit trail — only flip status + note.
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'rejected',
          rejection_note: note || null,
          verified_by: auth.email,
          verified_at: new Date().toISOString(),
        })
        .eq('order_ref', orderRef);
      if (error) throw error;
      return res.status(200).json({ ok: true, action: 'reject' });
    }

    // approve → single source of truth for grant.
    const result = await settlePayment({ orderRef, source: 'manual' });
    if (!result.ok && !result.alreadyPaid) {
      return res.status(500).json({ error: `Gagal menyetujui: ${result.reason}` });
    }

    // Mint a no-email access token once (idempotent — reuse if already set).
    let accessToken = order.access_token as string | null;
    if (!accessToken) {
      accessToken = randomUUID();
      await supabase
        .from('orders')
        .update({ access_token: accessToken })
        .eq('order_ref', orderRef);
    }
    await supabase
      .from('orders')
      .update({ verified_by: auth.email, verified_at: new Date().toISOString() })
      .eq('order_ref', orderRef);

    const accessUrl = `${baseUrl()}/read/${productSlug}?t=${accessToken}`;

    if (!result.alreadyPaid) {
      await notifyTelegram(
        `✅ <b>Pembayaran disetujui</b>\n` +
          `Ref: <code>${orderRef}</code>\n` +
          `${productTitle} — ${formatIDR(order.amount)}\n` +
          `Oleh: ${auth.email}\n` +
          `➡️ Kirim link akses ke WhatsApp pembeli.`
      );
    }

    return res.status(200).json({
      ok: true,
      action: 'approve',
      alreadyPaid: result.alreadyPaid,
      accessUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[admin/verify] error:', error);
    return res.status(500).json({ error: message });
  }
}
