import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { config } from '../config.js';
import { publishEvent } from '../events/producer.js';
import { calculateEta } from '../eta/calculator.js';

let consumer: Consumer;

interface CourierAssignedEvent {
  type: string;
  orderId: string;
  courierId: string;
  courierName: string;
  customerId: string;
  courierLocation: { latitude: number; longitude: number };
  deliveryAddress: { latitude: number; longitude: number; address: string };
  timestamp: string;
}

export async function startCourierAssignedConsumer(): Promise<void> {
  const kafka = new Kafka({
    clientId: 'dispatch-service-consumer',
    brokers: [config.kafka.brokers],
    ssl: true,
    sasl: {
      mechanism: 'plain',
      username: config.kafka.saslUsername,
      password: config.kafka.saslPassword,
    },
  });

  consumer = kafka.consumer({ groupId: 'dispatch-service-courier-assigned' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'dispatch.courier-assigned', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }: EachMessagePayload) => {
      if (!message.value) return;

      const event = JSON.parse(message.value.toString()) as CourierAssignedEvent;

      const etaMinutes = calculateEta(
        event.courierLocation,
        event.deliveryAddress,
      );

      // Notify customer about courier assignment and ETA
      await publishEvent('notification.send', {
        type: 'CourierAssigned',
        channel: 'push',
        recipientId: event.customerId,
        title: 'Courier Assigned',
        body: `${event.courierName} is on the way! Estimated delivery in ${etaMinutes} minutes.`,
        data: {
          orderId: event.orderId,
          courierId: event.courierId,
          etaMinutes,
        },
        timestamp: new Date().toISOString(),
      });
    },
  });
}

export async function stopCourierAssignedConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
  }
}
