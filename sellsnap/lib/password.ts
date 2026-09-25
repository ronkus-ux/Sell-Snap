import bcrypt from 'bcryptjs';

// Single source of truth for password hashing. All hash/verify calls must go
// through these wrappers so the cost factor can never drift between flows.

const DEFAULT_SALT_ROUNDS = 12;
const MIN_SALT_ROUNDS = 10;
const MAX_SALT_ROUNDS = 15;

/**
 * Number of bcrypt salt rounds. Defaults to 12 (a strong, OWASP-compliant
 * cost — each guess costs ~100–400ms of CPU). Override per environment with
 * BCRYPT_SALT_ROUNDS. Going above ~13 adds real latency and login-DoS surface
 * on serverless without meaningfully improving security.
 */
function getSaltRounds(): number {
  const raw = process.env.BCRYPT_SALT_ROUNDS;
  if (!raw) return DEFAULT_SALT_ROUNDS;

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < MIN_SALT_ROUNDS || parsed > MAX_SALT_ROUNDS) {
    throw new Error(
      `BCRYPT_SALT_ROUNDS must be an integer between ${MIN_SALT_ROUNDS} and ${MAX_SALT_ROUNDS} (got "${raw}").`
    );
  }
  return parsed;
}

/**
 * Hashes a password with a fresh random salt. The salt is embedded in the
 * output hash, so no separate salt column is needed.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, getSaltRounds());
}

/**
 * Compares a submitted password against a stored bcrypt hash. The cost factor
 * is read from the hash itself, so cost upgrades never break existing hashes.
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

/** bcrypt processes at most 72 bytes; longer input is silently truncated. */
export const PASSWORD_MAX_BYTES = 72;

/** Byte-accurate length (handles multibyte characters), unlike string length. */
export function passwordByteLength(password: string): number {
  return new TextEncoder().encode(password).length;
}