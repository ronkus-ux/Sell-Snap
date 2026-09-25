'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatDate, formatNaira } from '@/lib/utils';
import styles from './success.module.css';

type PaymentStatus = 'loading' | 'paid' | 'failed' | 'timeout';

type OrderResult = {
  id: string;
  transactionReference: string;
  amount: number;
  createdAt: string;
  product: {
    name: string;
    imageUrl: string;
  } | null;
};

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const txRef = searchParams.get('tx_ref');
  const [status, setStatus] = useState<PaymentStatus>(orderId && txRef ? 'loading' : 'failed');
  const [order, setOrder] = useState<OrderResult | null>(null);

  useEffect(() => {
    if (!orderId || !txRef) return;

    let attempts = 0;
    const maxAttempts = 20; // Poll for up to ~60 seconds

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/orders/${orderId}/status?tx_ref=${encodeURIComponent(txRef)}`
        );
        const data = await response.json();

        if (data?.data?.status === 'paid') {
          setOrder(data.data.order);
          setStatus('paid');
          return;
        }

        if (data?.data?.status === 'failed') {
          setStatus('failed');
          return;
        }

        attempts += 1;
        if (attempts >= maxAttempts) {
          setStatus('timeout');
          return;
        }

        // Poll again in 3 seconds
        setTimeout(poll, 3000);
      } catch {
        attempts += 1;
        if (attempts >= maxAttempts) {
          setStatus('timeout');
          return;
        }
        setTimeout(poll, 3000);
      }
    };

    // Start polling after 2 seconds to give Flutterwave time to fire the webhook
    const timer = setTimeout(poll, 2000);
    return () => clearTimeout(timer);
  }, [orderId, txRef]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {status === 'loading' && (
          <>
            <div className={styles.spinner} aria-label="Verifying payment" />
            <div className={styles.heading}>
              <h1 className={styles.title}>Verifying Your Payment…</h1>
              <p className={styles.text}>
                Please wait a moment while we confirm your transaction.
              </p>
            </div>
          </>
        )}

        {status === 'paid' && (
          <>
            <span className={`${styles.iconWrap} ${styles.iconSuccess}`} aria-hidden="true">
              <svg
                className={styles.icon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div className={styles.heading}>
              <h1 className={styles.title}>Payment Confirmed</h1>
              <p className={styles.text}>
                Your purchase has been confirmed. The seller will contact you shortly.
              </p>
            </div>

            {order && order.product && (
              <div className={styles.orderCard}>
                <div className={styles.cardLine}>
                  <span className={styles.cardName}>{order.product.name}</span>
                  <span className={styles.cardAmount}>{formatNaira(order.amount)}</span>
                </div>
                <div className={styles.cardLine}>
                  <span className={styles.cardDate}>{formatDate(order.createdAt)}</span>
                  <span className={styles.cardRef}>{order.id.slice(0, 8)}</span>
                </div>
              </div>
            )}
          </>
        )}

        {status === 'failed' && (
          <>
            <span className={`${styles.iconWrap} ${styles.iconFail}`} aria-hidden="true">
              <svg
                className={styles.icon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </span>
            <div className={styles.heading}>
              <h1 className={styles.title}>Payment failed</h1>
              <p className={styles.text}>
                Your payment could not be processed. Please try again.
              </p>
            </div>
            <button
              onClick={() => window.history.back()}
              className={styles.btn}
              id="success-retry"
            >
              Try again
            </button>
          </>
        )}

        {status === 'timeout' && (
          <>
            <span className={`${styles.iconWrap} ${styles.iconTimeout}`} aria-hidden="true">
              <svg
                className={styles.icon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </span>
            <div className={styles.heading}>
              <h1 className={styles.title}>Still processing…</h1>
              <p className={styles.text}>
                Your payment is taking longer than usual to confirm. If you were charged, please
                contact the seller.
              </p>
            </div>
            <Link href="/" className={styles.btn} id="success-timeout-home">
              Go to homepage
            </Link>
          </>
        )}
      </div>

      {status === 'paid' && (
        <p className={styles.footnote} id="success-footnote">
          Thank you for your purchase.
        </p>
      )}
    </div>
  );
}