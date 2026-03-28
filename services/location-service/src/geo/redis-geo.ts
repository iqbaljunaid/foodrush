import { Redis } from "ioredis";
import type { AppConfig } from "../config.js";
import type { LocationUpdate, NearbyResult } from "../types/index.js";

let redis: Redis | null = null;

const GEO_KEY_PREFIX = "geo:";

function geoKey(entityType: string): string {
  return `${GEO_KEY_PREFIX}${entityType}`;
}

export function createRedisClient(config: AppConfig["redis"]): Redis {
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
    throw new Error(
      "Redis client not initialized. Call createRedisClient() first.",
    );
  }
  return redis;
}

export function isRedisConnected(): boolean {
  return redis?.status === "ready";
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export async function updateLocation(update: LocationUpdate): Promise<void> {
  const client = getRedisClient();
  const key = geoKey(update.entityType);

  await client.geoadd(key, update.longitude, update.latitude, update.entityId);

  await client.hset(`location:meta:${update.entityId}`, {
    entityType: update.entityType,
    latitude: String(update.latitude),
    longitude: String(update.longitude),
    timestamp: update.timestamp,
  });
}

export async function findNearby(
  entityType: string,
  longitude: number,
  latitude: number,
  radiusKm: number,
  limit: number,
): Promise<NearbyResult[]> {
  const client = getRedisClient();
  const key = geoKey(entityType);

  const results = (await client.georadius(
    key,
    longitude,
    latitude,
    radiusKm,
    "km",
    "WITHDIST",
    "ASC",
    "COUNT",
    limit,
  )) as Array<[string, string]>;

  return results.map(([entityId, distance]) => ({
    entityId,
    distanceKm: parseFloat(distance),
  }));
}

export async function getLocation(
  entityId: string,
): Promise<{ latitude: number; longitude: number; timestamp: string } | null> {
  const client = getRedisClient();
  const meta = await client.hgetall(`location:meta:${entityId}`);

  if (!meta["latitude"] || !meta["longitude"]) {
    return null;
  }

  return {
    latitude: parseFloat(meta["latitude"]),
    longitude: parseFloat(meta["longitude"]),
    timestamp: meta["timestamp"] ?? new Date().toISOString(),
  };
}

export async function getDistance(
  entityType: string,
  entityA: string,
  entityB: string,
): Promise<number | null> {
  const client = getRedisClient();
  const key = geoKey(entityType);
  const distance = await client.geodist(key, entityA, entityB, "KM");
  return distance ? parseFloat(distance) : null;
}

export async function removeLocation(
  entityType: string,
  entityId: string,
): Promise<void> {
  const client = getRedisClient();
  const key = geoKey(entityType);
  await client.zrem(key, entityId);
  await client.del(`location:meta:${entityId}`);
}
