-- Record which pathway settled an order (doku-webhook | admin | bridge | reconcile).
-- Written by settlePayment() so manual and automatic settlements are auditable.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_source text;
