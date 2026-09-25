import Image from 'next/image';
import styles from './ProductPageView.module.css';
import { formatNaira } from '@/lib/utils';
import { CheckoutForm } from './CheckoutForm';

type ProductPageViewProps = {
  product: {
    id: string;
    name: string;
    description: string;
    price: number; // in kobo
    imageUrl: string;
  };
  seller: {
    businessName: string;
    name: string;
  };
};

export function ProductPageView({ product, seller }: ProductPageViewProps) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        {/* Seller header spanning above the split */}
        <header className={styles.header}>
          <div className={styles.sellerBadge}>
            <div className={styles.sellerAvatar} aria-hidden="true">
              {seller.businessName[0]?.toUpperCase()}
            </div>
            <span className={styles.sellerName}>{seller.businessName}</span>
          </div>
        </header>

        {/* 2-column split */}
        <div className={styles.split}>
          <div className={styles.imageWrapper}>
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className={styles.image}
              sizes="(max-width: 768px) 100vw, 383px"
              priority
            />
          </div>

          <div className={styles.content}>
            <div className={styles.priceRow}>
              <h1 className={styles.productName}>{product.name}</h1>
              <p className={styles.price}>{formatNaira(product.price)}</p>
            </div>

            {product.description ? (
              <div className={styles.descriptionBlock}>
                <span className={styles.descriptionLabel}>Description</span>
                <p className={styles.description}>{product.description}</p>
              </div>
            ) : null}

            <CheckoutForm productId={product.id} />
          </div>
        </div>
      </div>
    </main>
  );
}
