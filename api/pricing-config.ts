import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SERVICE_FEE } from './_lib/pricing';

/**
 * Public pricing config for the checkout UI. The frontend reads the service fee
 * from here rather than hardcoding it, so the displayed total always matches
 * what the backend charges.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  return res.status(200).json({ serviceFee: SERVICE_FEE });
}
