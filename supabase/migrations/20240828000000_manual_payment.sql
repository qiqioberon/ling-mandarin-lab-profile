-- Manual payment pathway (human-verified bank transfer).
-- Most columns the manual flow needs (verified_by, verified_at, base_amount,
-- final_amount, service_fee, expires_at, payment_method) and the
-- `payment-proofs` bucket already exist from 20240824000000_qris_inline.sql.
-- This migration only adds what is genuinely new.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS proof_path      text,   -- storage object path in payment-proofs
  ADD COLUMN IF NOT EXISTS rejection_note  text,
  ADD COLUMN IF NOT EXISTS unique_code     integer; -- 3-digit discriminator baked into the nominal

-- Unique nominal is what tells two QRIS payments apart (Livin' Merchant QR is
-- static — same QR for everyone). Only *waiting* orders must not collide; once
-- an order is paid/rejected/expired its code is freed for reuse. The DB
-- constraint (not app code) is the real guarantee: two concurrent inserts can
-- pass the same app-level check but only one survives this index.
CREATE UNIQUE INDEX IF NOT EXISTS orders_pending_amount_uniq
  ON public.orders (final_amount)
  WHERE status = 'awaiting_verification';

-- Status 'awaiting_verification' and 'rejected' are plain text values on the
-- existing unconstrained status column — no ALTER TYPE needed.
CREATE INDEX IF NOT EXISTS orders_awaiting_idx
  ON public.orders (status, created_at DESC)
  WHERE status = 'awaiting_verification';

-- Private bucket (already created by the QRIS migration; kept idempotent so this
-- file is self-contained). All access is via service_role signed upload/URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;
