import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const DOKU_CLIENT_ID = process.env.DOKU_CLIENT_ID || process.env.DOKU_API_KEY || '';
const DOKU_SECRET_KEY = process.env.DOKU_SECRET_KEY || '';
const DOKU_IS_PRODUCTION = process.env.DOKU_IS_PRODUCTION === 'true';

const DOKU_BASE_URL = DOKU_IS_PRODUCTION 
  ? 'https://api.doku.com'
  : 'https://api-sandbox.doku.com';

function generateDokuSignature(
  clientId: string,
  requestId: string,
  requestTimestamp: string,
  targetPath: string,
  secretKey: string,
  body: object
) {
  const bodyString = JSON.stringify(body);
  const digest = crypto.createHash('sha256').update(bodyString).digest('base64');
  
  const signatureString = 
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${requestTimestamp}\n` +
    `Request-Target:${targetPath}\n` +
    `Digest:${digest}`;
    
  const signature = crypto.createHmac('sha256', secretKey).update(signatureString).digest('base64');
  return `HMACSHA256=${signature}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { productId, buyerEmail, buyerName, buyerWhatsapp } = req.body;

    if (!productId || !buyerEmail || !buyerName || !buyerWhatsapp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const orderRef = `LCL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_ref: orderRef,
        product_id: productId,
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        buyer_whatsapp: buyerWhatsapp,
        amount: product.price,
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Doku API configuration
    const targetPath = '/checkout/v1/payment';
    const requestId = crypto.randomUUID();
    const requestTimestamp = new Date().toISOString().substring(0, 19) + "Z"; // YYYY-MM-DDTHH:MM:SSZ

    const dokuPayload = {
      order: {
        amount: product.price,
        invoice_number: orderRef,
        currency: "IDR",
        callback_url: `https://www.lingchineselab.com/payment/pending?orderRef=${orderRef}` // TODO: fix callback url to redirect properly
      },
      payment: {
        payment_due_date: 60 // 60 minutes
      },
      customer: {
        id: buyerEmail,
        name: buyerName,
        email: buyerEmail,
        phone: buyerWhatsapp
      }
    };

    const signature = generateDokuSignature(
      DOKU_CLIENT_ID,
      requestId,
      requestTimestamp,
      targetPath,
      DOKU_SECRET_KEY,
      dokuPayload
    );

    const dokuResponse = await fetch(`${DOKU_BASE_URL}${targetPath}`, {
      method: 'POST',
      headers: {
        'Client-Id': DOKU_CLIENT_ID,
        'Request-Id': requestId,
        'Request-Timestamp': requestTimestamp,
        'Signature': signature,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dokuPayload)
    });

    const dokuData = await dokuResponse.json();

    if (!dokuResponse.ok) {
      console.error('Doku API error:', dokuData);
      throw new Error(dokuData.message?.[0] || dokuData.error?.message || 'Failed to create Doku payment');
    }

    // Save Doku URL or ID to orders if necessary (we can just return it)
    return res.status(200).json({
      paymentUrl: dokuData.response.payment.url,
      orderRef
    });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
}
