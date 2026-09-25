'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { StepIndicator } from '../_components/StepIndicator';
import { completeOnboarding } from '../actions';
import { useOnboarding } from '../_components/OnboardingContext';
import styles from '../onboarding.module.css';

export default function Step1Page() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { userName } = useOnboarding();

  function handleSkip() {
    startTransition(async () => {
      await completeOnboarding();
    });
  }

  return (
    <>
      <StepIndicator currentStep={1} />

      <div className={`${styles.header} ${styles.step1Header}`}>
        <div className={styles.welcomeBadge}>
          <div className={styles.welcomeIcon}>
            <span className={styles.welcomeInitial}>
              {userName?.[0]?.toUpperCase() ?? 'S'}
            </span>
          </div>
        </div>
        <h1 className={styles.welcomeTitle}>
          Welcome, {userName}!
          <svg
            className={styles.titleEmoji}
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            <circle cx="21" cy="5" r="1.2" />
            <circle cx="4" cy="18" r="1.2" />
          </svg>
        </h1>
        <p className={`${styles.subtitle} ${styles.step1Subtitle}`}>
          Create payment links in seconds. Sell instantly on WhatsApp or Instagram.
        </p>
      </div>

      <div className={styles.actions}>
        <Button
          type="button"
          size="md"
          className={`${styles.submitBtn} ${styles.fitContent}`}
          onClick={() => router.push('/onboarding/step2')}
        >
          Let&apos;s Get Started
        </Button>
        <button
          type="button"
          className={styles.skipLink}
          onClick={handleSkip}
          disabled={isPending}
        >
          Skip for now
        </button>
      </div>
    </>
  );
}
