import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildDynamicQris } from '../_lib/qris';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Returns the QRIS payload for an order. The nominal is always bound to a real
 * awaiting_verification order, which is why the static payload lives in an env
 * var read here (never a VITE_ var shipped to the browser).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const orderRef = String(req.query.orderRef || '');
  if (!orderRef) return res.status(400).json({ error: 'orderRef wajib diisi' });

  const staticPayload = process.env.QRIS_STATIC_PAYLOAD || '';
  if (!staticPayload) {
    return res.status(503).json({ error: 'QRIS belum dikonfigurasi.' });
  }

  try {
    const { data: order } = await supabase
      .from('orders')
      .select('status, final_amount, unique_code, expires_at')
      .eq('order_ref', orderRef)
      .single();

    if (!order || order.status !== 'awaiting_verification') {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan atau sudah selesai.' });
    }
    if (order.expires_at && new Date(order.expires_at).getTime() < Date.now()) {
      return res.status(410).json({ error: 'Pesanan sudah kedaluwarsa. Silakan buat pesanan baru.' });
    }

    const dynamicEnabled = process.env.QRIS_DYNAMIC_ENABLED === 'true';
    let payload = staticPayload;
    let isDynamic = false;
    if (dynamicEnabled) {
      try {
        payload = buildDynamicQris(staticPayload, order.final_amount);
        isDynamic = true;
      } catch (e) {
        // Fall back to static if the merchant payload can't be made dynamic.
        console.error('[manual/qris] dynamic build failed, using static:', e);
      }
    }

    return res.status(200).json({
      payload,
      amount: order.final_amount,
      uniqueCode: order.unique_code,
      isDynamic,
      expiresAt: order.expires_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[manual/qris] error:', error);
    return res.status(500).json({ error: message });
  }
}
