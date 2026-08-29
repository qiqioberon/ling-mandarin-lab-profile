import { describe, it, expect } from 'vitest';
import { decideDeviceAccess } from './deviceLock';

describe('decideDeviceAccess (2-device limit)', () => {
  it('allows a device that is already bound', () => {
    expect(decideDeviceAccess(['phone'], 'phone')).toBe('allow');
  });

  it('claims a free slot for a new device', () => {
    expect(decideDeviceAccess([], 'phone')).toBe('claim');
    expect(decideDeviceAccess(['phone'], 'laptop')).toBe('claim');
  });

  it('denies a third, unknown device', () => {
    expect(decideDeviceAccess(['phone', 'laptop'], 'tablet')).toBe('deny');
  });

  it('still allows a bound device even when at the limit', () => {
    expect(decideDeviceAccess(['phone', 'laptop'], 'laptop')).toBe('allow');
  });
});
