import { logger } from '@/lib/logger';

const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

type CreatePaymentLinkParams = {
  txRef: string;
  amountKobo: number;
  buyerEmail: string;
  buyerName: string;
  productName: string;
  businessName: string;
  productSlug: string;
  orderId: string;
  productId: string;
  sellerId: string;
  webhookUrl: string;
};

type FlutterwavePaymentLinkResponse = {
  status: string;
  message: string;
  data: { link: string };
};

type FlutterwaveVerifyResponse = {
  status: string;
  message: string;
  data: {
    id: number;
    status: string;
    currency: string;
    amount: number; // Flutterwave returns amount in major unit (naira), not kobo
    tx_ref: string;
    flw_ref: string;
  };
};

/**
 * Creates a Flutterwave hosted checkout link.
 * NOTE: Flutterwave expects amount in major unit (naira), not kobo.
 * We divide by 100 here — this is the ONLY place we do that conversion for Flutterwave.
 */
export async function createPaymentLink(
  params: CreatePaymentLinkParams
): Promise<{ ok: true; checkoutUrl: string } | { ok: false; error: string }> {
  const {
    txRef,
    amountKobo,
    buyerEmail,
    buyerName,
    productName,
    businessName,
    productSlug,
    orderId,
    productId,
    sellerId,
    webhookUrl,
  } = params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const redirectUrl = `${appUrl}/p/${productSlug}/success?tx_ref=${txRef}&order_id=${orderId}`;

  try {
    const response = await fetch(`${FLW_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: amountKobo / 100, // Convert kobo → naira for Flutterwave
        currency: 'NGN',
        redirect_url: redirectUrl,
        webhook_url: webhookUrl,
        customer: {
          email: buyerEmail,
          name: buyerName,
        },
        customizations: {
          title: businessName,
          description: productName,
          logo: `${appUrl}/logo.png`,
        },
        meta: {
          order_id: orderId,
          product_id: productId,
          seller_id: sellerId,
        },
      }),
    });

    if (!response.ok) {
      const bodyText = await response.text();
      logger.error('flutterwave.create-payment-link.http-error', {
        status: response.status,
        body: bodyText.slice(0, 500),
      });
      return { ok: false, error: 'Could not initialize payment. Please try again.' };
    }

    const data: FlutterwavePaymentLinkResponse = await response.json();

    if (data.status !== 'success' || !data.data?.link) {
      logger.error('flutterwave.create-payment-link.bad-response', {
        status: data.status,
        message: data.message,
      });
      return { ok: false, error: 'Payment initialization failed. Please try again.' };
    }

    return { ok: true, checkoutUrl: data.data.link };
  } catch (error) {
    logger.error('flutterwave.create-payment-link.exception', { error });
    return { ok: false, error: 'Payment service unavailable. Please try again.' };
  }
}

/**
 * Verifies a transaction with Flutterwave's API after receiving a webhook.
 * This is mandatory — webhook signatures can be spoofed if the secret ever leaks.
 * Always verify the actual transaction via this API call.
 */
type VerifyResult =
  | { ok: true; data: FlutterwaveVerifyResponse['data'] }
  | { ok: false; error: string };

async function requestVerify(
  path: string,
  label?: string
): Promise<VerifyResult> {
  try {
    const response = await fetch(`${FLW_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
      },
    });

    if (!response.ok) {
      logger.error('flutterwave.verify-transaction.http-error', {
        target: label ?? path,
        status: response.status,
      });
      return { ok: false, error: `Transaction verification failed (HTTP ${response.status}).` };
    }

    const data: FlutterwaveVerifyResponse = await response.json();

    if (data.status !== 'success') {
      logger.error('flutterwave.verify-transaction.bad-status', {
        target: label ?? path,
        status: data.status,
        message: data.message,
      });
      return { ok: false, error: 'Transaction verification returned unexpected status.' };
    }

    return { ok: true, data: data.data };
  } catch (error) {
    logger.error('flutterwave.verify-transaction.exception', { target: label ?? path, error });
    return { ok: false, error: 'Transaction verification service unavailable.' };
  }
}

/**
 * Returns the Flutterwave Verify type.
 */
export function verifyTransaction(
  transactionId: number | string
): Promise<VerifyResult> {
  return requestVerify(`/transactions/${transactionId}/verify`, String(transactionId));
}

/**
 * Verifies a transaction by its unique tx_ref (used on the post-checkout
 * return-URL so buyers are confirmed even before the webhook arrives).
 */
export function verifyTransactionByRef(txRef: string): Promise<VerifyResult> {
  return requestVerify(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`, txRef);
}
