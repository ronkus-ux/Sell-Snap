import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SellSnap — Sell Anything With Just a Link',
    template: '%s | SellSnap',
  },
  description:
    'SellSnap lets Nigerian small business owners sell any product instantly by sharing a unique payment link on WhatsApp or Instagram. No website needed.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://sellsnap.app'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
