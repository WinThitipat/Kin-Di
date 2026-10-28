import { describe, expect, it } from 'vitest';
import { hashAdminPin, isAdminPinHash, verifyAdminPin } from './admin-pin.server';

describe('salted admin PIN storage', () => {
  it('keeps leading zeros, rejects wrong PINs and uses a different salt each time', async () => {
    const first = await hashAdminPin('012345');
    const second = await hashAdminPin('012345');
    expect(first).not.toBe(second);
    expect(isAdminPinHash(first)).toBe(true);
    expect(await verifyAdminPin('012345', first)).toBe(true);
    expect(await verifyAdminPin('12345', first)).toBe(false);
    expect(await verifyAdminPin('999999', first)).toBe(false);
    expect(await verifyAdminPin('012345', 'broken-hash')).toBe(false);
    expect(isAdminPinHash('012345')).toBe(false);
  });
});
