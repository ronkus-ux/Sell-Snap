'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import styles from './UserMenu.module.css';
import { LogoutButton } from './LogoutButton';

type UserMenuProps = {
  name?: string | null;
  businessName?: string | null;
  variant?: 'sidebar' | 'topbar';
};

export function UserMenu({ name, businessName, variant = 'sidebar' }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isTopbar = variant === 'topbar';

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div
      className={cn(styles.userMenu, isTopbar && styles.topbar)}
      ref={rootRef}
    >
      <button
        type="button"
        className={cn(styles.trigger, isTopbar && styles.compact)}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className={styles.userAvatar} aria-hidden="true">
          {name?.[0]?.toUpperCase() ?? 'U'}
        </span>
        {!isTopbar && (
          <span className={styles.userDetails}>
            <span className={styles.userName}>{name}</span>
            <span className={styles.userBusiness}>{businessName}</span>
          </span>
        )}
      </button>

      <div
        className={cn(styles.dropdown, open && styles.dropdownOpen)}
        role="menu"
        aria-label="Account options"
      >
        <Link href="/settings" className={styles.menuLink} onClick={() => setOpen(false)}>
          <span className={styles.menuIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
            </svg>
          </span>
          Settings
        </Link>
        <div className={styles.divider} role="separator" />
        <LogoutButton variant="full" className={styles.dropdownItem} />
      </div>
    </div>
  );
}