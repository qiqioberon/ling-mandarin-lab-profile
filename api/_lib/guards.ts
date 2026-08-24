import { createClient } from '@supabase/supabase-js';

/**
 * Shared purchase guards used by BOTH /api/checkout and /api/qris/create.
 *
 * Extracted so the beta whitelist, product lookup, and ownership check can
 * never drift between the two payment entry points. If one path is patched,
 * the other gets the same behaviour for free.
 */

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Beta whitelist lives server-side only (comma-separated emails). Never expose
// the tester list to the browser — it only tells an attacker who the testers are.
const BETA_ALLOWED_EMAILS = (process.env.BETA_ALLOWED_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export interface Product {
  id: string;
  slug: string;
  title: string;
  price: number;
  [key: string]: unknown;
}

export interface GuardOk {
  ok: true;
  product: Product;
  normalizedEmail: string;
}

export interface GuardError {
  ok: false;
  status: number;
  error: string;
  alreadyOwned?: boolean;
}

export type GuardResult = GuardOk | GuardError;

/**
 * Run the shared pre-purchase checks: beta whitelist → product exists →
 * buyer does not already own it. Returns a structured result so each endpoint
 * can map it to an HTTP response in its own style.
 */
export async function guardPurchase(
  productId: string,
  buyerEmail: string
): Promise<GuardResult> {
  const normalizedEmail = buyerEmail.trim().toLowerCase();

  // --- BETA TESTING WHITELIST (server-side) ---
  if (
    BETA_ALLOWED_EMAILS.length > 0 &&
    !BETA_ALLOWED_EMAILS.includes(normalizedEmail)
  ) {
    return {
      ok: false,
      status: 403,
      error:
        'Mohon maaf, sistem pembayaran masih dalam tahap pengujian internal (Beta). Email Anda belum terdaftar sebagai tester.',
    };
  }

  // Fetch product details from database.
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (productError || !product) {
    return { ok: false, status: 404, error: 'Product not found' };
  }

  // Reject if the buyer already owns this product (real ownership check).
  const { data: existingEntitlement } = await supabase
    .from('entitlements')
    .select('id')
    .eq('buyer_email', normalizedEmail)
    .eq('product_id', productId)
    .maybeSingle();

  if (existingEntitlement) {
    return {
      ok: false,
      status: 409,
      error: 'Anda sudah memiliki produk ini.',
      alreadyOwned: true,
    };
  }

  return { ok: true, product: product as Product, normalizedEmail };
}
