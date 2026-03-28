const EARTH_RADIUS_KM = 6371;
const AVERAGE_COURIER_SPEED_KPH = 30;
const BASE_PICKUP_MINUTES = 5;

interface Coordinate {
  latitude: number;
  longitude: number;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function haversineDistance(from: Coordinate, to: Coordinate): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function calculateEta(
  courierLocation: Coordinate,
  deliveryAddress: Coordinate,
): number {
  const distanceKm = haversineDistance(courierLocation, deliveryAddress);
  const travelMinutes = (distanceKm / AVERAGE_COURIER_SPEED_KPH) * 60;
  return Math.ceil(travelMinutes + BASE_PICKUP_MINUTES);
}
