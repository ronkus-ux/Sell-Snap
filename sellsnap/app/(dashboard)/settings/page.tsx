import type { Metadata } from 'next';
import { getSession } from '@/lib/auth';
import { getUserProfile } from '@/lib/data';
import { SettingsPageClient } from './SettingsPageClient';
import styles from './settings.module.css';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const user = await getUserProfile(session.user.id);
  if (!user) return null;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your account and profile preferences</p>
      </div>

      <SettingsPageClient user={user} />
    </div>
  );
}
