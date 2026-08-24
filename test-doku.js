import crypto from "crypto";

async function testDoku() {
  const clientId = process.env.DOKU_CLIENT_ID || process.env.DOKU_API_KEY || '';
  const secretKey = process.env.DOKU_SECRET_KEY || '';
  const isProduction = process.env.DOKU_IS_PRODUCTION === 'true';
  const baseUrl = isProduction
    ? 'https://api.doku.com'
    : 'https://api-sandbox.doku.com';

  const targetPath = '/checkout/v1/payment';
  const requestId = crypto.randomUUID();
  const requestTimestamp = new Date().toISOString().substring(0, 19) + "Z";
  
  const dokuPayload = {
    order: { amount: 60000, invoice_number: 'TEST-123', currency: "IDR", callback_url: "http://localhost:8080" },
    payment: { payment_due_date: 60 },
    customer: { 
      id: "test@example.com", 
      name: "Test User", 
      email: "test@example.com", 
      phone: "08123456789" 
    }
  };

  const bodyString = JSON.stringify(dokuPayload);
  const digest = crypto.createHash('sha256').update(bodyString).digest('base64');
  const signatureString = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${requestTimestamp}\nRequest-Target:${targetPath}\nDigest:${digest}`;
  const signature = `HMACSHA256=${crypto.createHmac('sha256', secretKey).update(signatureString).digest('base64')}`;

  console.log("Request Headers:", {
    'Client-Id': clientId,
    'Request-Id': requestId,
    'Request-Timestamp': requestTimestamp,
    'Signature': signature
  });

  const res = await fetch(baseUrl + targetPath, {
    method: 'POST',
    headers: {
      'Client-Id': clientId,
      'Request-Id': requestId,
      'Request-Timestamp': requestTimestamp,
      'Signature': signature,
      'Content-Type': 'application/json'
    },
    body: bodyString
  });

  const data = await res.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}

testDoku();
