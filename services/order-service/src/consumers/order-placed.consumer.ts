import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { config } from '../config.js';
import { publishEvent } from '../events/producer.js';

let consumer: Consumer;

export async function startOrderPlacedConsumer(): Promise<void> {
  const kafka = new Kafka({
    clientId: 'order-service-consumer',
    brokers: [config.kafka.brokers],
    ssl: true,
    sasl: {
      mechanism: 'plain',
      username: config.kafka.saslUsername,
      password: config.kafka.saslPassword,
    },
  });

  consumer = kafka.consumer({ groupId: 'order-service-order-placed' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'order.placed', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }: EachMessagePayload) => {
      if (!message.value) return;

      const event = JSON.parse(message.value.toString()) as {
        orderId: string;
        customerId: string;
        restaurantId: string;
        items: Array<{ menuItemId: string; quantity: number; price: number }>;
        deliveryAddress: { latitude: number; longitude: number; address: string };
        timestamp: string;
      };

      // Fan-out 1: Request courier assignment
      await publishEvent('dispatch.courier-requests', {
        type: 'CourierAssignmentRequested',
        orderId: event.orderId,
        restaurantId: event.restaurantId,
        deliveryAddress: event.deliveryAddress,
        timestamp: new Date().toISOString(),
      });

      // Fan-out 2: Notify customer that order is confirmed
      await publishEvent('notification.send', {
        type: 'OrderConfirmed',
        channel: 'push',
        recipientId: event.customerId,
        title: 'Order Confirmed',
        body: `Your order #${event.orderId.slice(0, 8)} has been placed and is being processed.`,
        data: { orderId: event.orderId },
        timestamp: new Date().toISOString(),
      });
    },
  });
}

export async function stopOrderPlacedConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
  }
}
