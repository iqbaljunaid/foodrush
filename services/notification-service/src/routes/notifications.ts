import type { FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { NotificationChannel, NotificationStatus } from "../types/index.js";
import type {
  SendNotificationInput,
  NotificationResult,
  NotificationChannelType,
} from "../types/index.js";
import { sendPushNotification } from "../channels/push.js";
import { sendSms } from "../channels/sms.js";
import { sendEmail } from "../channels/email.js";
import { loadConfig } from "../config.js";

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  const config = loadConfig();

  // Send a notification directly via API
  app.post<{ Body: SendNotificationInput }>(
    "/notifications",
    async (request, reply) => {
      const { recipientId, channel, destination, subject, body, metadata } =
        request.body;

      if (!recipientId || !channel || !destination || !body) {
        return reply
          .status(400)
          .send({
            error: "recipientId, channel, destination, and body are required",
          });
      }

      const validChannels: readonly NotificationChannelType[] = [
        NotificationChannel.PUSH,
        NotificationChannel.SMS,
        NotificationChannel.EMAIL,
      ];
      if (!validChannels.includes(channel)) {
        return reply
          .status(400)
          .send({
            error: `Invalid channel. Must be one of: ${validChannels.join(", ")}`,
          });
      }

      const id = uuidv4();
      const result: NotificationResult = {
        id,
        recipientId,
        channel,
        status: NotificationStatus.PENDING,
        sentAt: null,
        errorMessage: null,
      };

      try {
        switch (channel) {
          case NotificationChannel.PUSH:
            await sendPushNotification(config.oci.topicId, {
              title: subject ?? "FoodRush",
              body,
              deviceToken: destination,
              data: metadata,
            });
            break;

          case NotificationChannel.SMS:
            await sendSms(config.oci.topicId, {
              phoneNumber: destination,
              message: body,
            });
            break;

          case NotificationChannel.EMAIL:
            await sendEmail({
              to: destination,
              subject: subject ?? "FoodRush Notification",
              bodyHtml: `<p>${body}</p>`,
              bodyText: body,
              from: config.email.senderAddress,
            });
            break;
        }

        result.status = NotificationStatus.SENT;
        result.sentAt = new Date().toISOString();
      } catch (err) {
        result.status = NotificationStatus.FAILED;
        result.errorMessage = err instanceof Error ? err.message : String(err);
        return reply.status(502).send(result);
      }

      return reply.status(201).send(result);
    },
  );

  // Get notification status by ID (placeholder — would query a persistence layer in production)
  app.get<{ Params: { id: string } }>(
    "/notifications/:id",
    async (request, reply) => {
      const { id } = request.params;

      // In production, this would query a database for the notification record.
      // Returning a stub to satisfy the API contract.
      return reply.status(200).send({
        id,
        status: "unknown",
        message: "Notification status lookup requires a persistence layer",
      });
    },
  );
}
