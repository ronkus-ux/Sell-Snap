'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { validatePassword } from '@/lib/utils';
import { hashPassword, verifyPassword } from '@/lib/password';
import type { ActionResult } from '@/types';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().superRefine((value, ctx) => {
    const message = validatePassword(value);
    if (message) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }
  }),
});

export async function updateProfile(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: { code: 'unauthorized', message: 'Please sign in.' } };
  }

  const userId = session.user.id;

  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    businessName: formData.get('businessName'),
  });

  if (!parsed.success) {
    return { ok: false, error: { code: 'invalid_input', message: parsed.error.issues[0].message } };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: parsed.data,
    });

    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return { ok: true };
  } catch (error) {
    logger.error('settings.update-profile.failed', { error, userId });
    return { ok: false, error: { code: 'server_error', message: 'Failed to update profile.' } };
  }
}

export async function changePassword(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: { code: 'unauthorized', message: 'Please sign in.' } };
  }

  const userId = session.user.id;

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
  });

  if (!parsed.success) {
    return { ok: false, error: { code: 'invalid_input', message: parsed.error.issues[0].message } };
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { ok: false, error: { code: 'not_found', message: 'User not found.' } };
    }

    const passwordMatch = await verifyPassword(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      return { ok: false, error: { code: 'wrong_password', message: 'Current password is incorrect.' } };
    }

    const newHash = await hashPassword(newPassword);
    await db.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { ok: true };
  } catch (error) {
    logger.error('settings.change-password.failed', { error, userId });
    return { ok: false, error: { code: 'server_error', message: 'Failed to change password.' } };
  }
}
