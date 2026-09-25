'use client';

import { useActionState, useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { StepIndicator } from '../_components/StepIndicator';
import { useOnboarding } from '../_components/OnboardingContext';
import { updateBusinessDetails, completeOnboarding } from '../actions';
import styles from '../onboarding.module.css';
import type { ActionResult } from '@/types';

const initialState: ActionResult = { ok: true };

const categories = [
  'Fashion & Clothing',
  'Electronics & Gadgets',
  'Food & Groceries',
  'Health & Beauty',
  'Home & Kitchen',
  'Services',
  'Other',
];

export default function Step2Page() {
  const router = useRouter();
  const { step2, setStep2 } = useOnboarding();
  const [state, formAction, isPending] = useActionState(updateBusinessDetails, initialState);
  const [skipPending, startSkipTransition] = useTransition();
  const [errors, setErrors] = useState<{ category?: string; phone?: string }>({});

  const filledStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-inverse-on-surface-color)',
    ['--bg-color' as string]: 'var(--color-inverse-on-surface-color)',
  };

  const isFilled = {
    category: step2.category !== '',
    phone: step2.phone !== '',
    businessDescription: step2.businessDescription !== '',
  };

  function handleSkip() {
    startSkipTransition(async () => {
      await completeOnboarding();
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const nextErrors: { category?: string; phone?: string } = {};

    if (!step2.category) nextErrors.category = 'This field cannot be empty';
    if (!step2.phone.trim()) nextErrors.phone = 'This field cannot be empty';

    if (Object.keys(nextErrors).length > 0) {
      e.preventDefault();
      setErrors(nextErrors);
    } else {
      setErrors({});
    }
  }

  return (
    <>
      <StepIndicator currentStep={2} />

      <div className={styles.header}>
        <h1 className={styles.title}>Tell us about your business</h1>
        <p className={styles.subtitle}>
          Help us tailor your experience. Fill this out now, or skip it.
        </p>
      </div>

      {!state.ok && (
        <div className={styles.errorBanner} role="alert">
          {state.error.message}
        </div>
      )}

      <form action={formAction} onSubmit={handleSubmit} className={styles.form} noValidate>
        <CustomSelect
          label="Business Category"
          name="category"
          value={step2.category}
          required
          hideRequiredAsterisk
          className={styles.formInput}
          error={errors.category}
          onChange={(e) => {
            const val = e.target.value;
            setStep2({ ...step2, category: val });
            if (val === '') {
              setErrors((prev) => ({ ...prev, category: 'This field cannot be empty' }));
            } else {
              setErrors((prev) => ({ ...prev, category: undefined }));
            }
          }}
          onBlur={(e) => {
            const val = e.target.value;
            if (val === '') {
              setErrors((prev) => ({ ...prev, category: 'This field cannot be empty' }));
            }
          }}
          style={isFilled.category ? filledStyle : undefined}
        >
          <option value="">Select a category</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </CustomSelect>

        <Input
          label="Phone Number"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          hideRequiredAsterisk
          className={styles.formInput}
          error={errors.phone}
          value={step2.phone}
          onChange={(e) => {
            const val = e.target.value;
            setStep2({ ...step2, phone: val });
            if (val.trim() === '') {
              setErrors((prev) => ({ ...prev, phone: 'This field cannot be empty' }));
            } else {
              setErrors((prev) => ({ ...prev, phone: undefined }));
            }
          }}
          onBlur={(e) => {
            const val = e.target.value.trim();
            if (val === '') {
              setErrors((prev) => ({ ...prev, phone: 'This field cannot be empty' }));
            }
          }}
          style={isFilled.phone ? filledStyle : undefined}
        />

        <Textarea
          label="Business Description"
          name="businessDescription"
          rows={3}
          value={step2.businessDescription}
          onChange={(e) => setStep2({ ...step2, businessDescription: e.target.value })}
          style={isFilled.businessDescription ? filledStyle : undefined}
        />

        <div className={styles.actions}>
          <Button type="submit" size="md" isLoading={isPending} className={styles.submitBtn}>
            Continue
          </Button>
          <div className={styles.actionsFooter}>
            <button
              type="button"
              className={styles.backLink}
              onClick={() => router.push('/onboarding/step1')}
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
