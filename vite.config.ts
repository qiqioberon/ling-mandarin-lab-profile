import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import crypto from "crypto";

// Plugin lokal untuk simulasi Vercel API di Vite dev server
function mockApiPlugin(env: Record<string, string>) {
  return {
    name: 'mock-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url === '/api/checkout' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const parsedBody = JSON.parse(body || '{}');
              const orderRef = 'LCL-MOCK-' + Date.now();
              const amount = 60000; // Harga simulasi

              const clientId = env.DOKU_CLIENT_ID || env.DOKU_API_KEY || '';
              const secretKey = env.DOKU_SECRET_KEY || '';
              
              if (!clientId || !secretKey) {
                console.error("Doku API keys missing in .env");
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ paymentUrl: 'MOCK-URL-123', orderRef }));
                return;
              }

              const targetPath = '/checkout/v1/payment';
              const requestId = crypto.randomUUID();
              const requestTimestamp = new Date().toISOString().substring(0, 19) + "Z";
              
              const dokuPayload = {
                order: { amount, invoice_number: orderRef, currency: "IDR", callback_url: "http://localhost:8080/payment/pending?orderRef=" + orderRef },
                payment: { payment_due_date: 60 },
                customer: { 
                  id: parsedBody.buyerEmail || "test@example.com", 
                  name: parsedBody.buyerName || "Test User", 
                  email: parsedBody.buyerEmail || "test@example.com", 
                  phone: parsedBody.buyerWhatsapp || "08123456789" 
                }
              };

              const bodyString = JSON.stringify(dokuPayload);
              const digest = crypto.createHash('sha256').update(bodyString).digest('base64');
              const signatureString = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${requestTimestamp}\nRequest-Target:${targetPath}\nDigest:${digest}`;
              const signature = `HMACSHA256=${crypto.createHmac('sha256', secretKey).update(signatureString).digest('base64')}`;

              const baseUrl = env.DOKU_IS_PRODUCTION === 'true' 
                ? 'https://api.doku.com' 
                : 'https://api-sandbox.doku.com';

              const dokuRes = await fetch(baseUrl + targetPath, {
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

              const dokuData = await dokuRes.json();
              
              res.setHeader('Content-Type', 'application/json');
              if (dokuRes.ok && dokuData.response?.payment?.url) {
                res.end(JSON.stringify({ paymentUrl: dokuData.response.payment.url, orderRef }));
              } else {
                console.error('Doku API error in local simulation:', dokuData);
                res.end(JSON.stringify({ paymentUrl: 'MOCK-URL-123', orderRef }));
              }
            } catch (e) {
              console.error(e);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ paymentUrl: 'MOCK-URL-123', orderRef: 'LCL-ERR' }));
            }
          });
          return;
        }
        
        if (req.url?.startsWith('/api/order-status')) {
          res.setHeader('Content-Type', 'application/json');
          // Simulasi: otomatis status 'paid' di lokal
          res.end(JSON.stringify({ status: 'paid' }));
          return;
        }
        
        if (req.url === '/api/get-reader-url' && req.method === 'POST') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ signedUrl: '/Lingchinenese.pdf' }));
          return;
        }
        
        next();
      });
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mockApiPlugin(env)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
