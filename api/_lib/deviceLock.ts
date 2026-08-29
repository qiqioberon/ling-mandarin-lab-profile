/**
 * Decide whether a device may open a magic-link e-book.
 *  - 'allow': already one of the bound devices → serve.
 *  - 'claim': not bound yet but there's a free slot → bind then serve.
 *  - 'deny':  device limit reached → block (buyer must ask admin to reset).
 * This is the anti-sharing guarantee for the no-email access links.
 */
export type DeviceDecision = 'allow' | 'claim' | 'deny';

export function decideDeviceAccess(
  devices: string[],
  deviceId: string,
  max = 2
): DeviceDecision {
  if (devices.includes(deviceId)) return 'allow';
  if (devices.length >= max) return 'deny';
  return 'claim';
}
