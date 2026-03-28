import { Kafka, type Producer } from 'kafkajs';
import type { AppConfig } from '../config.js';
import type { OrderEvent } from '../types/index.js';

let producer: Producer | null = null;
let connected = false;

export async function createProducer(config: AppConfig['kafka']): Promise<Producer> {
  const kafka = new Kafka({
    clientId: config.clientId,
    brokers: config.brokers,
    ssl: config.ssl ? true : undefined,
    sasl: {
      mechanism: 'plain',
      username: config.saslUsername,
      password: config.saslPassword,
    },
  });

  producer = kafka.producer({
    allowAutoTopicCreation: false,
    idempotent: true,
  });

  await producer.connect();
  connected = true;
  return producer;
}

export function getProducer(): Producer {
  if (!producer) {
    throw new Error('Kafka producer not initialized. Call createProducer() first.');
  }
  return producer;
}

export async function publishOrderEvent(topic: string, event: OrderEvent): Promise<void> {
  const p = getProducer();
  await p.send({
    topic,
    messages: [
      {
        key: event.orderId,
        value: JSON.stringify(event),
        headers: {
          'event-type': event.eventType,
          'event-id': event.eventId,
        },
      },
    ],
  });
}

export function isProducerConnected(): boolean {
  return connected;
}

export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    connected = false;
  }
}
