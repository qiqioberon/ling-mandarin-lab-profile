import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 0.3 — Identity Verification via Supabase Access Token
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized. Access token is required.' });
    }

    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized. Invalid or expired session token.' });
    }

    const verifiedEmail = userData.user.email;
    const { slug, productId } = req.body || {};
    const targetIdentifier = slug || productId;

    if (!targetIdentifier) {
      return res.status(400).json({ error: 'slug or productId is required' });
    }

    // 0.4 — Slug vs UUID Resolution
    // Resolve product by slug first, fallback to id if UUID
    let { data: product, error: productError } = await supabase
      .from('products')
      .select('id, pdf_path')
      .eq('slug', targetIdentifier)
      .maybeSingle();

    if (!product) {
      const { data: productById } = await supabase
        .from('products')
        .select('id, pdf_path')
        .eq('id', targetIdentifier)
        .maybeSingle();
      product = productById;
    }

    if (!product || !product.pdf_path) {
      return res.status(404).json({ error: 'Product or PDF file not found' });
    }

    // Check entitlement using verified user email and resolved UUID product.id
    const { data: entitlement, error: entError } = await supabase
      .from('entitlements')
      .select('*')
      .eq('product_id', product.id)
      .eq('buyer_email', verifiedEmail)
      .maybeSingle();

    if (entError || !entitlement) {
      return res.status(403).json({ error: 'Forbidden. You do not have access to this product.' });
    }

    // Create signed url (valid for 60 seconds / 1 minute)
    const { data: signedUrlData, error: signError } = await supabase
      .storage
      .from('ebooks')
      .createSignedUrl(product.pdf_path, 60);

    if (signError || !signedUrlData) {
      return res.status(500).json({ error: 'Failed to generate signed URL' });
    }

    return res.status(200).json({ signedUrl: signedUrlData.signedUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return res.status(500).json({ error: message });
  }
}
