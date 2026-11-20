import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

/** Hashes a password as `scrypt$<salt hex>$<hash hex>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}

// Used when a login email doesn't exist, so the response takes as long as a
// real password check and doesn't reveal which emails are registered.
const DUMMY_HASH_PROMISE = hashPassword(randomBytes(16).toString('hex'));
export async function verifyAgainstDummy(password: string): Promise<false> {
  await verifyPassword(password, await DUMMY_HASH_PROMISE);
  return false;
}
