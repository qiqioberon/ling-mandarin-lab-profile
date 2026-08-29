import { describe, it, expect } from 'vitest';
import { crc16, buildDynamicQris, verifyQris, validateQris } from './qris';

// A synthetic but fully valid STATIC payload (tag 01 = "11", all EMVCo-required
// tags present, correct lengths, valid trailing CRC) so we exercise the real
// machinery without committing the merchant's live payload.
const body =
  '000201' + // payload format indicator
  '010211' + // point of initiation: STATIC
  '52049999' + // merchant category code
  '5303360' + // currency = IDR
  '5802ID' + // country
  '5908Test Lab' + // merchant name (8 chars incl. space)
  '6008Surabaya' + // merchant city (8 chars)
  '6304';
const STATIC = body + crc16(body);

describe('crc16', () => {
  it('matches the CCITT-FALSE reference vector', () => {
    expect(crc16('123456789')).toBe('29B1');
  });
});

describe('validateQris', () => {
  it('accepts a well-formed static payload', () => {
    expect(validateQris(STATIC)).toEqual({ valid: true, errors: [] });
  });

  it('flags a tip indicator (tag 55) — "01" prompts for a tip, it is not "no tip"', () => {
    // Insert a bogus tag 55 before the CRC and recompute so only the tag-55
    // rule (not the CRC) is what fails.
    const withTip = STATIC.slice(0, -8) + '550201' + '6304';
    const bad = withTip + crc16(withTip);
    expect(validateQris(bad).errors.some((e) => e.includes('tip indicator'))).toBe(true);
  });
});

describe('buildDynamicQris', () => {
  it('produces a valid dynamic payload with the amount tag (5 digits) and no tip tag', () => {
    const dyn = buildDynamicQris(STATIC, 62517);
    expect(validateQris(dyn).valid).toBe(true); // would fail if tag 55 sneaked back in
    expect(verifyQris(dyn)).toBe(true);
    expect(dyn).toContain('010212'); // now dynamic
    expect(dyn).toContain('540562517'); // tag54 len=05, value 62517
    expect(dyn).not.toContain('550201'); // regression guard for the tag-55 bug
  });

  it('handles a 6-digit amount (variable tag-54 length is the usual bug)', () => {
    const dyn = buildDynamicQris(STATIC, 162517);
    expect(validateQris(dyn).valid).toBe(true);
    expect(dyn).toContain('5406162517'); // tag54 len=06, value 162517
  });

  it('rejects an already-dynamic payload', () => {
    // Valid (recomputed CRC) but method = "12", so the not-static guard — not
    // the source validator — is what must fire.
    const dynBody = body.replace('010211', '010212');
    const alreadyDynamic = dynBody + crc16(dynBody);
    expect(() => buildDynamicQris(alreadyDynamic, 1000)).toThrow('qris_not_static');
  });

  it('rejects a non-positive or non-integer amount', () => {
    expect(() => buildDynamicQris(STATIC, 0)).toThrow('qris_invalid_amount');
    expect(() => buildDynamicQris(STATIC, -5)).toThrow('qris_invalid_amount');
    expect(() => buildDynamicQris(STATIC, 12.5)).toThrow('qris_invalid_amount');
  });
});
