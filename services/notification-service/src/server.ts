import Fastify from "fastify";
import { loadConfig } from "./config.js";
import { initPushClient } from "./channels/push.js";
import { initSmsClient } from "./channels/sms.js";
import { initEmailClient } from "./channels/email.js";
import {
  createConsumer,
  disconnectConsumer,
} from "./consumers/notification-consumer.js";
import { healthRoutes } from "./routes/health.js";
import { notificationRoutes } from "./routes/notifications.js";

async function main(): Promise<void> {
  const config = loadConfig();

  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
    requestTimeout: 30_000,
  });

  // Initialize OCI notification channels
  initPushClient(config.oci);
  initSmsClient(config.oci);
  initEmailClient(config.email);

  // Start Kafka consumer for notification.send topic
  await createConsumer(
    config.kafka,
    config.oci.topicId,
    config.email.senderAddress,
    {
      info: (msg: string) => app.log.info(msg),
      error: (msg: string) => app.log.error(msg),
    },
  );

  // Register routes
  await app.register(healthRoutes);
  await app.register(notificationRoutes);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down...`);
    await app.close();
    await disconnectConsumer();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  await app.listen({ port: config.port, host: config.host });
  app.log.info(
    `Notification service listening on ${config.host}:${config.port}`,
  );
}

main().catch((err) => {
  console.error("Failed to start notification service:", err);
  process.exit(1);
});
