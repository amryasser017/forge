// Usage: node scripts/hash-password.mjs "your password"   → prints a value for GATE_PASSWORD_HASH
import { randomBytes, scryptSync } from 'node:crypto';
const pw = process.argv[2];
if (!pw) { console.error('Usage: node scripts/hash-password.mjs "password"'); process.exit(1); }
const salt = randomBytes(8).toString('hex');
console.log(`scrypt:${salt}:${scryptSync(pw, salt, 32).toString('hex')}`);
