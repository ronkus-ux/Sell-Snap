'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/auth';
import { generateSlug } from '@/lib/slug';
import { uploadProductImage } from '@/lib/storage';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ActionResult } from '@/types';

const productSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(100),
  description: z.string().min(4, 'Description must be at least 4 characters').max(1000),
  price: z
    .string()
    .min(1, 'Price is required')
    .transform(Number)
    .pipe(z.number().min(1, 'Price must be at least ₦1')),
});

export async function createProduct(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult<{ slug: string }>> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: { code: 'unauthorized', message: 'Please sign in.' } };
  }

  const userId = session.user.id;

  const raw = {
    name: formData.get('name'),
    description: formData.get('description'),
    price: formData.get('price'),
  };

  const values = {
    name: typeof raw.name === 'string' ? raw.name : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    price: typeof raw.price === 'string' ? raw.price : '',
  };

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0].message },
      fieldErrors,
      values,
    };
  }

  const imageFile = formData.get('image') as File | null;
  if (!imageFile || imageFile.size === 0) {
    return {
      ok: false,
      error: { code: 'missing_image', message: 'Please upload a product image.' },
      values,
    };
  }

  const uploadResult = await uploadProductImage(imageFile);
  if (!uploadResult.ok) {
    return {
      ok: false,
      error: { code: 'upload_failed', message: uploadResult.error },
      values,
    };
  }

  const { name, description, price } = parsed.data;
  const priceInKobo = Math.round(price * 100);
  const uniqueSlug = generateSlug(name);

  try {
    const product = await db.product.create({
      data: {
        userId,
        name,
        description,
        price: priceInKobo,
        imageUrl: uploadResult.url,
        uniqueSlug,
      },
    });

    logger.info('product.created', { productId: product.id, userId });
    revalidatePath('/products');
    revalidatePath('/dashboard');
  } catch (error) {
    logger.error('product.create.failed', { error, userId });
    return { ok: false, error: { code: 'server_error', message: 'Failed to create product. Please try again.' } };
  }

  redirect('/products');
}

export async function updateProduct(
  id: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: { code: 'unauthorized', message: 'Please sign in.' } };
  }

  const userId = session.user.id;

  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: { code: 'not_found', message: 'Product not found.' } };
  }
  if (existing.userId !== userId) {
    return { ok: false, error: { code: 'forbidden', message: 'You do not have permission to edit this product.' } };
  }

  const raw = {
    name: formData.get('name'),
    description: formData.get('description'),
    price: formData.get('price'),
  };

  const values = {
    name: typeof raw.name === 'string' ? raw.name : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    price: typeof raw.price === 'string' ? raw.price : '',
  };

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error: { code: 'invalid_input', message: parsed.error.issues[0].message },
      fieldErrors,
      values,
    };
  }

  const { name, description, price } = parsed.data;
  const priceInKobo = Math.round(price * 100);

  let imageUrl = existing.imageUrl;
  const imageFile = formData.get('image') as File | null;
  if (imageFile && imageFile.size > 0) {
    const uploadResult = await uploadProductImage(imageFile);
    if (!uploadResult.ok) {
      return {
        ok: false,
        error: { code: 'upload_failed', message: uploadResult.error },
        values,
      };
    }
    imageUrl = uploadResult.url;
  }

  try {
    await db.product.update({
      where: { id },
      data: { name, description, price: priceInKobo, imageUrl },
    });

    logger.info('product.updated', { productId: id, userId });
    revalidatePath('/products');
    revalidatePath('/dashboard');
    revalidatePath('/p/' + existing.uniqueSlug);
  } catch (error) {
    logger.error('product.update.failed', { error, productId: id });
    return { ok: false, error: { code: 'server_error', message: 'Failed to update product.' } };
  }

  redirect('/products');
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: { code: 'unauthorized', message: 'Please sign in.' } };
  }

  const userId = session.user.id;

  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, error: { code: 'not_found', message: 'Product not found.' } };
  }
  if (existing.userId !== userId) {
    return { ok: false, error: { code: 'forbidden', message: 'You do not have permission to delete this product.' } };
  }

  try {
    await db.product.delete({ where: { id } });
    logger.info('product.deleted', { productId: id, userId });
    revalidatePath('/products');
    revalidatePath('/dashboard');
    revalidatePath('/p/' + existing.uniqueSlug);
    return { ok: true };
  } catch (error) {
    logger.error('product.delete.failed', { error, productId: id });
    return { ok: false, error: { code: 'server_error', message: 'Failed to delete product.' } };
  }
}
