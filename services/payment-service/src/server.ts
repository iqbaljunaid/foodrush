import Fastify from "fastify";
import { loadConfig } from "./config.js";
import { createPool } from "./db/connection.js";
import { initStripeClient } from "./stripe/client.js";
import { healthRoutes } from "./routes/health.js";
import { paymentRoutes } from "./routes/payments.js";

async function main(): Promise<void> {
  const config = loadConfig();

  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
    requestTimeout: 30_000,
  });

  // Initialize infrastructure
  createPool(config.db);
  initStripeClient(config.stripe);

  // Register routes
  await app.register(healthRoutes);
  await app.register(paymentRoutes);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down...`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Payment service listening on ${config.host}:${config.port}`);
}

main().catch((err) => {
  console.error("Failed to start payment service:", err);
  process.exit(1);
});
