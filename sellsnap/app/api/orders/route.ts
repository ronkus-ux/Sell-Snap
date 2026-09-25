import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { createPaymentLink } from '@/lib/flutterwave';
import { checkRateLimit } from '@/lib/rate-limit';
import { env } from '@/lib/env';
import { nanoid } from 'nanoid';

const inputSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  buyerEmail: z.string().email().optional(),
  buyerName: z.string().min(1).max(100).optional(),
});

type Success<T> = { ok: true; data: T };
type Failure = { ok: false; error: { code: string; message: string } };

export async function POST(req: NextRequest) {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const ip =
    forwardedFor?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const rateLimit = await checkRateLimit('order.create', ip);
  if (!rateLimit.allowed) {
    return NextResponse.json<Failure>(
      { ok: false, error: { code: 'rate_limited', message: 'Too many requests. Please try again shortly.' } },
      { status: 429 }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = inputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<Failure>(
        { ok: false, error: { code: 'invalid_input', message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { productId, buyerEmail, buyerName } = parsed.data;

    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        user: {
          select: { id: true, businessName: true, email: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json<Failure>(
        { ok: false, error: { code: 'not_found', message: 'Product not found.' } },
        { status: 404 }
      );
    }

    if (product.price <= 0 || !Number.isInteger(product.price)) {
      return NextResponse.json<Failure>(
        { ok: false, error: { code: 'invalid_price', message: 'This product is not available for purchase.' } },
        { status: 422 }
      );
    }

    const txRef = `sellsnap_order_${nanoid(12)}`;

    const order = await db.order.create({
      data: {
        productId: product.id,
        buyerEmail: buyerEmail ?? null,
        buyerName: buyerName ?? null,
        amount: product.price,
        status: 'pending',
        transactionReference: txRef,
      },
    });

    logger.info('order.created', { orderId: order.id, productId: product.id });

    const paymentResult = await createPaymentLink({
      txRef,
      amountKobo: product.price,
      buyerEmail: buyerEmail ?? 'customer@email.com',
      buyerName: buyerName ?? 'Customer',
      productName: product.name,
      businessName: product.user.businessName,
      productSlug: product.uniqueSlug,
      orderId: order.id,
      productId: product.id,
      sellerId: product.user.id,
      // Server-only base for the webhook: NEXT_SERVER_APP_URL overrides the
      // public NEXT_PUBLIC_APP_URL so webhooks can never silently route to a
      // localhost or misconfigured public origin. Falls back to the public URL
      // which is asserted non-localhost in production for exactly this reason.
      webhookUrl: `${env.NEXT_SERVER_APP_URL ?? env.NEXT_PUBLIC_APP_URL}/api/webhooks/flutterwave`,
    });

    if (!paymentResult.ok) {
      await db.order.update({
        where: { id: order.id },
        data: { status: 'failed' },
      });

      return NextResponse.json<Failure>(
        { ok: false, error: { code: 'payment_init_failed', message: paymentResult.error } },
        { status: 502 }
      );
    }

    return NextResponse.json<Success<{ checkoutUrl: string; orderId: string }>>({
      ok: true,
      data: {
        checkoutUrl: paymentResult.checkoutUrl,
        orderId: order.id,
      },
    });
  } catch (error) {
    logger.error('api.orders.create.failed', { error });
    return NextResponse.json<Failure>(
      { ok: false, error: { code: 'server_error', message: 'Something went wrong. Please try again.' } },
      { status: 500 }
    );
  }
}
