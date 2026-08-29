import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { decideDeviceAccess } from './_lib/deviceLock';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const MAX_DEVICES = 2; // phone + laptop

async function signPdf(pdfPath: string, res: VercelResponse) {
  const { data, error } = await supabase.storage
    .from('ebooks')
    .createSignedUrl(pdfPath, 60);
  if (error || !data) {
    return res.status(500).json({ error: 'Failed to generate signed URL' });
  }
  return res.status(200).json({ signedUrl: data.signedUrl });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { slug, productId, token, deviceId } = req.body || {};

    // ── No-email access path: a magic-link token bound to <=2 devices ──────────
    if (token) {
      if (!deviceId) {
        return res.status(400).json({ error: 'deviceId is required' });
      }
      const { data: order } = await supabase
        .from('orders')
        .select('id, product_id, status, access_devices')
        .eq('access_token', token)
        .maybeSingle();

      if (!order || order.status !== 'paid') {
        return res.status(403).json({ error: 'Link tidak valid atau pembayaran belum diverifikasi.' });
      }

      // ponytail: read-modify-write device claim; a tiny race could admit a 3rd
      // device under simultaneous first-opens. Fine at this volume; tighten with
      // a DB function if it ever matters.
      const devices: string[] = order.access_devices || [];
      const decision = decideDeviceAccess(devices, deviceId, MAX_DEVICES);
      if (decision === 'deny') {
        return res.status(403).json({
          error: 'Link ini sudah aktif di 2 perangkat. Hubungi kami untuk reset.',
          deviceLimit: true,
        });
      }
      if (decision === 'claim') {
        const { error: bindErr } = await supabase
          .from('orders')
          .update({ access_devices: [...devices, deviceId] })
          .eq('id', order.id);
        if (bindErr) return res.status(500).json({ error: 'Gagal mengaktifkan perangkat.' });
      }

      const { data: product } = await supabase
        .from('products')
        .select('pdf_path')
        .eq('id', order.product_id)
        .maybeSingle();
      if (!product?.pdf_path) {
        return res.status(404).json({ error: 'Product or PDF file not found' });
      }
      return signPdf(product.pdf_path, res);
    }

    // ── Legacy path: Supabase auth token → entitlement by email ────────────────
    const authHeader = req.headers.authorization || '';
    const authToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!authToken) {
      return res.status(401).json({ error: 'Unauthorized. Access token is required.' });
    }

    const { data: userData, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !userData?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized. Invalid or expired session token.' });
    }
    const verifiedEmail = userData.user.email;
    const targetIdentifier = slug || productId;
    if (!targetIdentifier) {
      return res.status(400).json({ error: 'slug or productId is required' });
    }

    let { data: product } = await supabase
      .from('products')
      .select('id, pdf_path')
      .eq('slug', targetIdentifier)
      .maybeSingle();
    if (!product) {
      const { data: byId } = await supabase
        .from('products')
        .select('id, pdf_path')
        .eq('id', targetIdentifier)
        .maybeSingle();
      product = byId;
    }
    if (!product || !product.pdf_path) {
      return res.status(404).json({ error: 'Product or PDF file not found' });
    }

    const { data: entitlement } = await supabase
      .from('entitlements')
      .select('id')
      .eq('product_id', product.id)
      .eq('buyer_email', verifiedEmail)
      .maybeSingle();
    if (!entitlement) {
      return res.status(403).json({ error: 'Forbidden. You do not have access to this product.' });
    }

    return signPdf(product.pdf_path, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return res.status(500).json({ error: message });
  }
}
