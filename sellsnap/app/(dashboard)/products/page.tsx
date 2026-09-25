import type { Metadata } from 'next';
import { getSession } from '@/lib/auth';
import { getProductsForUser } from '@/lib/data';
import styles from './products.module.css';
import Link from 'next/link';
import { ProductCard } from '@/components/product/ProductCard';

export const metadata: Metadata = { title: 'Products' };

export default async function ProductsPage() {
  const session = await getSession();
  if (!session) return null;

  const products = await getProductsForUser(session.user.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Products</h1>
          <p className={styles.subtitle}>
            You have {products.length} active product{products.length !== 1 ? 's' : ''}.
          </p>
        </div>
        {products.length > 0 && (
          <Link href="/products/new" className={styles.newBtn}>
            Create Product
          </Link>
        )}
      </div>

      {products.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="M3.3 7L12 12l8.7-5" />
              <path d="M12 22V12" />
            </svg>
          </span>
          <h2 className={styles.emptyTitle}>No products yet</h2>
          <p className={styles.emptyText}>
            Create your first product to generate a payment link and start selling.
          </p>
          <Link href="/products/new" className={styles.emptyBtn} id="products-empty-create">
            Create Product
          </Link>
        </div>
      ) : (
        <div className={styles.productList}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              productUrl={`${appUrl}/p/${product.uniqueSlug}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}