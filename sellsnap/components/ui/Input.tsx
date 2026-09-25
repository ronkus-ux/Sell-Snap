'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import styles from './Input.module.css';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  hideRequiredAsterisk?: boolean;
  showPasswordToggle?: boolean;
  labelAction?: React.ReactNode;
};

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export function Input({
  label,
  error,
  hint,
  id,
  className,
  required,
  hideRequiredAsterisk = false,
  showPasswordToggle = false,
  labelAction,
  type = 'text',
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [hasValue, setHasValue] = useState(() => {
    const val = props.value ?? props.defaultValue ?? '';
    return String(val).length > 0;
  });
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const isPassword = type === 'password';
  const showToggle = isPassword && showPasswordToggle && hasValue;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setHasValue(e.target.value.length > 0);
    props.onChange?.(e);
  }

  return (
    <div className={cn(styles.wrapper, className)}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && !hideRequiredAsterisk && <span className={styles.required} aria-hidden="true"> *</span>}
        </label>
        {labelAction && <div className={styles.labelAction}>{labelAction}</div>}
      </div>
      <div className={styles.field}>
        <input
          id={inputId}
          className={cn(
            styles.input,
            showToggle && styles.inputWithToggle,
            error && styles.inputError,
          )}
          aria-describedby={
            [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined
          }
          aria-invalid={error ? 'true' : undefined}
          required={required}
          type={isPassword && showPassword ? 'text' : type}
          {...props}
          onChange={handleChange}
        />
        {showToggle && (
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
