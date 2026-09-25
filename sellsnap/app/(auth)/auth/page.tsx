'use client';

import { useState, useActionState, useRef, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { validatePassword } from '@/lib/utils';
import { registerUser } from '../signup/actions';
import { requestPasswordReset } from '../forgot-password/actions';
import { resetPassword } from '../reset-password/actions';
import styles from './auth.module.css';
import passwordStyles from '../password.module.css';
import Link from 'next/link';
import type { ActionResult } from '@/types';

const signupInitialState = { ok: false } as ActionResult;

function SignupForm({ autoFocusName }: { autoFocusName?: boolean }) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(registerUser, signupInitialState);
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string; businessName?: string; password?: string }>({});
  const [filled, setFilled] = useState({ name: false, email: false, businessName: false, password: false });
  const pendingCreds = useRef<{ email: string; password: string } | null>(null);
  const [phase, setPhase] = useState<'idle' | 'creating' | 'logging-in'>('idle');

  useEffect(() => {
    if (!state.ok) return;
    const creds = pendingCreds.current;
    if (!creds) return;
    pendingCreds.current = null;
    setPhase('logging-in');
    signIn('credentials', { email: creds.email, password: creds.password, redirect: false }).then((result) => {
      if (result?.error) {
        setPhase('idle');
        setStepError('Account created but login failed. Please log in manually.');
      } else {
        router.push('/onboarding');
        router.refresh();
      }
    });
  }, [state, router]);

  const filledStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-inverse-on-surface-color)',
    ['--bg-color' as string]: 'var(--color-inverse-on-surface-color)',
  };

  function setFieldFilled(field: keyof typeof filled, value: boolean) {
    setFilled((prev) => ({ ...prev, [field]: value }));
  }

  function isValidEmail(val: string) {
    const parts = val.trim().split('@');
    if (parts.length !== 2) return false;
    const domain = parts[1];
    return parts[0].length > 0 && domain.includes('.') && domain.split('.').pop()!.length > 0;
  }

  function handleContinue(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form;
    if (!form) return;

    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;

    const newErrors: { name?: string; email?: string } = {};

    if (!name?.trim()) {
      newErrors.name = 'Field cannot be empty';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    if (!email?.trim()) {
      newErrors.email = 'Field cannot be empty';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStepError(null);
    setStep(2);
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const email = formData.get('email') as string;

    if (!password) {
      e.preventDefault();
      setErrors((prev) => ({ ...prev, password: 'This field cannot be empty' }));
      setFieldFilled('password', false);
      return;
    }

    pendingCreds.current = { email, password };
    setPhase('creating');
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.title}>Create an account</h1>
      </div>

      {!state.ok && 'error' in state && state.error.code !== 'email_taken' && (
        <div className={styles.errorBanner} role="alert">
          {state.error.message}
        </div>
      )}

      {stepError && (
        <div className={styles.errorBanner} role="alert">
          {stepError}
        </div>
      )}

      <form action={formAction} onSubmit={handleCreate} className={styles.form} noValidate>
        <div className={step === 2 ? styles.stepHidden : styles.stepContent}>
          <Input
            label="Enter Full Name"
            name="name"
            type="text"
            autoComplete="name"
            autoFocus={autoFocusName}
            required
            hideRequiredAsterisk
            className={styles.formInput}
            error={errors.name}
            onChange={(e) => {
              const val = e.target.value;
              if (val.trim() === '') {
                setErrors((prev) => ({ ...prev, name: 'This field cannot be empty' }));
                setFieldFilled('name', false);
              } else if (val.trim().length < 2) {
                setErrors((prev) => ({ ...prev, name: 'Name must be at least 2 characters' }));
                setFieldFilled('name', false);
              } else {
                setErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val === '') {
                setErrors((prev) => ({ ...prev, name: 'This field cannot be empty' }));
                setFieldFilled('name', false);
              } else if (val.length >= 2) {
                setFieldFilled('name', true);
              }
            }}
            style={filled.name ? filledStyle : undefined}
          />
          <Input
            label="Enter Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            hideRequiredAsterisk
            className={styles.formInput}
            error={errors.email}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                setErrors((prev) => ({ ...prev, email: undefined }));
                setFieldFilled('email', false);
              } else if (isValidEmail(val)) {
                setErrors((prev) => ({ ...prev, email: undefined }));
                setFieldFilled('email', true);
              } else {
                setErrors((prev) => ({ ...prev, email: 'Enter A Valid Email Address' }));
                setFieldFilled('email', false);
              }
            }}
            onBlur={(e) => {
              const val = e.target.value;
              if (val && !isValidEmail(val)) {
                setErrors((prev) => ({ ...prev, email: 'Enter A Valid Email Address' }));
              }
            }}
            style={filled.email ? filledStyle : undefined}
          />
        </div>

        <div className={step === 1 ? styles.stepHidden : styles.stepContent}>
          <Input
            label="Business Name"
            name="businessName"
            type="text"
            autoComplete="organization"
            required
            hideRequiredAsterisk
            className={styles.formInput}
            error={errors.businessName}
            onChange={(e) => {
              const val = e.target.value;
              if (val.trim() === '') {
                setErrors((prev) => ({ ...prev, businessName: 'This field cannot be empty' }));
                setFieldFilled('businessName', false);
              } else {
                setErrors((prev) => ({ ...prev, businessName: undefined }));
              }
            }}
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val === '') {
                setErrors((prev) => ({ ...prev, businessName: 'This field cannot be empty' }));
                setFieldFilled('businessName', false);
              } else {
                setFieldFilled('businessName', true);
              }
            }}
            style={filled.businessName ? filledStyle : undefined}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            hideRequiredAsterisk
            showPasswordToggle
            className={styles.formInput}
            error={errors.password}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                setErrors((prev) => ({ ...prev, password: 'This field cannot be empty' }));
                setFieldFilled('password', false);
              } else {
                const message = validatePassword(val);
                setErrors((prev) => ({ ...prev, password: message ?? undefined }));
                setFieldFilled('password', message === null);
              }
            }}
            onBlur={(e) => {
              const val = e.target.value;
              if (!val) {
                setErrors((prev) => ({ ...prev, password: 'This field cannot be empty' }));
                setFieldFilled('password', false);
              } else {
                const message = validatePassword(val);
                setErrors((prev) => ({ ...prev, password: message ?? undefined }));
                setFieldFilled('password', message === null);
              }
            }}
            style={filled.password ? filledStyle : undefined}
          />

          {!state.ok && 'error' in state && state.error.code === 'email_taken' && (
            <div className={styles.emailErrorBanner} role="alert">
              {state.error.message}
            </div>
          )}
        </div>

        {step === 1 ? (
          <Button
            type="button"
            size="md"
            onClick={handleContinue}
            className={styles.submitBtn}
          >
            Continue
            <svg
              className={styles.arrowIcon}
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Button>
        ) : (
          <div className={styles.stepActions}>
            <Button type="submit" size="md" isLoading={isPending || phase !== 'idle'} className={styles.submitBtn}>
              {phase === 'creating' ? 'Creating your account...' : phase === 'logging-in' ? 'Taking you to onboarding...' : 'Create account'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setStepError(null);
                setErrors({});
              }}
              className={styles.backLink}
            >
              Back
            </button>
          </div>
        )}
      </form>

      <p className={styles.footer}>
        Already have an account?{' '}
        <Link href="/auth?mode=login">Log in</Link>
      </p>
    </div>
  );
}

function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, signupInitialState);
  const [submitted, setSubmitted] = useState(false);
  const success = submitted && state.ok;

  return (
    <div className={passwordStyles.card}>
      <div className={passwordStyles.header}>
        <h1 className={passwordStyles.title}>Reset your password</h1>
      </div>

      {success ? (
        <>
          <div className={passwordStyles.successBanner} role="status">
            If an account exists for that email, a reset link has been sent. Check your inbox.
          </div>
          <div className={passwordStyles.back}>
            <Link href="/auth" className={passwordStyles.backLink}>
              Back to login
            </Link>
          </div>
        </>
      ) : (
        <>
          {!state.ok && 'error' in state && (
            <div className={passwordStyles.errorBanner} role="alert">
              {state.error.message}
            </div>
          )}

          <form
            action={formAction}
            onSubmit={() => setSubmitted(true)}
            className={passwordStyles.form}
            noValidate
          >
            <Input
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              required
              hideRequiredAsterisk
              className={passwordStyles.formInput}
            />
            <Button type="submit" size="md" isLoading={isPending} className={passwordStyles.submitBtn}>
              Send reset link
            </Button>
          </form>

          <div className={passwordStyles.back}>
            <Link href="/auth" className={passwordStyles.backLink}>
              Back to login
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(
    resetPassword.bind(null, token),
    signupInitialState
  );
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [filled, setFilled] = useState({ password: false, confirm: false });

  const filledStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-inverse-on-surface-color)',
    ['--bg-color' as string]: 'var(--color-inverse-on-surface-color)',
  };

  if (!token) {
    return (
      <div className={passwordStyles.card}>
        <div className={passwordStyles.header}>
          <h1 className={passwordStyles.title}>Invalid reset link</h1>
        </div>
        <p className={passwordStyles.bodyText}>
          This link is missing or incomplete. Request a new one to continue.
        </p>
        <div className={passwordStyles.back}>
          <Link href="/auth?mode=forgot-password" className={passwordStyles.backLink}>
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={passwordStyles.card}>
      <div className={passwordStyles.header}>
        <h1 className={passwordStyles.title}>Set a new password</h1>
      </div>

      {!state.ok && 'error' in state && (
        <div className={passwordStyles.errorBanner} role="alert">
          {state.error.message}
        </div>
      )}

      <form
        action={formAction}
        onSubmit={(e) => {
          const formData = new FormData(e.currentTarget);
          const password = formData.get('password') as string;
          const confirm = formData.get('confirm') as string;

          const newErrors: { password?: string; confirm?: string } = {};
          if (!password) newErrors.password = 'This field cannot be empty';
          if (!confirm) newErrors.confirm = 'This field cannot be empty';
          else if (confirm !== password) newErrors.confirm = 'Passwords do not match';

          if (Object.keys(newErrors).length > 0) {
            e.preventDefault();
            setErrors(newErrors);
          } else {
            setErrors({});
          }
        }}
        className={passwordStyles.form}
        noValidate
      >
        <Input
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hideRequiredAsterisk
          showPasswordToggle
          className={passwordStyles.formInput}
          error={errors.password}
          onChange={(e) => {
            if (e.target.value) {
              setErrors((prev) => ({ ...prev, password: undefined }));
            }
          }}
          onBlur={(e) => {
            setFilled((prev) => ({ ...prev, password: e.target.value !== '' }));
          }}
          style={filled.password ? filledStyle : undefined}
        />
        <Input
          label="Confirm password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          hideRequiredAsterisk
          showPasswordToggle
          className={passwordStyles.formInput}
          error={errors.confirm}
          onChange={(e) => {
            if (e.target.value) {
              setErrors((prev) => ({ ...prev, confirm: undefined }));
            }
          }}
          onBlur={(e) => {
            setFilled((prev) => ({ ...prev, confirm: e.target.value !== '' }));
          }}
          style={filled.confirm ? filledStyle : undefined}
        />
        <Button type="submit" size="md" isLoading={isPending} className={passwordStyles.submitBtn}>
          Reset password
        </Button>
      </form>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justSignedUp = searchParams.get('signup') === 'success';
  const justReset = searchParams.get('reset') === 'success';

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [filled, setFilled] = useState({ email: false, password: false });
  const [bannerStyle, setBannerStyle] = useState<React.CSSProperties | undefined>(undefined);

  function positionBanner(): React.CSSProperties | undefined {
    const logo = document.getElementById('sellsnap-auth-logo');
    if (!logo) return undefined;
    const logoTop = logo.getBoundingClientRect().top;
    return { bottom: window.innerHeight - logoTop + 20 };
  }

  const filledStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-inverse-on-surface-color)',
    ['--bg-color' as string]: 'var(--color-inverse-on-surface-color)',
  };

  function setFieldFilled(field: keyof typeof filled, value: boolean) {
    setFilled((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const newErrors: { email?: string; password?: string } = {};

    if (!email?.trim()) {
      newErrors.email = 'Field cannot be empty';
    }
    if (!password) {
      newErrors.password = 'Field cannot be empty';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setBannerStyle(positionBanner());
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setBannerStyle(positionBanner());
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div className={styles.loginErrorBanner} role="alert" style={bannerStyle}>
          {error}
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome back</h1>
        </div>

        {justSignedUp && (
          <div className={styles.successBanner} role="status">
            Account created! Log in to get started.
          </div>
        )}

        {justReset && (
          <div className={styles.successBanner} role="status">
            Password reset successful. Log in with your new password.
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <Input
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          required
          hideRequiredAsterisk
          className={styles.formInput}
          error={fieldErrors.email}
          onFocus={() => setError(null)}
          onChange={(e) => {
            if (e.target.value) {
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }
          }}
          onBlur={(e) => {
            setFieldFilled('email', e.target.value.trim() !== '');
          }}
          style={filled.email ? filledStyle : undefined}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          hideRequiredAsterisk
          showPasswordToggle
          className={styles.formInput}
          error={fieldErrors.password}
          onFocus={() => setError(null)}
          onChange={(e) => {
            if (e.target.value) {
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }
          }}
          onBlur={(e) => {
            setFieldFilled('password', e.target.value !== '');
          }}
          style={filled.password ? filledStyle : undefined}
          labelAction={
            <Link href="/auth?mode=forgot-password" className={styles.forgotLink}>
              Forgot password?
            </Link>
          }
        />

        <Button type="submit" size="md" isLoading={isLoading} className={styles.submitBtn}>
          Log in
        </Button>
      </form>

      <p className={styles.footer}>
        Don&apos;t have an account?{' '}
        <Link href="/auth?mode=signup">Sign up</Link>
      </p>
      </div>
    </>
  );
}

function AuthContent() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const fromLanding = searchParams.get('from') === 'landing';

  if (mode === 'signup') return <SignupForm autoFocusName={fromLanding} />;
  if (mode === 'forgot-password') return <ForgotPasswordForm />;
  if (mode === 'reset-password') return <ResetPasswordForm token={searchParams.get('token') ?? ''} />;
  return <LoginForm />;
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthContent />
    </Suspense>
  );
}
