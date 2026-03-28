import { v4 as uuidv4 } from "uuid";
import type { Order, OrderEvent, OrderStatusType } from "../types/index.js";

export const TOPICS = {
  ORDER_PLACED: "order.placed",
  ORDER_STATUS_CHANGED: "order.status-changed",
} as const;

export function buildOrderPlacedEvent(order: Order): OrderEvent {
  return {
    eventId: uuidv4(),
    eventType: "order.placed",
    orderId: order.id,
    timestamp: new Date().toISOString(),
    payload: {
      customerId: order.customerId,
      restaurantId: order.restaurantId,
      items: order.items,
      totalAmount: order.totalAmount,
      deliveryAddress: order.deliveryAddress,
    },
  };
}

export function buildOrderStatusChangedEvent(
  order: Order,
  previousStatus: OrderStatusType,
  actorId: string,
  reason?: string,
): OrderEvent {
  return {
    eventId: uuidv4(),
    eventType: "order.status-changed",
    orderId: order.id,
    timestamp: new Date().toISOString(),
    payload: {
      previousStatus,
      currentStatus: order.status,
      actorId,
      reason: reason ?? null,
      customerId: order.customerId,
      restaurantId: order.restaurantId,
    },
  };
}
