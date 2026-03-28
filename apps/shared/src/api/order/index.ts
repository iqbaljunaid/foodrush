import { apiClient } from '../client';

export type OrderStatus =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  deliveryAddress: string;
  notes: string | null;
  courierId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  customerId: string;
  restaurantId: string;
  items: OrderItem[];
  deliveryAddress: string;
  notes?: string;
}

export interface TransitionInput {
  status: OrderStatus;
  actorId: string;
  reason?: string;
}

export interface RateOrderInput {
  foodRating: number;
  courierRating: number;
  comment?: string;
  tip?: number;
}

export interface ListOrdersParams {
  customerId: string;
  limit?: number;
  offset?: number;
}

export const orderApi = {
  createOrder: (input: CreateOrderInput) =>
    apiClient.post<Order>('/orders', input).then((r) => r.data),

  getOrder: (id: string) =>
    apiClient.get<Order>(`/orders/${encodeURIComponent(id)}`).then((r) => r.data),

  getOrders: (params: ListOrdersParams) =>
    apiClient.get<Order[]>('/orders', { params }).then((r) => r.data),

  updateOrderStatus: (id: string, input: TransitionInput) =>
    apiClient.patch<Order>(`/orders/${encodeURIComponent(id)}/status`, input).then((r) => r.data),

  rateOrder: (id: string, input: RateOrderInput) =>
    apiClient.post<void>(`/orders/${encodeURIComponent(id)}/rating`, input).then((r) => r.data),
};