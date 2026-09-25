'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { createPasswordResetToken } from '@/lib/passwordReset';
import { sendPasswordResetEmail } from '@/lib/notifications';
import type { ActionResult } from '@/types';

const requestSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

/**
 * Handles the /forgot-password form. Always returns ok regardless of whether
 * the account exists to avoid user enumeration. Email sending is best-effort.
 */
export async function requestPasswordReset(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = requestSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0].message },
    };
  }

  const email = parsed.data.email.toLowerCase();

  try {
    const user = await db.user.findUnique({ where: { email } });

    if (user) {
      const token = await createPasswordResetToken(user.id);
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
      await sendPasswordResetEmail(email, resetUrl);
    }

    logger.info('auth.forgot-password.requested', { email });
  } catch (error) {
    logger.error('auth.forgot-password.failed', { error });
  }

  return { ok: true };
}
