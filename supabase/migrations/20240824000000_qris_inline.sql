-- QRIS inline payment support.
-- Adds the columns the self-hosted QRIS flow needs (unique nominal, expiry,
-- proof of payment, manual verification audit) plus the integrity constraints
-- that make auto-reconciliation trustworthy.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;   -- 'qris' | 'doku'
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS qris_provider  text;   -- 'self' | 'doku'
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS base_amount    integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS final_amount   integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS unique_suffix  integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS service_fee    integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS proof_url      text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS expires_at     timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS verified_by    text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS verified_at    timestamptz;

-- Two active self-QRIS orders must never share a unique nominal; otherwise
-- reconciliation is ambiguous and auto-unlock cannot be trusted. Scoped to
-- qris_provider='self' so Doku orders (which reuse the base total) are exempt.
CREATE UNIQUE INDEX IF NOT EXISTS orders_final_amount_active_idx
  ON public.orders (final_amount)
  WHERE status IN ('pending', 'awaiting_verification') AND qris_provider = 'self';

CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_expires_at_idx ON public.orders (expires_at)
  WHERE status = 'pending';

-- Private bucket for buyer-uploaded transfer proofs. Read/written only via the
-- service-role key from the backend; never exposed to anon/authenticated.
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;
