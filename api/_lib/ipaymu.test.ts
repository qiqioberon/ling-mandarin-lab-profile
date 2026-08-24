import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { signIpaymuBody, type IpaymuConfig } from './ipaymu';

const config: IpaymuConfig = {
  va: '1179000899',
  apiKey: 'QbGcoO0Qds9sQFDmY0MWg1Tq.xtuh1',
  baseUrl: 'https://sandbox.ipaymu.com/api/v2',
  isProduction: false,
};

// Independent reference implementation of the documented iPaymu scheme.
function reference(body: unknown, va: string, apiKey: string) {
  const serialized = JSON.stringify(body);
  const bodyHash = crypto.createHash('sha256').update(serialized).digest('hex').toLowerCase();
  const stringToSign = `POST:${va}:${bodyHash}:${apiKey}`;
  return crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex');
}

describe('signIpaymuBody', () => {
  const body = {
    product: ['Jacket'],
    qty: ['1'],
    price: ['150000'],
    amount: '10000',
    referenceId: '1234',
  };

  it('signs the exact serialized body it returns', () => {
    const { serializedBody, signature } = signIpaymuBody(body, config);
    expect(serializedBody).toBe(JSON.stringify(body));
    expect(signature).toBe(reference(body, config.va, config.apiKey));
  });

  it('produces a 64-char lowercase hex signature', () => {
    const { signature } = signIpaymuBody(body, config);
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic and sensitive to body changes', () => {
    const a = signIpaymuBody(body, config).signature;
    expect(signIpaymuBody(body, config).signature).toBe(a);
    expect(signIpaymuBody({ ...body, amount: '20000' }, config).signature).not.toBe(a);
  });

  it('produces a compact yyyyMMddHHmmss timestamp', () => {
    expect(signIpaymuBody(body, config).timestamp).toMatch(/^\d{14}$/);
  });
});
