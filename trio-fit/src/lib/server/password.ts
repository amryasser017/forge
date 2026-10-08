import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const sha = (s: string) => createHash('sha256').update(s).digest();

/** Constant-time comparison of two strings (hash first so lengths always match). */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha(a), sha(b));
}

export function hashPassword(password: string, salt = cryptoSalt()): string {
  const h = scryptSync(password, salt, 32).toString('hex');
  return `scrypt:${salt}:${h}`;
}
function cryptoSalt() {
  return randomBytes(8).toString('hex');
}

/** Verify against either a scrypt hash (`scrypt:salt:hash`, preferred) or a plain secret from the environment. */
export function verifyGatePassword(input: string, cfg: { hash: string; plain: string }): boolean {
  if (cfg.hash) {
    const [scheme, salt, hex] = cfg.hash.split(':');
    if (scheme !== 'scrypt' || !salt || !hex) return false;
    const actual = scryptSync(input, salt, 32);
    const expected = Buffer.from(hex, 'hex');
    return expected.length === actual.length && timingSafeEqual(actual, expected);
  }
  return cfg.plain.length > 0 && safeEqual(input, cfg.plain);
}
