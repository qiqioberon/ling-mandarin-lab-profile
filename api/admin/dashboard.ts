import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { approveOrder, rejectOrder } from '../_lib/approveOrder';

/**
 * Admin recap dashboard, gated by a simple username/password sent in headers.
 *
 * SECURITY NOTE: this is intentionally weak auth (owner's insistence). Anyone
 * with the password can approve orders (= grant irrevocable paid access) and
 * read every buyer's PII + proof. Change ADMIN_USER / ADMIN_PASSWORD in Vercel
 * away from the defaults before going live. The approve/reject logic is shared
 * with /api/admin/verify via approveOrder.ts so the two paths can't drift.
 */
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const PROOF_URL_TTL = 60 * 15; // 15 minutes

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = String(req.headers['x-admin-user'] || '');
  const pass = String(req.headers['x-admin-password'] || '');
  if (user !== ADMIN_USER || pass !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Username atau password salah.' });
  }

  // Approve / reject — same grant path as /api/admin/verify.
  if (req.method === 'POST') {
    const { orderRef, action, note } = (req.body || {}) as {
      orderRef?: string;
      action?: string;
      note?: string;
    };
    if (!orderRef || (action !== 'approve' && action !== 'reject')) {
      return res.status(400).json({ error: 'Permintaan tidak valid.' });
    }
    try {
      if (action === 'reject') {
        const r = await rejectOrder(orderRef, 'dashboard:' + user, note);
        if (!r.ok) return res.status(r.status).json({ error: r.error });
        return res.status(200).json({ ok: true, action: 'reject' });
      }
      const r = await approveOrder(orderRef, 'dashboard:' + user);
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      return res.status(200).json({ ok: true, action: 'approve', accessUrl: r.accessUrl, alreadyPaid: r.alreadyPaid });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      console.error('[admin/dashboard] action error:', error);
      return res.status(500).json({ error: message });
    }
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(
        'order_ref, buyer_email, buyer_name, buyer_whatsapp, amount, final_amount, unique_code, status, payment_method, proof_path, created_at, product:products(title)'
      )
      .in('status', ['awaiting_verification', 'paid', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) throw error;

    const result = await Promise.all(
      (orders || []).map(async (o) => {
        let proofUrl: string | null = null;
        if (o.proof_path) {
          const { data: signed } = await supabase.storage
            .from('payment-proofs')
            .createSignedUrl(o.proof_path, PROOF_URL_TTL);
          proofUrl = signed?.signedUrl ?? null;
        }
        return {
          orderRef: o.order_ref,
          buyerEmail: o.buyer_email,
          buyerName: o.buyer_name,
          buyerWhatsapp: o.buyer_whatsapp,
          amount: o.final_amount ?? o.amount,
          uniqueCode: o.unique_code,
          status: o.status,
          paymentMethod: o.payment_method,
          productTitle: o.product?.title ?? '(produk tidak ditemukan)',
          proofUrl,
          createdAt: o.created_at,
        };
      })
    );

    return res.status(200).json({ orders: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[admin/dashboard] error:', error);
    return res.status(500).json({ error: message });
  }
}
