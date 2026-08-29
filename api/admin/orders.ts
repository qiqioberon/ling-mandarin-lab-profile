import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../_lib/adminAuth';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const PROOF_URL_TTL = 60 * 15; // 15 minutes — long enough to review a batch.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(
        'order_ref, buyer_email, buyer_name, buyer_whatsapp, amount, final_amount, unique_code, expires_at, proof_path, created_at, product:products(title)'
      )
      .eq('status', 'awaiting_verification')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const result = await Promise.all(
      (orders || []).map(async (o: Record<string, any>) => {
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
          expiresAt: o.expires_at,
          productTitle: o.product?.title ?? '(produk tidak ditemukan)',
          proofUrl,
          createdAt: o.created_at,
        };
      })
    );

    return res.status(200).json({ orders: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[admin/orders] error:', error);
    return res.status(500).json({ error: message });
  }
}
