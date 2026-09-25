'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { validatePassword } from '@/lib/utils';
import { sendWelcomeEmail } from '@/lib/notifications';
import { hashPassword } from '@/lib/password';
import type { ActionResult } from '@/types';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().superRefine((value, ctx) => {
    const message = validatePassword(value);
    if (message) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }
  }),
});

export async function registerUser(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<{ userId: string }>> {
  const raw = {
    name: formData.get('name'),
    businessName: formData.get('businessName'),
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      ok: false,
      error: { code: 'invalid_input', message: firstError.message },
    };
  }

  const { name, businessName, email, password } = parsed.data;

  try {
    const existing = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return {
        ok: false,
        error: { code: 'email_taken', message: 'An account with this email already exists.' },
      };
    }

    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        name,
        businessName,
        email: email.toLowerCase(),
        passwordHash,
      },
    });

    logger.info('auth.signup.success', { userId: user.id });

    // Best-effort welcome email — never blocks or fails the signup flow.
    void sendWelcomeEmail({ email: user.email, name: user.name, businessName: user.businessName });
  } catch (error) {
    logger.error('auth.signup.failed', { error });
    return {
      ok: false,
      error: { code: 'server_error', message: 'Something went wrong. Please try again.' },
    };
  }

  return { ok: true };
}
