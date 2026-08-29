-- =============================================================================
-- Consolidated, idempotent schema for a FRESH Supabase project.
-- Represents the final state of all migrations in supabase/migrations/*.
-- Safe to run more than once. Paste into Supabase Dashboard → SQL Editor → Run,
-- or apply with psql against the project's Postgres connection.
-- =============================================================================

-- 1. products ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  price integer NOT NULL,
  cover_url text,
  pdf_path text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. orders (final shape: doku_invoice_id + payment_source + QRIS columns) ---
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_ref text UNIQUE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE RESTRICT,
  buyer_email text NOT NULL,
  buyer_name text NOT NULL,
  buyer_whatsapp text NOT NULL,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  doku_invoice_id text,
  snap_token text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Columns added by later migrations (idempotent).
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_source text;
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

-- 3. entitlements -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entitlements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  buyer_email text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  granted_at timestamptz DEFAULT now(),
  UNIQUE(buyer_email, product_id)
);

-- 4. Row Level Security -----------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public products are viewable by everyone." ON public.products;
CREATE POLICY "Public products are viewable by everyone."
  ON public.products FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Users can see their own entitlements" ON public.entitlements;
CREATE POLICY "Users can see their own entitlements"
  ON public.entitlements FOR SELECT
  TO authenticated
  USING (buyer_email = auth.email());
-- orders: no public policy; all access is via the service-role key on the backend.

-- 5. Indexes for the QRIS flow ---------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS orders_final_amount_active_idx
  ON public.orders (final_amount)
  WHERE status IN ('pending', 'awaiting_verification') AND qris_provider = 'self';

CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
CREATE INDEX IF NOT EXISTS orders_expires_at_idx ON public.orders (expires_at)
  WHERE status = 'pending';

-- 6. Storage buckets (private) ---------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('ebooks', 'ebooks', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- 7. QRIS auto-unlock bridge audit log ------------------------------------
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

-- 7b. Manual payment (proof) + no-email tokenized access -------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS proof_path      text,
  ADD COLUMN IF NOT EXISTS rejection_note  text,
  ADD COLUMN IF NOT EXISTS unique_code     integer,
  ADD COLUMN IF NOT EXISTS access_token    text,
  ADD COLUMN IF NOT EXISTS access_devices  text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS orders_awaiting_idx
  ON public.orders (status, created_at DESC)
  WHERE status = 'awaiting_verification';

-- Unique nominal per waiting order (QRIS/BCA matching).
CREATE UNIQUE INDEX IF NOT EXISTS orders_pending_amount_uniq
  ON public.orders (final_amount)
  WHERE status = 'awaiting_verification';

-- Magic-link access token (no-email reader access).
CREATE UNIQUE INDEX IF NOT EXISTS orders_access_token_uniq
  ON public.orders (access_token)
  WHERE access_token IS NOT NULL;

-- 8. Seed / Update default product title -----------------------------------
UPDATE public.products
SET title = 'E-Book Ling Chinese Lab Volume I'
WHERE slug IN ('test-katalog', 'rahasia-huruf-mandarin-vol-1') OR title ILIKE '%Mandarin%' OR title ILIKE '%Uji%';
