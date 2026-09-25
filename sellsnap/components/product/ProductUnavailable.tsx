import Link from 'next/link';
import styles from './ProductUnavailable.module.css';

export function ProductUnavailable() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <span className={styles.icon} aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
        </span>
        <h1 className={styles.title}>Product not available</h1>
        <p className={styles.text}>
          This product is no longer available. The seller may have removed it.
        </p>
        <Link href="/" className={styles.homeLink}>
          Go to SellSnap
        </Link>
      </div>
    </div>
  );
}
