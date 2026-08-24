import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { orderRef } = req.query;
    if (!orderRef || typeof orderRef !== 'string') {
      return res.status(400).json({ error: 'orderRef is required' });
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('status, payment_method, expires_at, final_amount, amount')
      .eq('order_ref', orderRef)
      .single();

    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    let status = order.status;

    // Auto-expire a pending order past its expiry before responding.
    if (
      status === 'pending' &&
      order.expires_at &&
      new Date(order.expires_at).getTime() < Date.now()
    ) {
      const { data: updated } = await supabase
        .from('orders')
        .update({ status: 'expired' })
        .eq('order_ref', orderRef)
        .eq('status', 'pending')
        .select('status')
        .maybeSingle();
      if (updated) status = 'expired';
    }

    return res.status(200).json({
      status,
      paymentMethod: order.payment_method ?? null,
      expiresAt: order.expires_at ?? null,
      finalAmount: order.final_amount ?? order.amount ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal Server Error';
    return res.status(500).json({ error: message });
  }
}
