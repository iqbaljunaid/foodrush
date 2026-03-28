export interface CourierLocationEvent {
  courierId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  timestamp: string;
}

export interface OrderTrackingEvent {
  orderId: string;
  courierId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  estimatedDeliveryMinutes: number;
  timestamp: string;
}

export type OrderStatusValue =
  | 'placed'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';

export interface OrderStatusChangedEvent {
  orderId: string;
  previousStatus: OrderStatusValue;
  newStatus: OrderStatusValue;
  actorId: string;
  reason: string | null;
  timestamp: string;
}

export interface CourierAssignedEvent {
  orderId: string;
  courierId: string;
  courierName: string;
  courierPhone: string;
  estimatedPickupMinutes: number;
  estimatedDeliveryMinutes: number;
  timestamp: string;
}

export interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  timestamp: string;
}