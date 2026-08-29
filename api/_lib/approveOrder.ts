import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { settlePayment } from './grantEntitlement';
import { notifyTelegram, formatIDR } from './telegram';

/**
 * Shared approve/reject for a manual order. Used by BOTH /api/admin/verify
 * (Supabase-admin auth) and /api/admin/dashboard (password auth) so the two
 * paths can never grant access differently.
 */

// Lazy so importing this module can't crash a function at load when the
// Supabase env vars are unset (which Vercel renders as a non-JSON 500).
function db() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

function baseUrl() {
  return (process.env.PUBLIC_BASE_URL || 'https://www.lingchineselab.com').replace(/\/$/, '');
}

export type ApproveResult =
  | { ok: true; accessUrl: string; alreadyPaid: boolean }
  | { ok: false; status: number; error: string };

/** Approve an order: settle → mint access token → return the reader link. */
export async function approveOrder(orderRef: string, actor: string): Promise<ApproveResult> {
  const supabase = db();
  const { data: order } = await supabase
    .from('orders')
    .select('amount, access_token, product:products(title, slug)')
    .eq('order_ref', orderRef)
    .single();
  if (!order) return { ok: false, status: 404, error: 'Order tidak ditemukan.' };

  const product = (order as unknown as { product: { title: string; slug: string } | null }).product;
  const productTitle = product?.title ?? 'E-Book';
  const productSlug = product?.slug ?? '';

  const result = await settlePayment({ orderRef, source: 'manual' });
  if (!result.ok && !result.alreadyPaid) {
    return { ok: false, status: 500, error: `Gagal menyetujui: ${result.reason}` };
  }

  // Mint a no-email access token once (idempotent — reuse if already set).
  let accessToken = order.access_token as string | null;
  if (!accessToken) {
    accessToken = randomUUID();
    await supabase.from('orders').update({ access_token: accessToken }).eq('order_ref', orderRef);
  }
  await supabase
    .from('orders')
    .update({ verified_by: actor, verified_at: new Date().toISOString() })
    .eq('order_ref', orderRef);

  const accessUrl = `${baseUrl()}/read/${productSlug}?t=${accessToken}`;

  if (!result.alreadyPaid) {
    await notifyTelegram(
      `✅ <b>Pembayaran disetujui</b>\n` +
        `Ref: <code>${orderRef}</code>\n` +
        `${productTitle} — ${formatIDR(order.amount)}\n` +
        `Oleh: ${actor}\n` +
        `➡️ Kirim link akses ke WhatsApp pembeli.`
    );
  }

  return { ok: true, accessUrl, alreadyPaid: !!result.alreadyPaid };
}

/** Reject an order: flip status + keep the proof for the audit trail. */
export async function rejectOrder(
  orderRef: string,
  actor: string,
  note?: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const supabase = db();
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'rejected',
      rejection_note: note || null,
      verified_by: actor,
      verified_at: new Date().toISOString(),
    })
    .eq('order_ref', orderRef);
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true };
}
