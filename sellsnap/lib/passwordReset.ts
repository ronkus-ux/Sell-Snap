import { createHash, randomBytes } from 'crypto';
import { db } from '@/lib/db';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generates a raw reset token and its SHA-256 hash.
 * Only the hash is stored in the DB; the raw token is sent via email.
 */
export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Invalidates any pending reset tokens for a user and issues a fresh one.
 * Returns the raw token to embed in the email link.
 */
export async function createPasswordResetToken(userId: string): Promise<string> {
  await db.passwordResetToken.deleteMany({
    where: { userId, usedAt: null },
  });

  const { token, tokenHash } = generateResetToken();

  await db.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  return token;
}

/**
 * Validates a raw reset token. Returns the token record and marks it used
 * on success, or null when the token is missing, already used, or expired.
 */
export async function consumePasswordResetToken(token: string) {
  const tokenHash = hashResetToken(token);
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  await db.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record;
}
