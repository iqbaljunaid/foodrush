import type {
  GpsCoordinates,
  GeofenceZone,
  GeofenceEvent,
} from "../types/index.js";
import { getRedisClient } from "./redis-geo.js";

const GEOFENCE_KEY = "geofences";
const GEOFENCE_STATE_PREFIX = "geofence:state:";
const EARTH_RADIUS_METERS = 6_371_000;

function haversineDistance(a: GpsCoordinates, b: GpsCoordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export async function registerGeofence(zone: GeofenceZone): Promise<void> {
  const redis = getRedisClient();
  await redis.geoadd(
    GEOFENCE_KEY,
    zone.center.longitude,
    zone.center.latitude,
    zone.id,
  );
  await redis.hset(`geofence:meta:${zone.id}`, {
    name: zone.name,
    type: zone.type,
    entityId: zone.entityId,
    radiusMeters: String(zone.radiusMeters),
    centerLat: String(zone.center.latitude),
    centerLon: String(zone.center.longitude),
  });
}

export async function removeGeofence(zoneId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.zrem(GEOFENCE_KEY, zoneId);
  await redis.del(`geofence:meta:${zoneId}`);
}

export async function checkGeofences(
  courierId: string,
  location: GpsCoordinates,
): Promise<GeofenceEvent[]> {
  const redis = getRedisClient();
  const events: GeofenceEvent[] = [];

  // Find geofences within 1km of courier position
  const nearbyZones = (await redis.georadius(
    GEOFENCE_KEY,
    location.longitude,
    location.latitude,
    1,
    "km",
  )) as string[];

  for (const zoneId of nearbyZones) {
    const meta = await redis.hgetall(`geofence:meta:${zoneId}`);
    if (!meta["centerLat"] || !meta["centerLon"] || !meta["radiusMeters"]) {
      continue;
    }

    const zoneCenter: GpsCoordinates = {
      latitude: parseFloat(meta["centerLat"]),
      longitude: parseFloat(meta["centerLon"]),
    };
    const radiusMeters = parseFloat(meta["radiusMeters"]);
    const distance = haversineDistance(location, zoneCenter);
    const isInside = distance <= radiusMeters;

    const stateKey = `${GEOFENCE_STATE_PREFIX}${courierId}:${zoneId}`;
    const previousState = await redis.get(stateKey);
    const wasInside = previousState === "inside";

    if (isInside && !wasInside) {
      await redis.set(stateKey, "inside");
      events.push({
        eventType: "entered",
        zoneId,
        zoneName: meta["name"] ?? zoneId,
        zoneType: (meta["type"] as "pickup" | "delivery") ?? "pickup",
        entityId: meta["entityId"] ?? "",
        courierId,
        timestamp: new Date().toISOString(),
        location,
      });
    } else if (!isInside && wasInside) {
      await redis.set(stateKey, "outside");
      events.push({
        eventType: "exited",
        zoneId,
        zoneName: meta["name"] ?? zoneId,
        zoneType: (meta["type"] as "pickup" | "delivery") ?? "pickup",
        entityId: meta["entityId"] ?? "",
        courierId,
        timestamp: new Date().toISOString(),
        location,
      });
    }
  }

  return events;
}

export async function listGeofences(): Promise<GeofenceZone[]> {
  const redis = getRedisClient();
  const zoneIds = await redis.zrange(GEOFENCE_KEY, 0, -1);
  const zones: GeofenceZone[] = [];

  for (const zoneId of zoneIds) {
    const meta = await redis.hgetall(`geofence:meta:${zoneId}`);
    if (meta["centerLat"] && meta["centerLon"]) {
      zones.push({
        id: zoneId,
        name: meta["name"] ?? zoneId,
        type: (meta["type"] as "pickup" | "delivery") ?? "pickup",
        entityId: meta["entityId"] ?? "",
        radiusMeters: parseFloat(meta["radiusMeters"] ?? "100"),
        center: {
          latitude: parseFloat(meta["centerLat"]),
          longitude: parseFloat(meta["centerLon"]),
        },
      });
    }
  }

  return zones;
}
