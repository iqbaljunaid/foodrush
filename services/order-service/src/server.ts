import Fastify from 'fastify';
import { loadConfig } from './config.js';
import { createPool } from './db/connection.js';
import { createProducer, disconnectProducer } from './events/producer.js';
import { startConsumers, stopConsumers } from './consumers/index.js';
import { healthRoutes } from './routes/health.js';
import { orderRoutes } from './routes/orders.js';

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
  await createProducer(config.kafka);
  await startConsumers(config.kafka, app.log);

  // Register routes
  await app.register(healthRoutes);
  await app.register(orderRoutes);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down...`);
    await app.close();
    await stopConsumers();
    await disconnectProducer();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Order service listening on ${config.host}:${config.port}`);
}

main().catch((err) => {
  console.error('Failed to start order service:', err);
  process.exit(1);
});
