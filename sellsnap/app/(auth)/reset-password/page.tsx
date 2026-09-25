import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function ResetPasswordRedirectPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const tokenValue = typeof token === 'string' ? token : '';

  redirect(`/auth?mode=reset-password&token=${encodeURIComponent(tokenValue)}`);
}
