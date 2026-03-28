import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  getOrderServiceUrl,
  EventCollector,
  buildTestOrder,
  waitForEvents,
  type CreateOrderPayload,
  type CapturedEvent,
} from './setup.js';

const BASE_URL = getOrderServiceUrl();

const ORDER_TOPICS = {
  PLACED: 'order.placed',
  STATUS_CHANGED: 'order.status-changed',
} as const;

interface OrderResponse {
  id: string;
  customerId: string;
  restaurantId: string;
  items: Array<{ itemId: string; name: string; quantity: number; unitPrice: number }>;
  status: string;
  totalAmount: number;
  deliveryAddress: string;
  notes: string | null;
  courierId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ErrorResponse {
  error: string;
}

async function createOrder(payload: CreateOrderPayload): Promise<Response> {
  return fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function getOrder(orderId: string): Promise<Response> {
  return fetch(`${BASE_URL}/orders/${orderId}`);
}

async function transitionOrder(
  orderId: string,
  status: string,
  actorId: string,
  reason?: string,
): Promise<Response> {
  return fetch(`${BASE_URL}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, actorId, ...(reason ? { reason } : {}) }),
  });
}

describe('Order Lifecycle — End-to-End', () => {
  const collector = new EventCollector();
  const actorId = crypto.randomUUID();

  beforeAll(async () => {
    await collector.start([ORDER_TOPICS.PLACED, ORDER_TOPICS.STATUS_CHANGED]);
    // Wait for consumer group rebalance
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  });

  afterAll(async () => {
    await collector.stop();
  });

  beforeEach(() => {
    collector.clear();
  });

  describe('Health checks', () => {
    it('should pass liveness check', async () => {
      const res = await fetch(`${BASE_URL}/healthz`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string };
      expect(body.status).toBe('ok');
    });

    it('should pass readiness check', async () => {
      const res = await fetch(`${BASE_URL}/readyz`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status: string };
      expect(body.status).toBe('ready');
    });
  });

  describe('Order creation', () => {
    it('should create an order in placed status', async () => {
      const payload = buildTestOrder();
      const res = await createOrder(payload);

      expect(res.status).toBe(201);
      const order = (await res.json()) as OrderResponse;
      expect(order.id).toBeDefined();
      expect(order.status).toBe('placed');
      expect(order.customerId).toBe(payload.customerId);
      expect(order.restaurantId).toBe(payload.restaurantId);
      expect(order.items).toHaveLength(2);
      expect(order.totalAmount).toBeCloseTo(30.97, 2);
      expect(order.deliveryAddress).toBe(payload.deliveryAddress);
    });

    it('should publish order.placed event on creation', async () => {
      const payload = buildTestOrder();
      const res = await createOrder(payload);
      const order = (await res.json()) as OrderResponse;

      const events = await waitForEvents(collector, order.id, 1, ORDER_TOPICS.PLACED);
      expect(events).toHaveLength(1);

      const event = events[0] as CapturedEvent;
      expect(event.value['eventType']).toBe('order.placed');
      expect(event.value['orderId']).toBe(order.id);
      expect(event.headers['event-type']).toBe('order.placed');
    });

    it('should reject order with missing required fields', async () => {
      const res = await fetch(`${BASE_URL}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: crypto.randomUUID() }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Happy path: placed → accepted → preparing → ready → picked_up → delivered', () => {
    let orderId: string;

    it('step 1: create order (placed)', async () => {
      const res = await createOrder(buildTestOrder());
      expect(res.status).toBe(201);
      const order = (await res.json()) as OrderResponse;
      orderId = order.id;
      expect(order.status).toBe('placed');
    });

    it('step 2: placed → accepted', async () => {
      const res = await transitionOrder(orderId, 'accepted', actorId);
      expect(res.status).toBe(200);
      const order = (await res.json()) as OrderResponse;
      expect(order.status).toBe('accepted');
    });

    it('step 3: accepted → preparing', async () => {
      const res = await transitionOrder(orderId, 'preparing', actorId);
      expect(res.status).toBe(200);
      const order = (await res.json()) as OrderResponse;
      expect(order.status).toBe('preparing');
    });

    it('step 4: preparing → ready', async () => {
      const res = await transitionOrder(orderId, 'ready', actorId);
      expect(res.status).toBe(200);
      const order = (await res.json()) as OrderResponse;
      expect(order.status).toBe('ready');
    });

    it('step 5: ready → picked_up', async () => {
      const res = await transitionOrder(orderId, 'picked_up', actorId);
      expect(res.status).toBe(200);
      const order = (await res.json()) as OrderResponse;
      expect(order.status).toBe('picked_up');
    });

    it('step 6: picked_up → delivered', async () => {
      const res = await transitionOrder(orderId, 'delivered', actorId);
      expect(res.status).toBe(200);
      const order = (await res.json()) as OrderResponse;
      expect(order.status).toBe('delivered');
    });

    it('should have published status-changed events for all 5 transitions', async () => {
      const events = await waitForEvents(
        collector,
        orderId,
        5,
        ORDER_TOPICS.STATUS_CHANGED,
      );
      expect(events.length).toBeGreaterThanOrEqual(5);

      const transitions = events.map((e) => ({
        from: e.value['payload'] && typeof e.value['payload'] === 'object'
          ? (e.value['payload'] as Record<string, unknown>)['previousStatus']
          : undefined,
        to: e.value['payload'] && typeof e.value['payload'] === 'object'
          ? (e.value['payload'] as Record<string, unknown>)['currentStatus']
          : undefined,
      }));

      expect(transitions).toEqual(
        expect.arrayContaining([
          { from: 'placed', to: 'accepted' },
          { from: 'accepted', to: 'preparing' },
          { from: 'preparing', to: 'ready' },
          { from: 'ready', to: 'picked_up' },
          { from: 'picked_up', to: 'delivered' },
        ]),
      );
    });

    it('should reflect final delivered status via GET', async () => {
      const res = await getOrder(orderId);
      expect(res.status).toBe(200);
      const order = (await res.json()) as OrderResponse;
      expect(order.status).toBe('delivered');
    });
  });

  describe('Cancellation: placed → cancelled', () => {
    it('should cancel an order from placed status', async () => {
      const res = await createOrder(buildTestOrder());
      const order = (await res.json()) as OrderResponse;

      const cancelRes = await transitionOrder(
        order.id,
        'cancelled',
        actorId,
        'Customer changed mind',
      );
      expect(cancelRes.status).toBe(200);
      const cancelled = (await cancelRes.json()) as OrderResponse;
      expect(cancelled.status).toBe('cancelled');
    });

    it('should publish status-changed event for cancellation', async () => {
      const res = await createOrder(buildTestOrder());
      const order = (await res.json()) as OrderResponse;

      await transitionOrder(order.id, 'cancelled', actorId, 'Test cancel');

      const events = await waitForEvents(
        collector,
        order.id,
        1,
        ORDER_TOPICS.STATUS_CHANGED,
      );
      expect(events.length).toBeGreaterThanOrEqual(1);

      const cancelEvent = events.find((e) => {
        const payload = e.value['payload'] as Record<string, unknown> | undefined;
        return payload?.['currentStatus'] === 'cancelled';
      });
      expect(cancelEvent).toBeDefined();
    });
  });

  describe('Cancellation from other states', () => {
    it('should cancel from accepted', async () => {
      const res = await createOrder(buildTestOrder());
      const order = (await res.json()) as OrderResponse;
      await transitionOrder(order.id, 'accepted', actorId);

      const cancelRes = await transitionOrder(order.id, 'cancelled', actorId);
      expect(cancelRes.status).toBe(200);
      const cancelled = (await cancelRes.json()) as OrderResponse;
      expect(cancelled.status).toBe('cancelled');
    });

    it('should cancel from preparing', async () => {
      const res = await createOrder(buildTestOrder());
      const order = (await res.json()) as OrderResponse;
      await transitionOrder(order.id, 'accepted', actorId);
      await transitionOrder(order.id, 'preparing', actorId);

      const cancelRes = await transitionOrder(order.id, 'cancelled', actorId);
      expect(cancelRes.status).toBe(200);
      const cancelled = (await cancelRes.json()) as OrderResponse;
      expect(cancelled.status).toBe('cancelled');
    });
  });

  describe('Invalid transitions are rejected', () => {
    it('should reject placed → delivered (skipping states)', async () => {
      const res = await createOrder(buildTestOrder());
      const order = (await res.json()) as OrderResponse;

      const transRes = await transitionOrder(order.id, 'delivered', actorId);
      expect(transRes.status).toBe(409);
      const body = (await transRes.json()) as ErrorResponse;
      expect(body.error).toContain('Invalid transition');
    });

    it('should reject placed → preparing (skipping accepted)', async () => {
      const res = await createOrder(buildTestOrder());
      const order = (await res.json()) as OrderResponse;

      const transRes = await transitionOrder(order.id, 'preparing', actorId);
      expect(transRes.status).toBe(409);
    });

    it('should reject placed → ready', async () => {
      const res = await createOrder(buildTestOrder());
      const order = (await res.json()) as OrderResponse;

      const transRes = await transitionOrder(order.id, 'ready', actorId);
      expect(transRes.status).toBe(409);
    });

    it('should reject placed → picked_up', async () => {
      const res = await createOrder(buildTestOrder());
      const order = (await res.json()) as OrderResponse;

      const transRes = await transitionOrder(order.id, 'picked_up', actorId);
      expect(transRes.status).toBe(409);
    });

    it('should reject delivered → any state', async () => {
      const res = await createOrder(buildTestOrder());
      const order = (await res.json()) as OrderResponse;

      // Walk to delivered
      await transitionOrder(order.id, 'accepted', actorId);
      await transitionOrder(order.id, 'preparing', actorId);
      await transitionOrder(order.id, 'ready', actorId);
      await transitionOrder(order.id, 'picked_up', actorId);
      await transitionOrder(order.id, 'delivered', actorId);

      const transRes = await transitionOrder(order.id, 'placed', actorId);
      expect(transRes.status).toBe(409);
    });

    it('should reject cancelled → any state', async () => {
      const res = await createOrder(buildTestOrder());
      const order = (await res.json()) as OrderResponse;
      await transitionOrder(order.id, 'cancelled', actorId);

      const transRes = await transitionOrder(order.id, 'accepted', actorId);
      expect(transRes.status).toBe(409);
    });

    it('should reject ready → cancelled (not allowed per FSM)', async () => {
      const res = await createOrder(buildTestOrder());
      const order = (await res.json()) as OrderResponse;
      await transitionOrder(order.id, 'accepted', actorId);
      await transitionOrder(order.id, 'preparing', actorId);
      await transitionOrder(order.id, 'ready', actorId);

      const transRes = await transitionOrder(order.id, 'cancelled', actorId);
      expect(transRes.status).toBe(409);
    });

    it('should return 404 for non-existent order', async () => {
      const transRes = await transitionOrder(
        '00000000-0000-0000-0000-000000000000',
        'accepted',
        actorId,
      );
      expect(transRes.status).toBe(404);
    });
  });

  describe('Order retrieval', () => {
    it('should list orders by customerId', async () => {
      const customerId = crypto.randomUUID();
      await createOrder(buildTestOrder({ customerId }));
      await createOrder(buildTestOrder({ customerId }));

      const res = await fetch(
        `${BASE_URL}/orders?customerId=${customerId}`,
      );
      expect(res.status).toBe(200);
      const orders = (await res.json()) as OrderResponse[];
      expect(orders.length).toBeGreaterThanOrEqual(2);
      for (const order of orders) {
        expect(order.customerId).toBe(customerId);
      }
    });

    it('should return 400 when customerId is missing', async () => {
      const res = await fetch(`${BASE_URL}/orders`);
      expect(res.status).toBe(400);
    });
  });
});
