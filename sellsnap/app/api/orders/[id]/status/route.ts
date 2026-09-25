import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyTransactionByRef } from '@/lib/flutterwave';
import {
  confirmOrderFailed,
  confirmOrderPaid,
  fetchOrderForPayment,
} from '@/lib/payments';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const txRef = req.nextUrl.searchParams.get('tx_ref');

  const order = await db.order.findUnique({
    where: { id },
    include: {
      product: {
        select: { name: true, imageUrl: true, price: true },
      },
    },
  });

  // Order data is gated behind the transaction reference. Anyone guessing an
  // order id (or grabbing one from the URL) gets nothing unless they also know
  // the unique tx_ref — so the 404 is the same whether the order is missing or
  // the reference is wrong, without leaking that an order exists.
  if (!order || !txRef || order.transactionReference !== txRef) {
    return NextResponse.json(
      { ok: false, error: { code: 'not_found', message: 'Order not found.' } },
      { status: 404 }
    );
  }

  // Return-URL verification: while the order is still pending, ask Flutterwave
  // directly (by tx_ref) whether the charge settled. This confirms the buyer
  // instantly after redirect even if the webhook is delayed or misconfigured —
  // and it is idempotent against a concurrent webhook (gateway references are
  // unique, so only one path ever records the Payment and sends the emails).
  if (order.status === 'pending') {
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip =
      forwardedFor?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    // Guard the Flutterwave lookups against abuse. Under the limit we simply
    // skip verification and return the DB state (the webhook still settles it).
    const rateLimit = await checkRateLimit('order.status', ip);

    if (rateLimit.allowed) {
      const full = await fetchOrderForPayment(order.transactionReference);

      if (full) {
        const verifyResult = await verifyTransactionByRef(order.transactionReference);

        if (verifyResult.ok) {
          const d = verifyResult.data;
          const charge = {
            id: d.id,
            status: d.status,
            currency: d.currency,
            amount: d.amount,
            tx_ref: d.tx_ref,
          };

          if (d.status === 'successful') {
            await confirmOrderPaid(full, charge, 'verify');
          } else if (d.status !== 'new' && d.status !== 'pending') {
            // Terminal non-success statuses settle the order now. 'new' and
            // 'pending' mean Flutterwave hasn't finalised yet — keep waiting;
            // the next poll (or the webhook) settles it.
            await confirmOrderFailed(full, charge, 'verify');
          }
        } else {
          // Not finalised or unreachable yet — leave the order pending.
          logger.info('orders.status.verify-by-ref-unavailable', {
            orderId: id,
            error: verifyResult.error,
          });
        }
      }
    }
  }

  const fresh = await db.order.findUnique({
    where: { id },
    include: {
      product: {
        select: { name: true, imageUrl: true, price: true },
      },
    },
  });

  const current = fresh ?? order;

  return NextResponse.json({
    ok: true,
    data: {
      status: current.status,
      order: {
        id: current.id,
        transactionReference: current.transactionReference,
        amount: current.amount,
        createdAt: current.createdAt,
        product: current.product,
      },
    },
  });
}