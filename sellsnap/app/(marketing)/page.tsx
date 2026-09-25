import type { Metadata } from 'next';
import styles from './landing.module.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'SellSnap — Sell anything in seconds using just a link',
  description:
    'No store. No website. Upload a product, generate a unique payment link, and share it on WhatsApp or Instagram.',
};

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Brand Logo */}
        <div className={styles.logo}>SellSnap</div>

        {/* Hero Headline */}
        <h1 className={styles.headline}>
          <span className={styles.headlineLine}>Sell anything in seconds</span>
          <span className={styles.headlineLine}>using just a link.</span>
        </h1>

        {/* Subline */}
        <p className={styles.subline}>
          No store. No website. Just a link.
        </p>

        {/* Actions */}
        <div className={styles.actions}>
          <Link href="/auth?mode=signup&from=landing" className={styles.primaryCta} id="landing-get-started">
            Get Started
          </Link>
        </div>
      </div>
    </main>
  );
}
