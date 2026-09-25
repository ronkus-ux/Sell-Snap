import { redirect } from 'next/navigation';
import { ViewTransition } from 'react';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import styles from './onboarding.module.css';
import { OnboardingProvider } from './_components/OnboardingContext';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/auth');
  if (session.user.onboarded) redirect('/dashboard');

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.logoContainer}>
          <Link href="/" className={styles.logo}>
            SellSnap
          </Link>
        </div>
        <OnboardingProvider userName={session.user.name ?? ''}>
          <ViewTransition enter="onboard-step" exit="onboard-step" default="none">
            <div className={styles.card}>{children}</div>
          </ViewTransition>
        </OnboardingProvider>
      </main>
    </div>
  );
}
