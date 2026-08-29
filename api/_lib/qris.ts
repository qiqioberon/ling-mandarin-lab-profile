/**
 * Dynamic-QRIS generator from a static merchant payload.
 *
 * Turns a static QR (tag 01 = "11") into a dynamic one (tag 01 = "12") by
 * inserting tag 54 (amount) and recomputing CRC16-CCITT-FALSE.
 *
 * WARNING: the modified payload is valid per EMVCo, but acceptance depends on
 * the acquirer. MUST be tested with a small real transaction before production.
 * If rejected, set QRIS_DYNAMIC_ENABLED=false and the system falls back to the
 * static QR + manual exact-nominal instruction (the unique code still works).
 */

/** CRC16-CCITT-FALSE: poly 0x1021, init 0xFFFF, no reflection, no xorout. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (const ch of payload) {
    crc ^= ch.charCodeAt(0) << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Flat TLV parse. Nested tags are left as raw strings — we never rebuild. */
function parseTLV(payload: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  let i = 0;
  while (i + 4 <= payload.length) {
    const tag = payload.slice(i, i + 2);
    const len = parseInt(payload.slice(i + 2, i + 4), 10);
    if (!Number.isFinite(len) || i + 4 + len > payload.length) break;
    out.push([tag, payload.slice(i + 4, i + 4 + len)]);
    i += 4 + len;
  }
  return out;
}

/**
 * Structural check. A CRC-only check is NOT enough: a corrupt input yields a
 * TRUNCATED payload whose CRC is still valid, because the CRC is recomputed
 * over the already-damaged data. Verified empirically — a payload with one
 * wrong TLV length byte produced 171 chars with merchant name and city
 * missing, and CRC verification passed. Only the required-tag check catches it.
 */
export function validateQris(payload: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!payload.startsWith('000201')) errors.push('missing payload format indicator');
  if (crc16(payload.slice(0, -4)) !== payload.slice(-4)) errors.push('crc mismatch');

  const tags = new Map(parseTLV(payload));

  // Tag 60 (merchant city) is required by EMVCo; a truncated payload loses it
  // first, which is exactly the failure mode this guard exists for.
  for (const [tag, name] of [
    ['52', 'merchant category code'],
    ['53', 'currency'],
    ['58', 'country code'],
    ['59', 'merchant name'],
    ['60', 'merchant city'],
    ['63', 'crc'],
  ] as const) {
    if (!tags.has(tag)) errors.push(`missing required tag ${tag} (${name})`);
  }

  const method = tags.get('01');
  if (method && method !== '11' && method !== '12') {
    errors.push(`invalid point of initiation method "${method}"`);
  }

  if (tags.has('55')) {
    // Tag 55 = Tip or Convenience Indicator. "01" makes the payer's app PROMPT
    // FOR A TIP — it does not mean "no tip". No tip means omitting tag 55.
    errors.push(`unexpected tip indicator (tag 55 = "${tags.get('55')}")`);
  }

  return { valid: errors.length === 0, errors };
}

export function buildDynamicQris(staticPayload: string, amount: number): string {
  // Rupiah has no decimals, and a zero amount is never a real order.
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('qris_invalid_amount');
  }

  // Trim: decoders and env vars routinely carry a trailing newline.
  const source = staticPayload.trim();
  if (!source) throw new Error('qris_payload_not_configured');

  // Fail early if the merchant payload itself is malformed, so the error names
  // the real cause instead of surfacing later as a mysterious rejected QR.
  const sourceCheck = validateQris(source);
  if (!sourceCheck.valid) {
    throw new Error('qris_source_invalid: ' + sourceCheck.errors.join('; '));
  }

  // 1. Drop trailing '6304' + 4-digit CRC.
  const body = source.slice(0, -8);

  // 2. Static → dynamic. Replace only the first occurrence.
  const dynamic = body.replace('010211', '010212');
  if (dynamic === body) throw new Error('qris_not_static');

  // 3. Insert tag 54 before tag 58 (country). QRIS tag order must ascend.
  //    NOTE: no tag 55. Omitting it is what "no tip" means.
  const amountStr = String(amount);
  const tag54 = '54' + String(amountStr.length).padStart(2, '0') + amountStr;

  const idx = dynamic.indexOf('5802ID');
  if (idx === -1) throw new Error('qris_missing_country_tag');

  const withAmount = dynamic.slice(0, idx) + tag54 + dynamic.slice(idx);

  // 4. CRC is computed over the WHOLE payload INCLUDING '6304'.
  const result = withAmount + '6304' + crc16(withAmount + '6304');

  // 5. Structural gate on the output. See validateQris() for why CRC is not enough.
  const outCheck = validateQris(result);
  if (!outCheck.valid) {
    throw new Error('qris_output_invalid: ' + outCheck.errors.join('; '));
  }

  return result;
}

/** CRC-only check. Kept for tests; NOT sufficient on its own — use validateQris. */
export function verifyQris(payload: string): boolean {
  return crc16(payload.slice(0, -4)) === payload.slice(-4);
}
