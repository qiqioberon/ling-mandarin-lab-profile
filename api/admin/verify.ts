import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../_lib/adminAuth';
import { notifyTelegram } from '../_lib/telegram';
import { approveOrder, rejectOrder } from '../_lib/approveOrder';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const verifySchema = z.object({
  orderRef: z.string().min(1),
  action: z.enum(['approve', 'reject', 'reset_devices']),
  note: z.string().max(500).optional(),
});

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
      const r = await rejectOrder(orderRef, auth.email, note);
      if (!r.ok) return res.status(r.status).json({ error: r.error });
      return res.status(200).json({ ok: true, action: 'reject' });
    }

    const r = await approveOrder(orderRef, auth.email);
    if (!r.ok) return res.status(r.status).json({ error: r.error });
    return res.status(200).json({
      ok: true,
      action: 'approve',
      alreadyPaid: r.alreadyPaid,
      accessUrl: r.accessUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[admin/verify] error:', error);
    return res.status(500).json({ error: message });
  }
}
