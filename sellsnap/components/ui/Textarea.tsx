'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import styles from './Input.module.css';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: string;
  hideRequiredAsterisk?: boolean;
};

export function Textarea({
  label,
  error,
  hint,
  id,
  className,
  required,
  hideRequiredAsterisk = false,
  style,
  ...props
}: TextareaProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className={cn(styles.wrapper, className)}>
      <div className={styles.labelRow}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
          {required && !hideRequiredAsterisk && <span className={styles.required} aria-hidden="true"> *</span>}
        </label>
      </div>
      <div className={styles.field}>
        <textarea
          id={inputId}
          className={cn(styles.input, styles.textarea, error && styles.inputError)}
          aria-describedby={
            [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined
          }
          aria-invalid={error ? 'true' : undefined}
          required={required}
          style={style}
          {...props}
        />
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
