import { OrderStatus, type OrderStatusType } from "../types/index.js";

/**
 * Valid FSM transitions for an order.
 *
 * placed → accepted → preparing → ready → picked_up → delivered
 *   ↓          ↓           ↓
 * cancelled  cancelled   cancelled
 */
const TRANSITIONS: ReadonlyMap<
  OrderStatusType,
  ReadonlySet<OrderStatusType>
> = new Map([
  [OrderStatus.PLACED, new Set([OrderStatus.ACCEPTED, OrderStatus.CANCELLED])],
  [
    OrderStatus.ACCEPTED,
    new Set([OrderStatus.PREPARING, OrderStatus.CANCELLED]),
  ],
  [OrderStatus.PREPARING, new Set([OrderStatus.READY, OrderStatus.CANCELLED])],
  [OrderStatus.READY, new Set([OrderStatus.PICKED_UP])],
  [OrderStatus.PICKED_UP, new Set([OrderStatus.DELIVERED])],
  [OrderStatus.DELIVERED, new Set<OrderStatusType>()],
  [OrderStatus.CANCELLED, new Set<OrderStatusType>()],
]);

export function canTransition(
  from: OrderStatusType,
  to: OrderStatusType,
): boolean {
  const allowed = TRANSITIONS.get(from);
  if (!allowed) {
    return false;
  }
  return allowed.has(to);
}

export function getValidTransitions(
  from: OrderStatusType,
): readonly OrderStatusType[] {
  const allowed = TRANSITIONS.get(from);
  if (!allowed) {
    return [];
  }
  return [...allowed];
}

export function validateTransition(
  from: OrderStatusType,
  to: OrderStatusType,
): void {
  if (!canTransition(from, to)) {
    const valid = getValidTransitions(from);
    throw new InvalidTransitionError(
      from,
      to,
      `Invalid transition from '${from}' to '${to}'. Valid transitions: [${valid.join(", ")}]`,
    );
  }
}

export class InvalidTransitionError extends Error {
  public readonly from: OrderStatusType;
  public readonly to: OrderStatusType;

  constructor(from: OrderStatusType, to: OrderStatusType, message: string) {
    super(message);
    this.name = "InvalidTransitionError";
    this.from = from;
    this.to = to;
  }
}
