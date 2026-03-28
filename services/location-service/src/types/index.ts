export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

export interface LocationUpdate {
  entityId: string;
  entityType: "courier" | "restaurant" | "customer";
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface NearbyResult {
  entityId: string;
  distanceKm: number;
}

export interface GeofenceZone {
  id: string;
  name: string;
  center: GpsCoordinates;
  radiusMeters: number;
  type: "pickup" | "delivery";
  entityId: string;
}

export interface GeofenceEvent {
  eventType: "entered" | "exited";
  zoneId: string;
  zoneName: string;
  zoneType: "pickup" | "delivery";
  entityId: string;
  courierId: string;
  timestamp: string;
  location: GpsCoordinates;
}
