import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const FORMAT = /^scrypt-v1:([a-f0-9]{64}):([a-f0-9]{128})$/;

export function isAdminPinHash(value: string | undefined): value is string {
  return typeof value === 'string' && FORMAT.test(value);
}
export async function hashAdminPin(pin: string): Promise<string> {
  if (!/^\d{6,12}$/.test(pin)) throw new Error('PIN must contain 6–12 digits');
  const salt = randomBytes(32).toString('hex');
  const key = await derive(pin, salt, 64) as Buffer;
  return `scrypt-v1:${salt}:${key.toString('hex')}`;
}
export async function verifyAdminPin(pin: string, encoded: string): Promise<boolean> {
  const match = FORMAT.exec(encoded);
  if (!match || !/^\d{6,12}$/.test(pin)) return false;
  const key = await derive(pin, match[1], 64) as Buffer;
  return timingSafeEqual(key, Buffer.from(match[2], 'hex'));
}
