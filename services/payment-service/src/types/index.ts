export const PaymentStatus = {
  PENDING: "pending",
  AUTHORIZED: "authorized",
  CAPTURED: "captured",
  FAILED: "failed",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
} as const;

export type PaymentStatusType =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];

export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: PaymentStatusType;
  stripePaymentIntentId: string | null;
  idempotencyKey: string;
  refundedAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentInput {
  orderId: string;
  customerId: string;
  amount: number;
  currency?: string;
  paymentMethodId: string;
  idempotencyKey: string;
}

export interface CapturePaymentInput {
  amountToCapture?: number;
}

export interface RefundPaymentInput {
  amount?: number;
  reason?: string;
}

export interface PaymentRow {
  id: string;
  order_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  status: string;
  stripe_payment_intent_id: string | null;
  idempotency_key: string;
  refunded_amount: number;
  created_at: Date;
  updated_at: Date;
}
