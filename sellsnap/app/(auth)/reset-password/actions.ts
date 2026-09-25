'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { validatePassword } from '@/lib/utils';
import { hashPassword } from '@/lib/password';
import { consumePasswordResetToken } from '@/lib/passwordReset';
import type { ActionResult } from '@/types';

const resetSchema = z.object({
  password: z.string().superRefine((value, ctx) => {
    const message = validatePassword(value);
    if (message) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }
  }),
});

export async function resetPassword(
  token: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({ password: formData.get('password') });
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0].message },
    };
  }

  const record = await consumePasswordResetToken(token);
  if (!record) {
    return {
      ok: false,
      error: {
        code: 'invalid_token',
        message: 'This reset link is invalid or has expired.',
      },
    };
  }

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    await db.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    logger.info('auth.reset-password.success', { userId: record.userId });
  } catch (error) {
    logger.error('auth.reset-password.failed', { error });
    return {
      ok: false,
      error: { code: 'server_error', message: 'Something went wrong. Please try again.' },
    };
  }

  redirect('/auth?reset=success');
}
