-- No-email access: each paid order gets a random access_token. The buyer opens
-- /read/:slug?t=<token> — no login, no email. The token binds to the first
-- devices that open it (max 2: e.g. phone + laptop), so the link can't be freely
-- shared. Admin can clear access_devices to let a buyer re-bind a new device.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS access_token   text,
  ADD COLUMN IF NOT EXISTS access_devices text[] NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS orders_access_token_uniq
  ON public.orders (access_token)
  WHERE access_token IS NOT NULL;
