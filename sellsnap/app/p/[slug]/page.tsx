import type { Metadata } from 'next';
import { getProductBySlug } from '@/lib/data';
import { ProductPageView } from '@/components/product/ProductPageView';
import { ProductUnavailable } from '@/components/product/ProductUnavailable';

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: 'Product not available',
      description: 'This product is no longer available.',
    };
  }

  const priceNaira = (product.price / 100).toLocaleString('en-NG');

  return {
    title: `${product.name} — ₦${priceNaira}`,
    description: product.description,
    openGraph: {
      title: `${product.name} — ₦${priceNaira}`,
      description: product.description,
      images: [
        {
          url: product.imageUrl,
          width: 1200,
          height: 630,
          alt: product.name,
        },
      ],
      siteName: product.user.businessName,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} — ₦${priceNaira}`,
      description: product.description,
      images: [product.imageUrl],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  // Query the product — include user for business name display.
  // Cached per request (React cache) and served stale-while-revalidate (ISR).
  const product = await getProductBySlug(slug);

  // Business rule: if product slug not found at all, show unavailable — not a 404
  if (!product) {
    return <ProductUnavailable />;
  }

  return (
    <ProductPageView
      product={{
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        imageUrl: product.imageUrl,
      }}
      seller={{
        businessName: product.user.businessName,
        name: product.user.name,
      }}
    />
  );
}
