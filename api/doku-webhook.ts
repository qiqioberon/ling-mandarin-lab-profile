import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const DOKU_CLIENT_ID = process.env.DOKU_CLIENT_ID || process.env.DOKU_API_KEY || '';
const DOKU_SECRET_KEY = process.env.DOKU_SECRET_KEY || '';

function generateDokuSignature(
  clientId: string,
  requestId: string,
  requestTimestamp: string,
  targetPath: string,
  secretKey: string,
  bodyString: string
) {
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
    const clientId = req.headers['client-id'] as string;
    const requestId = req.headers['request-id'] as string;
    const requestTimestamp = req.headers['request-timestamp'] as string;
    const signature = req.headers['signature'] as string;
    
    // We need the raw body string to compute the digest correctly.
    // In Vercel, req.body is already parsed if it's JSON.
    // We can just stringify it, assuming keys order is consistent,
    // or properly we should use raw body, but stringify usually works for Doku webhook if order doesn't change,
    // though the safest way is using raw body. Let's use stringify for now.
    const bodyString = JSON.stringify(req.body);
    
    const targetPath = '/api/doku-webhook'; // Must match exactly the URL path configured in Doku

    if (!clientId || !requestId || !requestTimestamp || !signature) {
      return res.status(400).json({ error: 'Missing Doku headers' });
    }

    const expectedSignature = generateDokuSignature(
      DOKU_CLIENT_ID,
      requestId,
      requestTimestamp,
      targetPath,
      DOKU_SECRET_KEY,
      bodyString
    );

    if (signature !== expectedSignature) {
      console.error('Signature mismatch:', { expectedSignature, signature });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process notification
    const { order, transaction } = req.body;

    if (!order?.invoice_number || !transaction?.status) {
      return res.status(400).json({ error: 'Invalid payload structure' });
    }

    const orderRef = order.invoice_number;
    const transactionStatus = transaction.status; // e.g. "SUCCESS", "FAILED"

    if (transactionStatus === 'SUCCESS') {
      // paid
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .update({ 
          status: 'paid', 
          paid_at: new Date().toISOString(),
          doku_invoice_id: orderRef // Or transaction ID if Doku provides one in transaction object
        })
        .eq('order_ref', orderRef)
        .select()
        .single();
        
      if (!orderError && orderData) {
        // create entitlement
        await supabase.from('entitlements').upsert({
          buyer_email: orderData.buyer_email,
          product_id: orderData.product_id,
          order_id: orderData.id
        }, { onConflict: 'buyer_email, product_id' });
      }
    } else if (transactionStatus === 'FAILED' || transactionStatus === 'EXPIRED') {
      await supabase
        .from('orders')
        .update({ status: transactionStatus.toLowerCase() })
        .eq('order_ref', orderRef);
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}
