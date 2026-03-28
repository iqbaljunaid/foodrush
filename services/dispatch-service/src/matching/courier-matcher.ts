import type { CourierAssignmentRequest, CourierAssignmentResult } from '../types/index.js';
import { getRedisClient } from '../ws/gps-handler.js';

const COURIER_GEO_KEY = 'couriers:locations';
const COURIER_META_PREFIX = 'courier:meta:';
const AVG_COURIER_SPEED_KMH = 30;

export async function findNearbyCouriers(
  pickupLocation: { latitude: number; longitude: number },
  radiusKm: number,
  maxResults: number,
): Promise<Array<{ courierId: string; distanceKm: number }>> {
  const redis = getRedisClient();

  const results = await redis.georadius(
    COURIER_GEO_KEY,
    pickupLocation.longitude,
    pickupLocation.latitude,
    radiusKm,
    'km',
    'WITHDIST',
    'ASC',
    'COUNT',
    maxResults,
  ) as Array<[string, string]>;

  return results.map(([courierId, distance]) => ({
    courierId,
    distanceKm: parseFloat(distance),
  }));
}

async function isCourierAvailable(courierId: string): Promise<boolean> {
  const redis = getRedisClient();
  const status = await redis.hget(`${COURIER_META_PREFIX}${courierId}`, 'status');
  return status === 'available';
}

export async function matchCourierToOrder(
  request: CourierAssignmentRequest,
): Promise<CourierAssignmentResult | null> {
  const nearbyCouriers = await findNearbyCouriers(
    request.pickupLocation,
    request.maxRadiusKm,
    20,
  );

  for (const candidate of nearbyCouriers) {
    const available = await isCourierAvailable(candidate.courierId);
    if (available) {
      const estimatedPickupMinutes = (candidate.distanceKm / AVG_COURIER_SPEED_KMH) * 60;

      return {
        orderId: request.orderId,
        courierId: candidate.courierId,
        estimatedPickupMinutes: Math.ceil(estimatedPickupMinutes),
        distanceKm: Math.round(candidate.distanceKm * 100) / 100,
      };
    }
  }

  return null;
}
