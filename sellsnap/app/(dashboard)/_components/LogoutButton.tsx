'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { signOut } from 'next-auth/react';
import styles from './LogoutButton.module.css';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

type LogoutButtonProps = {
  className?: string;
  variant?: 'icon' | 'full';
};

export function LogoutButton({ className, variant = 'icon' }: LogoutButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setConfirmOpen(true)}
        className={cn(styles.logoutBtn, variant === 'full' && styles.full, className)}
        aria-label="Log out"
        title="Log out"
      >
        <span className={styles.iconBox}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </span>
        {variant === 'full' && <span>Log out</span>}
      </button>

      {confirmOpen && createPortal(
        <div
          className={styles.overlay}
          onClick={() => setConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
        >
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h2 id="logout-confirm-title" className={styles.dialogTitle}>
              Log out of SellSnap?
            </h2>
            <p className={styles.dialogText}>
              You will need to sign in again to manage your store.
            </p>
            <div className={styles.dialogActions}>
              <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                className={styles.dialogLogoutBtn}
                onClick={() => signOut({ callbackUrl: '/auth' })}
              >
                Log out
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
