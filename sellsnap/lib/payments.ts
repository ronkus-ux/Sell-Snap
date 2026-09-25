import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { revalidatePath } from 'next/cache';
import {
  notifySellerOfSale,
  sendBuyerReceipt,
  sendBuyerPaymentFailedEmail,
} from '@/lib/notifications';

export type PaymentEventInput = {
  event: string;
  orderId?: string | null;
  txRef?: string | null;
  gatewayReference?: string | null;
  status?: string | null;
  currency?: string | null;
  amountPaidKobo?: number | null;
  hashOk?: boolean | null;
  detail?: string | null;
};

/** Append-only audit write for payment events. Never surfaced to callers. */
export async function logPaymentEvent(input: PaymentEventInput): Promise<void> {
  try {
    await db.paymentEvent.create({
      data: {
        event: input.event,
        orderId: input.orderId ?? null,
        txRef: input.txRef ?? null,
        gatewayReference: input.gatewayReference ?? null,
        status: input.status ?? null,
        currency: input.currency ?? null,
        amountPaidKobo: input.amountPaidKobo ?? null,
        hashOk: input.hashOk ?? null,
        detail: input.detail ?? null,
      },
    });
  } catch (error) {
    logger.error('payments.payment-event-log-failed', { error, event: input.event });
  }
}

export async function fetchOrderForPayment(txRef: string) {
  return db.order.findUnique({
    where: { transactionReference: txRef },
    include: {
      product: {
        include: {
          user: {
            select: { id: true, name: true, email: true, businessName: true },
          },
        },
      },
    },
  });
}

export type OrderForPayment = NonNullable<Awaited<ReturnType<typeof fetchOrderForPayment>>>;

/** A normalized charge as returned by Flutterwave (major unit for amount). */
export type ChargeData = {
  id: number | string;
  status: string;
  currency: string;
  amount: number;
  tx_ref: string;
};

type MatchResult = { ok: true } | { ok: false; detail: string };

/**
 * Guards money-state changes: the order is only marked paid when Flutterwave
 * says the charge is successful, in NGN, for at least the full price, and the
 * reference matches the order this confirmation is about.
 */
export function chargeMatchesOrder(order: OrderForPayment, charge: ChargeData): MatchResult {
  const paidKobo = Math.round(charge.amount * 100);
  if (charge.status !== 'successful') {
    return { ok: false, detail: `charge status "${charge.status}"` };
  }
  if (charge.currency !== 'NGN') {
    return { ok: false, detail: `currency "${charge.currency}"` };
  }
  if (paidKobo < order.amount) {
    return { ok: false, detail: `paid ${paidKobo} kobo, expected at least ${order.amount} kobo` };
  }
  if (charge.tx_ref !== order.transactionReference) {
    return { ok: false, detail: 'transaction reference mismatch' };
  }
  return { ok: true };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}

export type ConfirmSource = 'webhook' | 'verify';

/**
 * Marks the order paid and records the Payment + audit row, then fires the
 * sale alert + buyer receipt. Idempotent: a concurrent webhook (or the
 * return-URL verification) hitting the same gateway reference is swallowed as
 * a duplicate instead of double-confirming or double-emailing.
 *
 * Returns 'paid' | 'duplicate' | 'invalid'. Throws only on real failures.
 */
export async function confirmOrderPaid(
  order: OrderForPayment,
  charge: ChargeData,
  source: ConfirmSource
): Promise<'paid' | 'duplicate' | 'invalid'> {
  const match = chargeMatchesOrder(order, charge);
  if (!match.ok) {
    logger.warn(`${source}.verification-mismatch`, {
      orderId: order.id,
      txRef: order.transactionReference,
      detail: match.detail,
    });
    await logPaymentEvent({
      event: `${source}.verification-mismatch`,
      orderId: order.id,
      txRef: order.transactionReference,
      gatewayReference: String(charge.id),
      status: charge.status,
      currency: charge.currency,
      amountPaidKobo: Math.round(charge.amount * 100),
      hashOk: source === 'webhook' ? true : null,
      detail: match.detail,
    });
    return 'invalid';
  }

  const paidKobo = Math.round(charge.amount * 100);

  try {
    await db.$transaction([
      db.order.update({
        where: { id: order.id },
        data: { status: 'paid' },
      }),
      db.payment.create({
        data: {
          orderId: order.id,
          gatewayReference: String(charge.id),
          status: 'successful',
          amountKobo: paidKobo,
          paidAt: new Date(),
        },
      }),
      db.paymentEvent.create({
        data: {
          event: `${source}.order-paid`,
          orderId: order.id,
          txRef: order.transactionReference,
          gatewayReference: String(charge.id),
          status: charge.status,
          currency: charge.currency,
          amountPaidKobo: paidKobo,
          hashOk: source === 'webhook' ? true : null,
          detail: 'order marked paid after successful verification',
        },
      }),
    ]);
  } catch (error: unknown) {
    if (isUniqueViolation(error)) {
      logger.info(`${source}.duplicate-ignored`, {
        orderId: order.id,
        txRef: order.transactionReference,
      });
      await logPaymentEvent({
        event: `${source}.duplicate-ignored`,
        orderId: order.id,
        txRef: order.transactionReference,
        gatewayReference: String(charge.id),
        status: charge.status,
        currency: charge.currency,
        amountPaidKobo: paidKobo,
        hashOk: source === 'webhook' ? true : null,
        detail: 'payment already processed for this order',
      });
      return 'duplicate';
    }

    logger.error(`${source}.processing-failed`, { error, orderId: order.id });
    await logPaymentEvent({
      event: `${source}.processing-failed`,
      orderId: order.id,
      txRef: order.transactionReference,
      gatewayReference: String(charge.id),
      hashOk: source === 'webhook' ? true : null,
      detail: error instanceof Error ? error.message : 'unknown processing error',
    });
    throw error;
  }

  logger.info(`${source}.order-paid`, {
    orderId: order.id,
    productId: order.productId,
    sellerId: order.product.user.id,
  });

  revalidatePath('/orders');
  revalidatePath('/dashboard');

  // Best-effort notifications, sent in parallel. Neither failure ever affects
  // money state (already committed above).
  await Promise.allSettled([
    notifySellerOfSale({
      sellerEmail: order.product.user.email,
      sellerName: order.product.user.name,
      businessName: order.product.user.businessName,
      productName: order.product.name,
      amountKobo: order.amount,
      buyerEmail: order.buyerEmail,
      buyerName: order.buyerName,
      orderId: order.id,
      transactionReference: order.transactionReference,
    }),
    order.buyerEmail
      ? sendBuyerReceipt({
          buyerEmail: order.buyerEmail,
          buyerName: order.buyerName,
          businessName: order.product.user.businessName,
          productName: order.product.name,
          amountKobo: order.amount,
          transactionReference: order.transactionReference,
          orderId: order.id,
        })
      : Promise.resolve(),
  ]);

  return 'paid';
}

/**
 * Marks a still-pending order as failed for a definite non-successful charge
 * and sends the buyer a retry link. Paid/duplicate states are never touched.
 */
export async function confirmOrderFailed(
  order: OrderForPayment,
  charge: ChargeData,
  source: ConfirmSource
): Promise<'failed' | 'unchanged'> {
  if (order.status !== 'pending') return 'unchanged';

  await db.order.update({
    where: { id: order.id },
    data: { status: 'failed' },
  });
  await logPaymentEvent({
    event: `${source}.order-failed`,
    orderId: order.id,
    txRef: order.transactionReference,
    gatewayReference: String(charge.id),
    status: charge.status,
    currency: charge.currency,
    amountPaidKobo: Math.round(charge.amount * 100),
    hashOk: source === 'webhook' ? true : null,
    detail: `order marked failed after non-successful transaction "${charge.status}"`,
  });

  if (order.buyerEmail) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    await sendBuyerPaymentFailedEmail({
      buyerEmail: order.buyerEmail,
      buyerName: order.buyerName,
      productName: order.product.name,
      businessName: order.product.user.businessName,
      retryUrl: `${appUrl}/p/${order.product.uniqueSlug}`,
    });
  }

  revalidatePath('/orders');
  revalidatePath('/dashboard');

  return 'failed';
}