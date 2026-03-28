import type { Order, OrderRow, OrderItem } from '../types/index.js';
import type { OrderStatusType } from '../types/index.js';

export function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    customerId: row.customer_id,
    restaurantId: row.restaurant_id,
    items: JSON.parse(row.items) as OrderItem[],
    status: row.status as OrderStatusType,
    totalAmount: parseFloat(row.total_amount),
    deliveryAddress: row.delivery_address,
    notes: row.notes,
    courierId: row.courier_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function calculateTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}
