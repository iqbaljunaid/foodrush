import Redis from 'ioredis';
import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../config.js';
import type { GpsPing, CourierLocation } from '../types/index.js';
import { publishDispatchEvent } from '../events/producer.js';
import { TOPICS, buildLocationUpdatedEvent } from '../events/schemas.js';

const COURIER_GEO_KEY = 'couriers:locations';
const COURIER_META_PREFIX = 'courier:meta:';

let redis: Redis | null = null;

export function createRedisClient(config: AppConfig['redis']): Redis {
  redis = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    tls: config.tls ? {} : undefined,
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });
  return redis;
}

export function getRedisClient(): Redis {
  if (!redis) {
    throw new Error('Redis client not initialized. Call createRedisClient() first.');
  }
  return redis;
}

export function isRedisConnected(): boolean {
  return redis?.status === 'ready';
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

function isValidGpsPing(data: unknown): data is GpsPing {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj['courierId'] === 'string' &&
    typeof obj['latitude'] === 'number' &&
    typeof obj['longitude'] === 'number' &&
    typeof obj['timestamp'] === 'string'
  );
}

export async function gpsWebSocketRoutes(app: FastifyInstance): Promise<void> {
  app.get('/ws/gps', { websocket: true }, (socket) => {
    app.log.info('Courier GPS WebSocket connected');

    socket.on('message', (raw: Buffer) => {
      void (async () => {
        try {
          const parsed: unknown = JSON.parse(raw.toString());

          if (!isValidGpsPing(parsed)) {
            socket.send(JSON.stringify({ type: 'error', message: 'Invalid GPS ping format' }));
            return;
          }

          const ping = parsed;
          const client = getRedisClient();

          // Store location in Redis geospatial index
          await client.geoadd(COURIER_GEO_KEY, ping.longitude, ping.latitude, ping.courierId);

          // Store courier metadata
          await client.hset(`${COURIER_META_PREFIX}${ping.courierId}`, {
            lastLatitude: String(ping.latitude),
            lastLongitude: String(ping.longitude),
            lastTimestamp: ping.timestamp,
            heading: String(ping.heading ?? 0),
            speed: String(ping.speed ?? 0),
          });

          const location: CourierLocation = {
            courierId: ping.courierId,
            latitude: ping.latitude,
            longitude: ping.longitude,
            timestamp: ping.timestamp,
            heading: ping.heading,
            speed: ping.speed,
          };

          // Publish location update event to Kafka
          await publishDispatchEvent(
            TOPICS.LOCATION_UPDATED,
            buildLocationUpdatedEvent(location),
          );

          socket.send(JSON.stringify({ type: 'ack', courierId: ping.courierId }));
        } catch (err) {
          app.log.error(err, 'Error processing GPS ping');
          socket.send(JSON.stringify({ type: 'error', message: 'Processing error' }));
        }
      })();
    });

    socket.on('close', () => {
      app.log.info('Courier GPS WebSocket disconnected');
    });
  });
}
