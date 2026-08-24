import crypto from 'crypto';

/**
 * iPaymu Payment API v2 helper.
 *
 * Signature scheme (from the official sample):
 *   bodyHash     = lowercase hex SHA-256 of the exact JSON body string
 *   stringToSign = "POST:" + va + ":" + bodyHash + ":" + apiKey
 *   signature    = lowercase hex HMAC-SHA256(stringToSign, apiKey)
 * Headers: va, signature, timestamp (yyyyMMddHHmmss).
 */

export interface IpaymuConfig {
  va: string;
  apiKey: string;
  baseUrl: string;
  isProduction: boolean;
}

export function getIpaymuConfig(): IpaymuConfig {
  const va = process.env.IPAYMU_VA || '';
  const apiKey = process.env.IPAYMU_API_KEY || '';
  const isProduction = process.env.IPAYMU_IS_PRODUCTION === 'true';
  const baseUrl = isProduction
    ? 'https://my.ipaymu.com/api/v2'
    : 'https://sandbox.ipaymu.com/api/v2';
  return { va, apiKey, baseUrl, isProduction };
}

/** yyyyMMddHHmmss in local time — iPaymu expects a compact timestamp. */
function ipaymuTimestamp(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
    `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
  );
}

/**
 * Serialize the body ONCE and sign it. The returned `serializedBody` MUST be the
 * exact string sent over the wire — signing a different serialization than what
 * is transmitted is the classic cause of signature-mismatch errors.
 */
export function signIpaymuBody(
  body: unknown,
  config: IpaymuConfig
): { serializedBody: string; signature: string; timestamp: string } {
  const serializedBody = JSON.stringify(body);
  const bodyHash = crypto
    .createHash('sha256')
    .update(serializedBody, 'utf8')
    .digest('hex')
    .toLowerCase();
  const stringToSign = `POST:${config.va}:${bodyHash}:${config.apiKey}`;
  const signature = crypto
    .createHmac('sha256', config.apiKey)
    .update(stringToSign, 'utf8')
    .digest('hex');
  return { serializedBody, signature, timestamp: ipaymuTimestamp() };
}

/** POST a signed request to an iPaymu v2 endpoint (relative path, e.g. "/payment"). */
export async function ipaymuPost(
  path: string,
  body: unknown,
  config: IpaymuConfig = getIpaymuConfig()
): Promise<{ ok: boolean; status: number; data: any }> {
  const { serializedBody, signature, timestamp } = signIpaymuBody(body, config);
  const res = await fetch(`${config.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      va: config.va,
      signature,
      timestamp,
    },
    body: serializedBody,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}
