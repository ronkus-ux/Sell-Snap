'use client';

import { useActionState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { updateProfile, changePassword } from './actions';
import styles from './settings.module.css';
import type { ActionResult } from '@/types';

type SettingsPageClientProps = {
  user: {
    name: string;
    email: string;
    businessName: string;
  };
};

const initialState: ActionResult = { ok: true };

function ProfileForm({ user }: SettingsPageClientProps) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Profile</h2>

      {!state.ok && (
        <div className={styles.errorBanner} role="alert">{state.error.message}</div>
      )}
      {state.ok && (state as { saved?: boolean }).saved && (
        <div className={styles.successBanner} role="status">Profile updated successfully.</div>
      )}

      <form action={formAction} className={styles.form}>
        <Input
          label="Your name"
          name="name"
          type="text"
          defaultValue={user.name}
          required
        />
        <Input
          label="Business name"
          name="businessName"
          type="text"
          defaultValue={user.businessName}
          required
        />
        <Input
          label="Email address"
          name="email"
          type="email"
          defaultValue={user.email}
          disabled
          hint="Contact support to change your email address."
        />
        <Button type="submit" isLoading={isPending} className={styles.saveBtn}>
          Save changes
        </Button>
      </form>
    </section>
  );
}

function PasswordForm() {
  const [state, formAction, isPending] = useActionState(changePassword, initialState);

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Change password</h2>

      {!state.ok && (
        <div className={styles.errorBanner} role="alert">{state.error.message}</div>
      )}

      <form action={formAction} className={styles.form}>
        <Input
          label="Current password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
        <Input
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character."
          required
        />
        <Button type="submit" variant="secondary" isLoading={isPending} className={styles.saveBtn}>
          Change password
        </Button>
      </form>
    </section>
  );
}

import { LogoutButton } from '../_components/LogoutButton';

export function SettingsPageClient({ user }: SettingsPageClientProps) {
  return (
    <div>
      <ProfileForm user={user} />
      <PasswordForm />
      
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Account Actions</h2>
        <LogoutButton variant="full" />
      </section>
    </div>
  );
}
