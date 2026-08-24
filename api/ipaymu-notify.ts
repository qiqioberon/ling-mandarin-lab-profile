import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getIpaymuConfig, ipaymuPost } from './_lib/ipaymu';
import { settlePayment } from './_lib/grantEntitlement';
import { notifyTelegram } from './_lib/telegram';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/** Normalize a callback body that may arrive as JSON or urlencoded string. */
function normalizeBody(body: unknown): Record<string, string> {
  if (body && typeof body === 'object') {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
      out[k] = Array.isArray(v) ? String(v[0]) : String(v);
    }
    return out;
  }
  if (typeof body === 'string') {
    try {
      return normalizeBody(JSON.parse(body));
    } catch {
      const params = new URLSearchParams(body);
      return Object.fromEntries(params.entries());
    }
  }
  return {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // iPaymu retries on non-2xx, so we always ack 200 after logging.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const fields = normalizeBody(req.body);
    const orderRef = fields.reference_id || fields.referenceId;
    const trxId = fields.trx_id || fields.trxId || fields.sid;

    if (!orderRef) {
      console.warn('[ipaymu-notify] no reference_id in callback:', fields);
      return res.status(200).json({ received: true });
    }

    // Never trust the callback body alone — re-query the authoritative status.
    let paid = false;
    if (trxId) {
      const { data } = await ipaymuPost('/transaction', { transactionId: trxId });
      const d = data?.Data ?? {};
      const statusDesc = String(d.StatusDesc ?? d.Status ?? '').toLowerCase();
      paid = d.Status === 1 || statusDesc === 'berhasil' || statusDesc === 'success';
    } else {
      // No trx id to verify with — fall back to the callback's own status.
      const s = String(fields.status ?? '').toLowerCase();
      paid = s === 'berhasil' || s === 'success';
    }

    if (!paid) {
      console.warn('[ipaymu-notify] not paid yet:', { orderRef, trxId, status: fields.status });
      return res.status(200).json({ received: true, paid: false });
    }

    const result = await settlePayment({
      orderRef,
      source: 'ipaymu',
      rawRef: trxId,
    });

    if (!result.ok && !result.alreadyPaid) {
      console.error('[ipaymu-notify] settle failed:', result.reason, orderRef);
      // Still 200 so iPaymu doesn't hammer us; the row can be settled manually.
      return res.status(200).json({ received: true, error: result.reason });
    }

    if (!result.alreadyPaid) {
      await notifyTelegram(
        `✅ <b>Pembayaran iPaymu berhasil</b>\n` +
          `Ref: <code>${orderRef}</code>\n` +
          `Trx: ${trxId ?? '-'}`
      );
    }

    return res.status(200).json({ received: true, paid: true });
  } catch (error) {
    console.error('[ipaymu-notify] error:', error);
    // Ack anyway to avoid retry storms; investigate via logs.
    return res.status(200).json({ received: true });
  }
}
