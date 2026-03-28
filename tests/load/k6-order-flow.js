import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics
const orderCreateDuration = new Trend('order_create_duration', true);
const transitionDuration = new Trend('transition_duration', true);
const fullCycleDuration = new Trend('full_cycle_duration', true);
const orderErrors = new Rate('order_errors');
const ordersCompleted = new Counter('orders_completed');

// Configuration from environment
const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3001';

export const options = {
  scenarios: {
    order_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 250 },
        { duration: '30s', target: 500 },
        { duration: '1m', target: 1000 },
        { duration: '2m', target: 1000 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300'],
    order_create_duration: ['p(95)<300'],
    transition_duration: ['p(95)<300'],
    full_cycle_duration: ['p(95)<2000'],
    order_errors: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
};

const HEADERS = { 'Content-Type': 'application/json' };

function uuid() {
  // Simple v4-like UUID for load testing
  return `${randomString(8)}-${randomString(4)}-4${randomString(3)}-${randomString(4)}-${randomString(12)}`;
}

function createOrder() {
  const payload = JSON.stringify({
    customerId: uuid(),
    restaurantId: uuid(),
    items: [
      { itemId: `item-${randomString(4)}`, name: 'Test Pizza', quantity: 2, unitPrice: 12.99 },
      { itemId: `item-${randomString(4)}`, name: 'Test Drink', quantity: 1, unitPrice: 3.49 },
    ],
    deliveryAddress: `${Math.floor(Math.random() * 9999)} Load Test St, Test City`,
  });

  const start = Date.now();
  const res = http.post(`${BASE_URL}/orders`, payload, { headers: HEADERS });
  orderCreateDuration.add(Date.now() - start);

  const success = check(res, {
    'order created (201)': (r) => r.status === 201,
    'order has id': (r) => {
      try {
        return JSON.parse(r.body).id !== undefined;
      } catch {
        return false;
      }
    },
    'order status is placed': (r) => {
      try {
        return JSON.parse(r.body).status === 'placed';
      } catch {
        return false;
      }
    },
  });

  orderErrors.add(!success);

  if (!success || res.status !== 201) {
    return null;
  }

  try {
    return JSON.parse(res.body);
  } catch {
    return null;
  }
}

function transitionOrder(orderId, status, actorId) {
  const payload = JSON.stringify({ status, actorId });

  const start = Date.now();
  const res = http.patch(`${BASE_URL}/orders/${orderId}/status`, payload, {
    headers: HEADERS,
  });
  transitionDuration.add(Date.now() - start);

  const success = check(res, {
    [`transition to ${status} (200)`]: (r) => r.status === 200,
    [`status is ${status}`]: (r) => {
      try {
        return JSON.parse(r.body).status === status;
      } catch {
        return false;
      }
    },
  });

  orderErrors.add(!success);
  return success;
}

function getOrder(orderId) {
  const res = http.get(`${BASE_URL}/orders/${orderId}`, { headers: HEADERS });

  check(res, {
    'get order (200)': (r) => r.status === 200,
  });

  return res;
}

export default function () {
  const actorId = uuid();

  group('Full order lifecycle', () => {
    const cycleStart = Date.now();

    // Step 1: Create order
    const order = createOrder();
    if (!order) {
      return;
    }

    sleep(0.1);

    // Step 2: placed → accepted
    if (!transitionOrder(order.id, 'accepted', actorId)) return;
    sleep(0.1);

    // Step 3: accepted → preparing
    if (!transitionOrder(order.id, 'preparing', actorId)) return;
    sleep(0.1);

    // Step 4: preparing → ready
    if (!transitionOrder(order.id, 'ready', actorId)) return;
    sleep(0.1);

    // Step 5: ready → picked_up
    if (!transitionOrder(order.id, 'picked_up', actorId)) return;
    sleep(0.1);

    // Step 6: picked_up → delivered
    if (!transitionOrder(order.id, 'delivered', actorId)) return;

    fullCycleDuration.add(Date.now() - cycleStart);
    ordersCompleted.add(1);

    // Verify final state
    const finalRes = getOrder(order.id);
    check(finalRes, {
      'final status is delivered': (r) => {
        try {
          return JSON.parse(r.body).status === 'delivered';
        } catch {
          return false;
        }
      },
    });
  });

  sleep(0.5);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] || 0;
  const errorRate = data.metrics.order_errors?.values?.rate || 0;
  const completed = data.metrics.orders_completed?.values?.count || 0;

  const summary = `
=== FoodRush Load Test Summary ===
Orders completed:  ${completed}
HTTP p95 latency:  ${p95.toFixed(2)}ms (threshold: 300ms)
Error rate:        ${(errorRate * 100).toFixed(2)}% (threshold: 1%)
Passed:            ${p95 < 300 && errorRate < 0.01 ? 'YES' : 'NO'}
==================================
`;
  return {
    stdout: summary,
    'tests/load/summary.json': JSON.stringify(data, null, 2),
  };
}
