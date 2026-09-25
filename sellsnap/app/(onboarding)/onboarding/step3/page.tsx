'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { StepIndicator } from '../_components/StepIndicator';
import { createFirstProduct, completeOnboarding } from '../actions';
import { useOnboarding } from '../_components/OnboardingContext';
import styles from '../onboarding.module.css';
import type { ActionResult } from '@/types';

const initialState: ActionResult = { ok: true };

export default function Step3Page() {
  const router = useRouter();
  const { step3, setStep3 } = useOnboarding();
  const [state, formAction, isPending] = useActionState(createFirstProduct, initialState);
  const [skipPending, startSkipTransition] = useTransition();
  const [errors, setErrors] = useState<{ name?: string; price?: string; image?: string }>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isFilled, setIsFilled] = useState({ name: false, price: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filledStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-inverse-on-surface-color)',
    ['--bg-color' as string]: 'var(--color-inverse-on-surface-color)',
  };

  function handleSkip() {
    startSkipTransition(async () => {
      await completeOnboarding();
    });
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setErrors((prev) => ({ ...prev, image: undefined }));
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const nextErrors: { name?: string; price?: string; image?: string } = {};

    if (!step3.name.trim()) nextErrors.name = 'This field cannot be empty';
    if (!step3.price) nextErrors.price = 'This field cannot be empty';

    const imageSelected = (fileInputRef.current?.files?.length ?? 0) > 0;
    if (!imageSelected) nextErrors.image = 'This field cannot be empty';

    if (Object.keys(nextErrors).length > 0) {
      e.preventDefault();
      setErrors(nextErrors);
    } else {
      setErrors({});
    }
  }

  return (
    <>
      <StepIndicator currentStep={3} />

      <div className={styles.header}>
        <h1 className={styles.title}>Create your first product</h1>
        <p className={styles.subtitle}>
          Add a product to get your first payment link. Add more later.
        </p>
      </div>

      {!state.ok && (
        <div className={styles.errorBanner} role="alert">
          {state.error.message}
        </div>
      )}

      <form action={formAction} className={styles.form} noValidate onSubmit={handleSubmit}>
        <Input
          label="Product Name"
          name="name"
          type="text"
          required
          hideRequiredAsterisk
          className={styles.formInput}
          error={errors.name}
          value={step3.name}
          onChange={(e) => {
            const val = e.target.value;
            setStep3({ ...step3, name: val });
            if (val.trim() === '') {
              setErrors((prev) => ({ ...prev, name: 'This field cannot be empty' }));
              setIsFilled((prev) => ({ ...prev, name: false }));
            } else {
              setErrors((prev) => ({ ...prev, name: undefined }));
            }
          }}
          onBlur={(e) => {
            const val = e.target.value.trim();
            if (val === '') {
              setErrors((prev) => ({ ...prev, name: 'This field cannot be empty' }));
              setIsFilled((prev) => ({ ...prev, name: false }));
            } else {
              setIsFilled((prev) => ({ ...prev, name: true }));
            }
          }}
          style={isFilled.name ? filledStyle : undefined}
        />

        <Input
          label="Price (NGN)"
          name="price"
          type="number"
          required
          hideRequiredAsterisk
          className={styles.formInput}
          error={errors.price}
          value={step3.price}
          onChange={(e) => {
            const val = e.target.value;
            setStep3({ ...step3, price: val });
            if (val === '') {
              setErrors((prev) => ({ ...prev, price: 'This field cannot be empty' }));
              setIsFilled((prev) => ({ ...prev, price: false }));
            } else {
              setErrors((prev) => ({ ...prev, price: undefined }));
            }
          }}
          onBlur={(e) => {
            const val = e.target.value;
            if (val === '') {
              setErrors((prev) => ({ ...prev, price: 'This field cannot be empty' }));
              setIsFilled((prev) => ({ ...prev, price: false }));
            } else {
              setIsFilled((prev) => ({ ...prev, price: true }));
            }
          }}
          style={isFilled.price ? filledStyle : undefined}
        />

        <div className={styles.formInput}>
          <label>Product Image</label>
          <input
            ref={fileInputRef}
            type="file"
            name="image"
            accept="image/*"
            required
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              height: '120px',
              border: `2px dashed ${errors.image ? 'var(--color-error-color)' : 'var(--color-outline-variant-color)'}`,
              borderRadius: '8px',
              backgroundColor: imagePreview ? 'transparent' : 'var(--color-surface-container-lowest-color)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Product preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-on-surface-variant-color)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant-color)' }}>
                  Click to upload
                </span>
              </div>
            )}
          </button>
          {errors.image && (
            <span style={{ color: 'var(--color-error-color)', fontSize: '12px', marginTop: '4px' }}>{errors.image}</span>
          )}
        </div>

        <div className={styles.actions}>
          <Button type="submit" size="md" isLoading={isPending} className={styles.submitBtn}>
            Create &amp; Go to Dashboard
          </Button>
          <div className={styles.actionsFooter}>
            <button
              type="button"
              className={styles.backLink}
              onClick={() => router.push('/onboarding/step2')}
            >
              Back
            </button>
            <button
              type="button"
              className={styles.skipLink}
              onClick={handleSkip}
              disabled={skipPending}
            >
              Skip for now
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
