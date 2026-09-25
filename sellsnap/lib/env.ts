import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  FLW_SECRET_KEY: z.string().min(1, 'FLW_SECRET_KEY is required'),
  FLW_PUBLIC_KEY: z.string().min(1, 'FLW_PUBLIC_KEY is required'),
  FLW_SECRET_HASH: z.string().min(1, 'FLW_SECRET_HASH is required'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  BLOB_READ_WRITE_TOKEN: z.string().min(1, 'BLOB_READ_WRITE_TOKEN is required'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  // Optional server-only override for outbound server→server URLs (e.g. the
  // Flutterwave webhook). Kept separate from NEXT_PUBLIC_APP_URL so services
  // can always target a reachable server origin even if the public URL points
  // at a CDN/edge or a local tunnel during development.
  NEXT_SERVER_APP_URL: z
    .string()
    .url('NEXT_SERVER_APP_URL must be a valid URL')
    .optional(),
  // Optional sender override. Default: 'onboarding@resend.dev' (lists until a
  // real domain is verified in Resend). Set to 'Name <you@yourdomain.com>'
  // once a domain is configured.
  EMAIL_FROM: z.string().min(1, 'EMAIL_FROM must not be empty').optional(),
});

type Env = z.infer<typeof envSchema>;

const isLocalHost = (value: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)([:/]|$)/i.test(value);

function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n');
    throw new Error(`❌ Missing or invalid environment variables:\n${messages}`);
  }

  if (process.env.NODE_ENV === 'production') {
    const origins = [parsed.data.NEXT_SERVER_APP_URL, parsed.data.NEXT_PUBLIC_APP_URL].filter(
      (value): value is string => Boolean(value)
    );
    if (origins.some(isLocalHost)) {
      throw new Error(
        '❌ NEXT_PUBLIC_APP_URL (and NEXT_SERVER_APP_URL, if set) must not point to localhost in production — webhooks and server-side notifications would silently target an unreachable origin.'
      );
    }
  }

  return parsed.data;
}

export const env = validateEnv();
