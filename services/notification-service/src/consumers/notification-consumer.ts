import { Kafka, type Consumer, type EachMessagePayload } from 'kafkajs';
import type { AppConfig } from '../config.js';
import type { NotificationEvent } from '../types/index.js';
import { NotificationChannel } from '../types/index.js';
import { sendPushNotification } from '../channels/push.js';
import { sendSms } from '../channels/sms.js';
import { sendEmail } from '../channels/email.js';

const TOPIC = 'notification.send';

let consumer: Consumer | null = null;
let connected = false;

export async function createConsumer(
  config: AppConfig['kafka'],
  ociTopicId: string,
  emailSender: string,
  logger: { info: (msg: string) => void; error: (msg: string) => void },
): Promise<Consumer> {
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

  consumer = kafka.consumer({ groupId: config.groupId });
  await consumer.connect();
  connected = true;

  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async (messagePayload: EachMessagePayload) => {
      const { message } = messagePayload;

      if (!message.value) {
        logger.error('Received message with no value');
        return;
      }

      const event = JSON.parse(message.value.toString()) as NotificationEvent;

      try {
        switch (event.payload.channel) {
          case NotificationChannel.PUSH:
            await sendPushNotification(ociTopicId, {
              title: event.payload.subject ?? 'FoodRush',
              body: event.payload.body,
              deviceToken: event.payload.destination,
              data: event.payload.metadata,
            });
            break;

          case NotificationChannel.SMS:
            await sendSms(ociTopicId, {
              phoneNumber: event.payload.destination,
              message: event.payload.body,
            });
            break;

          case NotificationChannel.EMAIL:
            await sendEmail({
              to: event.payload.destination,
              subject: event.payload.subject ?? 'FoodRush Notification',
              bodyHtml: `<p>${event.payload.body}</p>`,
              bodyText: event.payload.body,
              from: emailSender,
            });
            break;
        }

        logger.info(
          `Notification sent: channel=${event.payload.channel} recipient=${event.payload.recipientId}`,
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.error(
          `Failed to send notification: channel=${event.payload.channel} error=${errorMsg}`,
        );
      }
    },
  });

  return consumer;
}

export function isConsumerConnected(): boolean {
  return connected;
}

export async function disconnectConsumer(): Promise<void> {
  if (consumer) {
    await consumer.disconnect();
    connected = false;
  }
}
