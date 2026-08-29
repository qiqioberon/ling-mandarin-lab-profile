import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { SERVICE_FEE } from './_lib/pricing';
import { guardPurchase } from './_lib/guards';
import { getIpaymuConfig, ipaymuPost } from './_lib/ipaymu';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// iPaymu sessions live 24h by default.
const ORDER_EXPIRY_MINUTES = 24 * 60;

const checkoutSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  buyerEmail: z.string().email('Invalid email'),
  buyerName: z.string().min(2, 'Name too short'),
  buyerWhatsapp: z
    .string()
    .min(9, 'Invalid WhatsApp number')
    .regex(/^[0-9+]+$/, 'Digits only'),
});

/** Public base URL for return/notify callbacks. */
function resolveBaseUrl(req: VercelRequest): string {
  const configured = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  const host = req.headers.host || 'www.lingchineselab.com';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message || 'Invalid request' });
    }
    const { productId, buyerEmail, buyerName, buyerWhatsapp } = parsed.data;

    // Shared guards: beta whitelist / product exists / not already owned.
    const guard = await guardPurchase(productId, buyerEmail);
    if (!guard.ok) {
      return res.status(guard.status).json({
        error: guard.error,
        ...(guard.alreadyOwned ? { alreadyOwned: true } : {}),
      });
    }
    const { product, normalizedEmail } = guard;

    const amount = product.price + SERVICE_FEE;
    const orderRef = `LCL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const expiresAt = new Date(
      Date.now() + ORDER_EXPIRY_MINUTES * 60_000
    ).toISOString();

    // Create the pending order first so the callback (which arrives by
    // referenceId = orderRef) always has a row to settle.
    const { error: orderError } = await supabase.from('orders').insert({
      order_ref: orderRef,
      product_id: productId,
      buyer_email: normalizedEmail,
      buyer_name: buyerName,
      buyer_whatsapp: buyerWhatsapp,
      amount,
      base_amount: amount,
      final_amount: amount,
      service_fee: SERVICE_FEE,
      payment_method: 'ipaymu',
      status: 'pending',
      expires_at: expiresAt,
    });
    if (orderError) throw orderError;

    const base = resolveBaseUrl(req);
    const config = getIpaymuConfig();
    if (!config.va || !config.apiKey) {
      console.error('[checkout] iPaymu credentials missing');
      return res
        .status(503)
        .json({ error: 'Pembayaran sedang tidak tersedia. Coba lagi nanti.' });
    }

    // iPaymu redirect payment: buyer picks the channel on iPaymu's hosted page.
    // Service fee is itemized separately so the iPaymu page matches the product
    // price shown on the website (reviewer transparency). Total is unchanged.
    const body = {
      product: [product.title, 'Biaya Layanan'],
      qty: ['1', '1'],
      price: [String(product.price), String(SERVICE_FEE)],
      amount: String(amount),
      returnUrl: `${base}/payment/pending?orderRef=${orderRef}`,
      cancelUrl: `${base}/payment/pending?orderRef=${orderRef}`,
      notifyUrl: `${base}/api/ipaymu-notify`,
      referenceId: orderRef,
      buyerName,
      buyerPhone: buyerWhatsapp,
      buyerEmail: normalizedEmail,
    };

    const { ok, data } = await ipaymuPost('/payment', body, config);
    const paymentUrl = data?.Data?.Url;

    if (!ok || !paymentUrl) {
      console.error('[checkout] iPaymu error:', {
        status: data?.Status,
        message: data?.Message,
        body: data,
      });
      throw new Error(
        (Array.isArray(data?.Message) ? data.Message[0] : data?.Message) ||
          'Gagal membuat pembayaran iPaymu'
      );
    }

    // Store the iPaymu session id for traceability.
    if (data?.Data?.SessionID) {
      await supabase
        .from('orders')
        .update({ doku_invoice_id: data.Data.SessionID })
        .eq('order_ref', orderRef);
    }

    return res.status(200).json({ paymentUrl, orderRef });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal Server Error';
    console.error('Checkout error:', error);
    return res.status(500).json({ error: message });
  }
}
