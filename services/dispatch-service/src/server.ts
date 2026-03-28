import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { loadConfig } from './config.js';
import { createProducer, disconnectProducer } from './events/producer.js';
import { startConsumers, stopConsumers } from './consumers/index.js';
import { createRedisClient, disconnectRedis, gpsWebSocketRoutes } from './ws/gps-handler.js';
import { healthRoutes } from './routes/health.js';
import { dispatchRoutes } from './routes/dispatch.js';

async function main(): Promise<void> {
  const config = loadConfig();

  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
    requestTimeout: 30_000,
  });

  // Register WebSocket support
  await app.register(websocket);

  // Initialize infrastructure
  createRedisClient(config.redis);
  await createProducer(config.kafka);
  const locationServiceUrl = process.env['LOCATION_SERVICE_URL'] ?? 'http://location-service:3004';
  await startConsumers(config.kafka, locationServiceUrl, app.log);

  // Register routes
  await app.register(healthRoutes);
  await app.register(dispatchRoutes);
  await app.register(gpsWebSocketRoutes);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down...`);
    await app.close();
    await stopConsumers();
    await disconnectProducer();
    await disconnectRedis();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Dispatch service listening on ${config.host}:${config.port}`);
}

main().catch((err) => {
  console.error('Failed to start dispatch service:', err);
  process.exit(1);
});
