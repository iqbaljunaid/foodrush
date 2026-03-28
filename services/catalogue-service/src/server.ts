import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { loadConfig } from "./config.js";
import { initNoSQLClient, closeNoSQLClient } from "./db/nosql-client.js";
import { initObjectStorage } from "./storage/object-storage.js";
import { healthRoutes } from "./routes/health.js";
import { catalogueRoutes } from "./routes/catalogues.js";
import { menuRoutes } from "./routes/menus.js";

async function main(): Promise<void> {
  const config = loadConfig();

  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
    requestTimeout: 30_000,
  });

  // Register multipart for image uploads
  await app.register(multipart, {
    limits: {
      fileSize: config.objectStorage.maxFileSizeBytes,
    },
  });

  // Initialize infrastructure
  initNoSQLClient(config.nosql);
  initObjectStorage(config.objectStorage);

  // Register routes
  await app.register(healthRoutes);
  await app.register(catalogueRoutes);
  await app.register(menuRoutes);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down...`);
    await app.close();
    await closeNoSQLClient();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Catalogue service listening on ${config.host}:${config.port}`);
}

main().catch((err) => {
  console.error("Failed to start catalogue service:", err);
  process.exit(1);
});
