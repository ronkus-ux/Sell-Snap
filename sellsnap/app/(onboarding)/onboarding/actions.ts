'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { generateSlug } from '@/lib/slug';
import { uploadProductImage } from '@/lib/storage';
import { redirect } from 'next/navigation';
import type { ActionResult } from '@/types';

const businessDetailsSchema = z.object({
  category: z.string().optional(),
  phone: z.string().optional(),
  businessDescription: z.string().optional(),
});

export async function updateBusinessDetails(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: { code: 'unauthorized', message: 'Not authenticated' } };

  const raw = {
    category: formData.get('category'),
    phone: formData.get('phone'),
    businessDescription: formData.get('businessDescription'),
  };

  const parsed = businessDetailsSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { ok: false, error: { code: 'invalid_input', message: firstError.message } };
  }

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: {
        category: parsed.data.category || null,
        phone: parsed.data.phone || null,
        businessDescription: parsed.data.businessDescription || null,
      },
    });
  } catch (error) {
    logger.error('onboarding.business_details.failed', { error });
    return { ok: false, error: { code: 'server_error', message: 'Something went wrong. Please try again.' } };
  }

  redirect('/onboarding/step3');
}

export async function completeOnboarding(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: { code: 'unauthorized', message: 'Not authenticated' } };

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { onboarded: true },
    });
  } catch (error) {
    logger.error('onboarding.complete.failed', { error });
    return { ok: false, error: { code: 'server_error', message: 'Something went wrong. Please try again.' } };
  }

  redirect('/dashboard');
}

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  price: z.string().min(1, 'Price is required'),
  image: z.instanceof(File).refine((f) => f.size > 0, 'Product image is required'),
});

export async function createFirstProduct(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: { code: 'unauthorized', message: 'Not authenticated' } };

  const raw = {
    name: formData.get('name'),
    price: formData.get('price'),
    image: formData.get('image'),
  };

  const rawDescription = formData.get('description');
  const description = typeof rawDescription === 'string' ? rawDescription.trim() : '';

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { ok: false, error: { code: 'invalid_input', message: firstError.message } };
  }

  try {
    const imageFile = parsed.data.image;
    const uploadResult = await uploadProductImage(imageFile);
    if (!uploadResult.ok) {
      return { ok: false, error: { code: 'upload_failed', message: uploadResult.error } };
    }

    const priceInKobo = Math.round(parseFloat(parsed.data.price) * 100);
    const uniqueSlug = generateSlug(parsed.data.name);

    await db.product.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        description,
        price: priceInKobo,
        imageUrl: uploadResult.url,
        uniqueSlug,
      },
    });

    await db.user.update({
      where: { id: session.user.id },
      data: { onboarded: true },
    });
  } catch (error) {
    logger.error('onboarding.create_first_product.failed', { error });
    return { ok: false, error: { code: 'server_error', message: 'Something went wrong. Please try again.' } };
  }

  redirect('/dashboard');
}
