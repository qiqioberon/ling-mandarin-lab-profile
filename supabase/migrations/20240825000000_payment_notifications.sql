-- Audit log for the QRIS auto-unlock bridge (MacroDroid → /api/qris-notify).
-- Every inbound notification is recorded here BEFORE matching, so failed parses
-- keep their raw text for regex tuning, and `nonce UNIQUE` blocks replays at the
-- database level.
CREATE TABLE IF NOT EXISTS public.payment_notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source        text NOT NULL DEFAULT 'bridge',
  raw           text NOT NULL,
  package_name  text,
  parsed_amount integer,
  matched       boolean DEFAULT false,
  order_ref     text,
  reason        text,
  nonce         text UNIQUE,
  received_at   timestamptz,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_notifications_recent_idx
  ON public.payment_notifications (created_at DESC);

ALTER TABLE public.payment_notifications ENABLE ROW LEVEL SECURITY;
-- No policy: only the service-role key (backend) can read/write.
