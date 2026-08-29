import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Daily sweep: expire stale awaiting_verification orders so their unique codes
 * (only 900 per product nominal) are freed. Vercel Cron sends
 * `Authorization: Bearer ${CRON_SECRET}`; reject anything else.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status: 'expired' })
      .eq('status', 'awaiting_verification')
      .lt('expires_at', new Date().toISOString())
      .select('order_ref');
    if (error) throw error;

    return res.status(200).json({ ok: true, expired: data?.length ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[cron/expire-orders] error:', error);
    return res.status(500).json({ error: message });
  }
}
