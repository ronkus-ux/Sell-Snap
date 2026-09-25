import { Resend } from 'resend';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { formatNaira } from '@/lib/utils';

const resend = new Resend(process.env.RESEND_API_KEY);

// Single source of truth for the sender address. Defaults to Resend's free
// onboarding address (only delivers to the account owner's inbox — fine for
// testing). Override with EMAIL_FROM in .env.local (or a verified domain)
// before going live.
const EMAIL_FROM = env.EMAIL_FROM ?? 'onboarding@resend.dev';

type SaleNotificationParams = {
  sellerEmail: string;
  sellerName: string;
  businessName: string;
  productName: string;
  amountKobo: number;
  buyerEmail: string | null;
  buyerName: string | null;
  orderId: string;
  transactionReference: string;
};

/**
 * Sends a sale notification email to the seller via Resend.
 * This is called from the webhook handler AFTER the order is marked paid in the DB.
 * Errors are logged but do not affect the webhook response — email is best-effort.
 */
export async function notifySellerOfSale(params: SaleNotificationParams): Promise<void> {
  const {
    sellerEmail,
    sellerName,
    businessName,
    productName,
    amountKobo,
    buyerEmail,
    buyerName,
    orderId,
    transactionReference,
  } = params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const formattedAmount = formatNaira(amountKobo);
  const buyerDisplay = buyerName || buyerEmail || 'A customer';

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: sellerEmail,
      subject: `💰 You just made a sale — ${formattedAmount}!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; background: #f9fafb; margin: 0; padding: 24px;">
            <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="background: hsl(154, 100%, 42%); padding: 32px 24px; text-align: center;">
                <p style="color: white; font-size: 36px; margin: 0;">💰</p>
                <h1 style="color: white; font-size: 24px; font-weight: 700; margin: 8px 0 0;">You made a sale!</h1>
              </div>
              <div style="padding: 32px 24px;">
                <p style="color: #1c1c1e; font-size: 16px; margin: 0 0 24px;">Hi ${sellerName},</p>
                <p style="color: #1c1c1e; font-size: 16px; margin: 0 0 24px;">
                  ${buyerDisplay} just purchased <strong>${productName}</strong> from ${businessName}.
                </p>
                <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="color: #6c6c70; font-size: 14px; padding: 4px 0;">Product</td>
                      <td style="color: #1c1c1e; font-size: 14px; font-weight: 600; text-align: right;">${productName}</td>
                    </tr>
                    <tr>
                      <td style="color: #6c6c70; font-size: 14px; padding: 4px 0;">Amount</td>
                      <td style="color: hsl(154, 100%, 30%); font-size: 18px; font-weight: 700; text-align: right;">${formattedAmount}</td>
                    </tr>
                    ${buyerEmail ? `<tr>
                      <td style="color: #6c6c70; font-size: 14px; padding: 4px 0;">Buyer</td>
                      <td style="color: #1c1c1e; font-size: 14px; text-align: right;">${buyerEmail}</td>
                    </tr>` : ''}
                    <tr>
                      <td style="color: #6c6c70; font-size: 14px; padding: 4px 0;">Order ID</td>
                      <td style="color: #6c6c70; font-size: 12px; text-align: right;">${orderId.slice(0, 8)}</td>
                    </tr>
                    <tr>
                      <td style="color: #6c6c70; font-size: 14px; padding: 4px 0;">Transaction ref</td>
                      <td style="color: #6c6c70; font-size: 12px; text-align: right;">${transactionReference}</td>
                    </tr>
                  </table>
                </div>
                <a href="${appUrl}/orders" style="display: block; background: hsl(154, 100%, 42%); color: white; text-align: center; padding: 14px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">View in Dashboard</a>
              </div>
              <div style="padding: 16px 24px; border-top: 1px solid #f2f2f7; text-align: center;">
                <p style="color: #aeaeb2; font-size: 12px; margin: 0;">SellSnap — Sell anything with just a link</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    logger.info('notifications.seller-sale-email.sent', { orderId, sellerEmail });
  } catch (error) {
    // Email is best-effort — log and continue. Do not fail the webhook response.
    logger.error('notifications.seller-sale-email.failed', { orderId, error });
  }
}

/**
 * Sends a password reset email to the user containing a magic reset link.
 * Best-effort — errors are logged and swallowed by the caller.
 */
export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: 'Reset your SellSnap password',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; background: #f9fafb; margin: 0; padding: 24px;">
            <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="background: hsl(154, 100%, 42%); padding: 32px 24px; text-align: center;">
                <h1 style="color: white; font-size: 24px; font-weight: 700; margin: 0;">Reset your password</h1>
              </div>
              <div style="padding: 32px 24px;">
                <p style="color: #1c1c1e; font-size: 16px; margin: 0 0 24px;">Hi there,</p>
                <p style="color: #1c1c1e; font-size: 16px; margin: 0 0 24px;">
                  We received a request to reset your SellSnap password. Click the button below to set a new one.
                </p>
                <a href="${resetUrl}" style="display: block; background: hsl(154, 100%, 42%); color: white; text-align: center; padding: 14px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">Reset password</a>
                <p style="color: #6c6c70; font-size: 14px; margin: 24px 0 0;">
                  This link expires in 1 hour. If you didn&apos;t request this, you can safely ignore this email.
                </p>
              </div>
              <div style="padding: 16px 24px; border-top: 1px solid #f2f2f7; text-align: center;">
                <p style="color: #aeaeb2; font-size: 12px; margin: 0;">SellSnap — Sell anything with just a link</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    logger.info('notifications.password-reset-email.sent', { email });
  } catch (error) {
    logger.error('notifications.password-reset-email.failed', { email, error });
  }
}

type BuyerReceiptParams = {
  buyerEmail: string;
  buyerName: string | null;
  businessName: string;
  productName: string;
  amountKobo: number;
  transactionReference: string;
  orderId: string;
};

/**
 * Sends a purchase receipt to the buyer after their payment is confirmed.
 * Best-effort — errors are logged and swallowed, never surfaced to the webhook.
 */
export async function sendBuyerReceipt(params: BuyerReceiptParams): Promise<void> {
  const {
    buyerEmail,
    buyerName,
    businessName,
    productName,
    amountKobo,
    orderId,
  } = params;

  const formattedAmount = formatNaira(amountKobo);
  const greeting = buyerName ? `Hi ${buyerName},` : 'Hi there,';

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: buyerEmail,
      subject: `Payment confirmed — ${productName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; background: #f9fafb; margin: 0; padding: 24px;">
            <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="background: hsl(154, 100%, 42%); padding: 32px 24px; text-align: center;">
                <p style="color: white; font-size: 36px; margin: 0;">✓</p>
                <h1 style="color: white; font-size: 24px; font-weight: 700; margin: 8px 0 0;">Payment confirmed</h1>
              </div>
              <div style="padding: 32px 24px;">
                <p style="color: #1c1c1e; font-size: 16px; margin: 0 0 24px;">${greeting}</p>
                <p style="color: #1c1c1e; font-size: 16px; margin: 0 0 24px;">
                  Thank you for buying from us! Your purchase of <strong>${productName}</strong> from ${businessName} was successful.
                  The seller has been notified and will contact you shortly.
                </p>
                <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="color: #6c6c70; font-size: 14px; padding: 4px 0;">Product</td>
                      <td style="color: #1c1c1e; font-size: 14px; font-weight: 600; text-align: right;">${productName}</td>
                    </tr>
                    <tr>
                      <td style="color: #6c6c70; font-size: 14px; padding: 4px 0;">Amount</td>
                      <td style="color: hsl(154, 100%, 30%); font-size: 18px; font-weight: 700; text-align: right;">${formattedAmount}</td>
                    </tr>
                    <tr>
                      <td style="color: #6c6c70; font-size: 14px; padding: 4px 0;">Order</td>
                      <td style="color: #6c6c70; font-size: 12px; text-align: right;">${orderId.slice(0, 8)}</td>
                    </tr>
                  </table>
                </div>
                <p style="color: #6c6c70; font-size: 14px; margin: 0;">
                  Questions? Reach out to the seller directly — they have your order details.
                </p>
              </div>
              <div style="padding: 16px 24px; border-top: 1px solid #f2f2f7; text-align: center;">
                <p style="color: #aeaeb2; font-size: 12px; margin: 0;">SellSnap — Sell anything with just a link</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    logger.info('notifications.buyer-receipt-email.sent', { orderId, buyerEmail });
  } catch (error) {
    logger.error('notifications.buyer-receipt-email.failed', { orderId, error });
  }
}

type WelcomeEmailParams = {
  email: string;
  name: string;
  businessName: string;
};

/**
 * Sends a welcome email to a newly registered seller.
 * Best-effort — errors are logged and swallowed, never surfaced to signup.
 */
export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<void> {
  const { email, name, businessName } = params;
  const firstName = name.split(' ')[0];

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `Welcome to SellSnap, ${firstName}!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; background: #f9fafb; margin: 0; padding: 24px;">
            <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="background: hsl(154, 100%, 42%); padding: 32px 24px; text-align: center;">
                <p style="color: white; font-size: 36px; margin: 0;">🎉</p>
                <h1 style="color: white; font-size: 24px; font-weight: 700; margin: 8px 0 0;">Welcome to SellSnap!</h1>
              </div>
              <div style="padding: 32px 24px;">
                <p style="color: #1c1c1e; font-size: 16px; margin: 0 0 24px;">Hi ${firstName},</p>
                <p style="color: #1c1c1e; font-size: 16px; margin: 0 0 24px;">
                  Your store <strong>${businessName}</strong> is ready. Sell anything in seconds — no website needed,
                  just a link you can share on WhatsApp or Instagram.
                </p>
                <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
                  <p style="color: #1c1c1e; font-size: 14px; font-weight: 600; margin: 0 0 8px;">Here&apos;s how it works:</p>
                  <p style="color: #6c6c70; font-size: 14px; margin: 0 0 6px;">1. Create your first product</p>
                  <p style="color: #6c6c70; font-size: 14px; margin: 0 0 6px;">2. Get a unique payment link</p>
                  <p style="color: #6c6c70; font-size: 14px; margin: 0;">3. Share it and get paid instantly</p>
                </div>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: block; background: hsl(154, 100%, 42%); color: white; text-align: center; padding: 14px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">Go to your dashboard</a>
              </div>
              <div style="padding: 16px 24px; border-top: 1px solid #f2f2f7; text-align: center;">
                <p style="color: #aeaeb2; font-size: 12px; margin: 0;">SellSnap — Sell anything with just a link</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    logger.info('notifications.welcome-email.sent', { email });
  } catch (error) {
    logger.error('notifications.welcome-email.failed', { email, error });
  }
}

type BuyerPaymentFailedParams = {
  buyerEmail: string;
  buyerName: string | null;
  productName: string;
  businessName: string;
  retryUrl: string;
};

/**
 * Sends a "payment didn't go through" email to the buyer with a retry link.
 * Best-effort — errors are logged and swallowed, never surfaced to the webhook.
 */
export async function sendBuyerPaymentFailedEmail(params: BuyerPaymentFailedParams): Promise<void> {
  const { buyerEmail, buyerName, productName, businessName, retryUrl } = params;
  const greeting = buyerName ? `Hi ${buyerName},` : 'Hi there,';

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: buyerEmail,
      subject: `Your payment for ${productName} didn't go through`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          </head>
          <body style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; background: #f9fafb; margin: 0; padding: 24px;">
            <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="background: hsl(0, 100%, 30%); padding: 32px 24px; text-align: center;">
                <p style="color: white; font-size: 36px; margin: 0;">!</p>
                <h1 style="color: white; font-size: 24px; font-weight: 700; margin: 8px 0 0;">Payment didn&apos;t go through</h1>
              </div>
              <div style="padding: 32px 24px;">
                <p style="color: #1c1c1e; font-size: 16px; margin: 0 0 24px;">${greeting}</p>
                <p style="color: #1c1c1e; font-size: 16px; margin: 0 0 24px;">
                  Your payment for <strong>${productName}</strong> from ${businessName} wasn&apos;t completed.
                  Your card was not charged.
                </p>
                <p style="color: #1c1c1e; font-size: 16px; margin: 0 0 24px;">
                  You can try again below if you&apos;d still like to complete your purchase.
                </p>
                <a href="${retryUrl}" style="display: block; background: hsl(154, 100%, 42%); color: white; text-align: center; padding: 14px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">Try again</a>
              </div>
              <div style="padding: 16px 24px; border-top: 1px solid #f2f2f7; text-align: center;">
                <p style="color: #aeaeb2; font-size: 12px; margin: 0;">SellSnap — Sell anything with just a link</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    logger.info('notifications.buyer-failed-email.sent', { buyerEmail });
  } catch (error) {
    logger.error('notifications.buyer-failed-email.failed', { buyerEmail, error });
  }
}
