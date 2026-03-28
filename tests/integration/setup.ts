import { Kafka, type Consumer, type EachMessagePayload } from 'kafkajs';

const ORDER_SERVICE_URL =
  process.env['ORDER_SERVICE_URL'] ?? 'http://localhost:3001';

const KAFKA_BROKERS = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');

export function getOrderServiceUrl(): string {
  return ORDER_SERVICE_URL;
}

export interface CapturedEvent {
  topic: string;
  key: string | null;
  value: Record<string, unknown>;
  headers: Record<string, string>;
}

/**
 * Kafka event collector for integration tests.
 * Subscribes to order topics and captures events for assertion.
 */
export class EventCollector {
  private readonly kafka: Kafka;
  private consumer: Consumer | null = null;
  private readonly events: CapturedEvent[] = [];

  constructor() {
    this.kafka = new Kafka({
      clientId: 'integration-test-consumer',
      brokers: KAFKA_BROKERS,
    });
  }

  async start(topics: string[]): Promise<void> {
    this.consumer = this.kafka.consumer({
      groupId: `integration-test-${Date.now()}`,
    });

    await this.consumer.connect();

    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
    }

    await this.consumer.run({
      eachMessage: async ({ topic, message }: EachMessagePayload) => {
        const key = message.key?.toString() ?? null;
        const value = JSON.parse(
          message.value?.toString() ?? '{}',
        ) as Record<string, unknown>;
        const headers: Record<string, string> = {};

        if (message.headers) {
          for (const [k, v] of Object.entries(message.headers)) {
            if (v) {
              headers[k] = Buffer.isBuffer(v) ? v.toString() : String(v);
            }
          }
        }

        this.events.push({ topic, key, value, headers });
      },
    });
  }

  getEvents(topic?: string): CapturedEvent[] {
    if (topic) {
      return this.events.filter((e) => e.topic === topic);
    }
    return [...this.events];
  }

  getEventsByOrderId(orderId: string, topic?: string): CapturedEvent[] {
    return this.getEvents(topic).filter((e) => e.key === orderId);
  }

  clear(): void {
    this.events.length = 0;
  }

  async stop(): Promise<void> {
    if (this.consumer) {
      await this.consumer.disconnect();
      this.consumer = null;
    }
  }
}

export interface CreateOrderPayload {
  customerId: string;
  restaurantId: string;
  items: Array<{
    itemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  deliveryAddress: string;
  notes?: string;
}

export function buildTestOrder(overrides?: Partial<CreateOrderPayload>): CreateOrderPayload {
  return {
    customerId: crypto.randomUUID(),
    restaurantId: crypto.randomUUID(),
    items: [
      { itemId: 'item-1', name: 'Margherita Pizza', quantity: 2, unitPrice: 12.99 },
      { itemId: 'item-2', name: 'Garlic Bread', quantity: 1, unitPrice: 4.99 },
    ],
    deliveryAddress: '123 Test Street, Test City, TC 12345',
    ...overrides,
  };
}

/**
 * Helper to wait for events to be captured by the collector.
 */
export async function waitForEvents(
  collector: EventCollector,
  orderId: string,
  expectedCount: number,
  topic?: string,
  timeoutMs = 10_000,
): Promise<CapturedEvent[]> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const events = collector.getEventsByOrderId(orderId, topic);
    if (events.length >= expectedCount) {
      return events;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return collector.getEventsByOrderId(orderId, topic);
}
