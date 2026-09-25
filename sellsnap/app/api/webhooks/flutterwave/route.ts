import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { verifyTransaction } from '@/lib/flutterwave';
import {
  confirmOrderFailed,
  confirmOrderPaid,
  fetchOrderForPayment,
  logPaymentEvent,
} from '@/lib/payments';

const webhookSchema = z.object({
  event: z.string(),
  data: z.object({
    // Flutterwave's hosted checkout historically sends these as strings
    // (e.g. "10484778", "4500"). Accept both and normalize with Number() below.
    id: z.union([z.number(), z.string()]),
    tx_ref: z.string(),
    status: z.string(),
    currency: z.string(),
    amount: z.union([z.number(), z.string()]),
    customer: z
      .object({
        email: z.string().optional(),
        name: z.string().optional(),
      })
      .optional()
      .nullable(),
  }),
});

export async function POST(req: NextRequest) {
  const incomingHash = req.headers.get('verif-hash');
  const expectedHash = process.env.FLW_SECRET_HASH;

  // Constant-time comparison — plain === on strings leaks timing information
  // that could, in theory, be used to guess the secret hash character by character.
  const incomingBuf = Buffer.from(incomingHash ?? '', 'utf8');
  const expectedBuf = Buffer.from(expectedHash ?? '', 'utf8');
  const hashOk =
    incomingBuf.length > 0 &&
    incomingBuf.length === expectedBuf.length &&
    timingSafeEqual(incomingBuf, expectedBuf);

  if (!hashOk) {
    logger.warn('webhook.flutterwave.invalid-hash', {
      hashPresent: !!incomingHash,
      hashLength: incomingHash ? incomingHash.length : 0,
      expectedHashLength: expectedHash ? expectedHash.length : 0,
      hashMatches: hashOk,
    });
    await logPaymentEvent({
      event: 'webhook.invalid-hash',
      hashOk: false,
      detail: incomingHash
        ? `hash length ${incomingHash.length} vs expected ${expectedHash?.length}`
        : 'missing verif-hash header',
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    await logPaymentEvent({ event: 'webhook.invalid-json', hashOk: true, detail: 'request body was not valid JSON' });
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    logger.warn('webhook.flutterwave.invalid-payload', {
      errors: parsed.error.issues.map((e) => e.message),
    });
    await logPaymentEvent({
      event: 'webhook.invalid-payload',
      hashOk: true,
      detail: parsed.error.issues.map((e) => e.message).join('; '),
    });
    return NextResponse.json({ received: true });
  }

  const { data: webhookData } = parsed.data;
  const normalizedAmount = Number(webhookData.amount);

  if (webhookData.status !== 'successful') {
    logger.info('webhook.flutterwave.non-successful', {
      txRef: webhookData.tx_ref,
      status: webhookData.status,
    });
    await logPaymentEvent({
      event: 'webhook.non-successful',
      txRef: webhookData.tx_ref,
      status: webhookData.status,
      currency: webhookData.currency,
      amountPaidKobo: Math.round(normalizedAmount * 100),
      hashOk: true,
      gatewayReference: String(webhookData.id),
      detail: `transaction status "${webhookData.status}"`,
    });

    // A non-successful status means that transaction attempt is dead. Flip a
    // still-pending order to failed so the dashboard reflects reality, and
    // give the buyer a retry link (only if they left an email). Paid orders
    // and already-failed orders are never touched again.
    const order = await fetchOrderForPayment(webhookData.tx_ref);
    if (order) {
      await confirmOrderFailed(
        order,
        {
          id: webhookData.id,
          status: webhookData.status,
          currency: webhookData.currency,
          amount: normalizedAmount,
          tx_ref: webhookData.tx_ref,
        },
        'webhook'
      );
    }

    return NextResponse.json({ received: true });
  }

  const verifyResult = await verifyTransaction(Number(webhookData.id));
  if (!verifyResult.ok) {
    logger.error('webhook.flutterwave.verify-failed', {
      transactionId: webhookData.id,
      error: verifyResult.error,
    });
    await logPaymentEvent({
      event: 'webhook.verify-failed',
      txRef: webhookData.tx_ref,
      gatewayReference: String(webhookData.id),
      hashOk: true,
      detail: verifyResult.error,
    });
    return NextResponse.json({ received: true });
  }

  const txData = verifyResult.data;

  const order = await fetchOrderForPayment(webhookData.tx_ref);
  if (!order) {
    logger.warn('webhook.flutterwave.order-not-found', { txRef: webhookData.tx_ref });
    await logPaymentEvent({
      event: 'webhook.order-not-found',
      txRef: webhookData.tx_ref,
      gatewayReference: String(webhookData.id),
      hashOk: true,
      detail: 'no order matched the transaction reference',
    });
    return NextResponse.json({ received: true });
  }

  try {
    await confirmOrderPaid(
      order,
      {
        id: txData.id,
        status: txData.status,
        currency: txData.currency,
        amount: txData.amount,
        tx_ref: txData.tx_ref,
      },
      'webhook'
    );
  } catch (error: unknown) {
    logger.error('webhook.flutterwave.processing-failed', { error, orderId: order.id });
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}