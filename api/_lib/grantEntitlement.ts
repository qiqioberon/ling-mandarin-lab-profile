import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export type SettleSource = 'ipaymu' | 'manual';

export interface SettlePaymentParams {
  orderRef: string;
  source: SettleSource;
  /** Optional payment timestamp; defaults to now. Ignored if order is already paid. */
  paidAt?: string;
  /** Optional external reference (e.g. Doku invoice id / bank ref). */
  rawRef?: string;
}

export interface SettlePaymentResult {
  ok: boolean;
  alreadyPaid: boolean;
  reason?: string;
}

/**
 * Mark an order paid and grant the buyer their product entitlement.
 *
 * This is the single source of truth for "payment settled → access granted".
 * It is called from three places (Doku webhook, manual admin approval, and the
 * auto-unlock notification bridge), so it must behave identically for all.
 *
 * Guarantees:
 *  - Idempotent: calling twice for the same orderRef never double-grants and
 *    never overwrites an existing paid_at.
 *  - Returns a structured result instead of throwing for normal cases (order
 *    already paid, order not found), so callers can distinguish outcomes.
 */
export async function settlePayment(
  params: SettlePaymentParams
): Promise<SettlePaymentResult> {
  const { orderRef, source, paidAt, rawRef } = params;

  if (!orderRef) {
    return { ok: false, alreadyPaid: false, reason: 'missing_order_ref' };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Look up the order.
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, buyer_email, product_id, status, paid_at')
    .eq('order_ref', orderRef)
    .single();

  if (fetchError || !order) {
    return { ok: false, alreadyPaid: false, reason: 'order_not_found' };
  }

  // 2. Idempotency guard — already settled, nothing to do.
  if (order.status === 'paid') {
    return { ok: true, alreadyPaid: true };
  }

  // 3. Mark the order paid. The `.neq('status', 'paid')` guard makes the update
  //    a no-op if a concurrent settle won the race, so paid_at is written once.
  const settledAt = paidAt || new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      paid_at: settledAt,
      payment_source: source,
      doku_invoice_id: rawRef ?? orderRef,
    })
    .eq('order_ref', orderRef)
    .neq('status', 'paid')
    .select('id, buyer_email, product_id')
    .maybeSingle();

  if (updateError) {
    return { ok: false, alreadyPaid: false, reason: 'order_update_failed' };
  }

  // A concurrent call settled it first — treat as already paid, don't re-grant.
  if (!updated) {
    return { ok: true, alreadyPaid: true };
  }

  // 4. Grant the entitlement. Upsert is idempotent on (buyer_email, product_id).
  //    NOTE: onConflict must have NO space after the comma, otherwise Supabase
  //    fails to match the unique constraint.
  const { error: entitlementError } = await supabase.from('entitlements').upsert(
    {
      buyer_email: updated.buyer_email,
      product_id: updated.product_id,
      order_id: updated.id,
    },
    { onConflict: 'buyer_email,product_id', ignoreDuplicates: true }
  );

  if (entitlementError) {
    // Order is paid but entitlement failed — surface it so it can be retried
    // (via admin/reconcile) rather than silently swallowing.
    return { ok: false, alreadyPaid: false, reason: 'entitlement_grant_failed' };
  }

  return { ok: true, alreadyPaid: false };
}
