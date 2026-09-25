import styles from './auth.module.css';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.logoContainer}>
          <Link href="/" className={styles.logo} id="sellsnap-auth-logo">
            SellSnap
          </Link>
        </div>
        {children}
      </main>
    </div>
  );
}
