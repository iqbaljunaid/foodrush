export const OrderStatus = {
  PLACED: 'placed',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  PICKED_UP: 'picked_up',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

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
  status: OrderStatusType;
  totalAmount: number;
  deliveryAddress: string;
  notes: string | null;
  courierId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderInput {
  customerId: string;
  restaurantId: string;
  items: OrderItem[];
  deliveryAddress: string;
  notes?: string;
}

export interface TransitionInput {
  orderId: string;
  toStatus: OrderStatusType;
  actorId: string;
  reason?: string;
}

export interface OrderEvent {
  eventId: string;
  eventType: string;
  orderId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface OrderRow {
  id: string;
  customer_id: string;
  restaurant_id: string;
  items: string;
  status: string;
  total_amount: string;
  delivery_address: string;
  notes: string | null;
  courier_id: string | null;
  created_at: Date;
  updated_at: Date;
}
