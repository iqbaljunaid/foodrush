import Stripe from 'stripe';
import type { AppConfig } from '../config.js';

let stripeClient: Stripe | null = null;

export function initStripeClient(config: AppConfig['stripe']): Stripe {
  stripeClient = new Stripe(config.secretKey, {
    apiVersion: config.apiVersion as Stripe.LatestApiVersion,
    typescript: true,
  });
  return stripeClient;
}

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    throw new Error('Stripe client not initialized. Call initStripeClient() first.');
  }
  return stripeClient;
}

export async function createPaymentIntent(
  amount: number,
  currency: string,
  paymentMethodId: string,
  idempotencyKey: string,
  metadata: Record<string, string>,
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient();
  return stripe.paymentIntents.create(
    {
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      payment_method: paymentMethodId,
      confirm: true,
      capture_method: 'manual',
      metadata,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
    },
    { idempotencyKey },
  );
}

export async function capturePaymentIntent(
  paymentIntentId: string,
  amountToCapture?: number,
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient();
  return stripe.paymentIntents.capture(paymentIntentId, {
    amount_to_capture: amountToCapture ? Math.round(amountToCapture * 100) : undefined,
  });
}

export async function createRefund(
  paymentIntentId: string,
  amount?: number,
  reason?: string,
): Promise<Stripe.Refund> {
  const stripe = getStripeClient();
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount ? Math.round(amount * 100) : undefined,
    reason: reason as Stripe.RefundCreateParams.Reason | undefined,
  });
}

export async function retrievePaymentIntent(
  paymentIntentId: string,
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient();
  return stripe.paymentIntents.retrieve(paymentIntentId);
}
