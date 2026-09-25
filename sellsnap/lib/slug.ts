import slugify from 'slugify';
import { nanoid } from 'nanoid';

/**
 * Generates a unique product slug from the product name.
 * Format: <slugified-name>-<6-char-random-id>
 * Example: "Black Hoodie" → "black-hoodie-a1b2c3"
 *
 * The Prisma @unique constraint on Product.uniqueSlug is the final collision guard.
 * nanoid(6) gives ~56 billion possible values, so practical collision risk is negligible.
 */
export function generateSlug(productName: string): string {
  const slugifiedName = slugify(productName, {
    lower: true,
    strict: true, // remove special characters
    trim: true,
  });

  // Fallback to "product" if slugify returns empty string (e.g. emoji-only name)
  const base = slugifiedName || 'product';
  const id = nanoid(6);

  return `${base}-${id}`;
}
