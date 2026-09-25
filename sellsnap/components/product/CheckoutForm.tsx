'use client';

import { useCallback, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import styles from './CheckoutForm.module.css';

type CheckoutFormProps = {
  productId: string;
};

export function CheckoutForm({ productId }: CheckoutFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const buyerEmail = (formData.get('buyerEmail') as string | null)?.trim() ?? '';
    const buyerName = (formData.get('buyerName') as string | null)?.trim() ?? '';

    if (!buyerEmail) {
      setError('Please enter your email address so we can send your receipt.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          buyerEmail: buyerEmail || undefined,
          buyerName: buyerName || undefined,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        setError(data.error?.message ?? 'Something went wrong. Please try again.');
        setIsLoading(false);
        return;
      }

      // Redirect to Flutterwave hosted checkout
      window.location.href = data.data.checkoutUrl;
    } catch {
      setError('Network error. Please check your connection and try again.');
      setIsLoading(false);
    }
  }, [productId]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.payBox}>
        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
            <button
              onClick={() => setError(null)}
              className={styles.dismissError}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <Input
            label="Your name"
            name="buyerName"
            type="text"
            autoComplete="name"
            placeholder="Your name"
          />
          <Input
            label="Your email"
            name="buyerEmail"
            type="email"
            autoComplete="email"
            required
            hideRequiredAsterisk
            placeholder="Where should we send your receipt?"
          />

          <Button
            type="submit"
            size="lg"
            isLoading={isLoading}
            className={styles.payBtn}
            id="checkout-pay-now"
          >
            Pay Now
          </Button>
        </form>

        <div className={styles.secureNote}>
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          ><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg><span>Secured by Flutterwave. Your payment info is never stored on our servers.</span>
        </div>
      </div>
    </div>
  );
}
