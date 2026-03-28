import { apiClient } from '../client';

export type PaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripePaymentIntentId: string | null;
  idempotencyKey: string;
  refundedAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentInput {
  orderId: string;
  customerId: string;
  amount: number;
  paymentMethodId: string;
  idempotencyKey: string;
  currency?: string;
}

export interface RefundPaymentInput {
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

export interface Card {
  id: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export interface AddCardInput {
  paymentMethodId: string;
  setDefault?: boolean;
}

export const paymentApi = {
  createPayment: (input: CreatePaymentInput) =>
    apiClient.post<Payment>('/payments', input).then((r) => r.data),

  getPayments: (orderId: string) =>
    apiClient
      .get<Payment[]>(`/payments/order/${encodeURIComponent(orderId)}`)
      .then((r) => r.data),

  refundPayment: (id: string, input?: RefundPaymentInput) =>
    apiClient
      .post<Payment>(`/payments/${encodeURIComponent(id)}/refund`, input)
      .then((r) => r.data),

  getCards: () =>
    apiClient.get<Card[]>('/payments/cards').then((r) => r.data),

  addCard: (input: AddCardInput) =>
    apiClient.post<Card>('/payments/cards', input).then((r) => r.data),

  deleteCard: (id: string) =>
    apiClient.delete<void>(`/payments/cards/${encodeURIComponent(id)}`).then((r) => r.data),
};