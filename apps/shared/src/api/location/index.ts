import { apiClient } from '../client';

export interface LocationUpdate {
  entityId: string;
  entityType: 'courier' | 'restaurant' | 'customer';
  latitude: number;
  longitude: number;
  timestamp?: string;
}

export interface LocationData {
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
  center: { latitude: number; longitude: number };
  radiusMeters: number;
  type: 'pickup' | 'delivery';
  entityId: string;
}

export interface GeofenceEvent {
  eventType: 'entered' | 'exited';
  zoneId: string;
  zoneName: string;
  zoneType: 'pickup' | 'delivery';
  entityId: string;
  courierId: string;
  timestamp: string;
  location: { latitude: number; longitude: number };
}

export interface LocationUpdateResponse {
  status: 'updated';
  geofenceEvents?: GeofenceEvent[];
}

export interface FindNearbyParams {
  entityType: 'courier' | 'restaurant' | 'customer';
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
}

export const locationApi = {
  updateLocation: (input: LocationUpdate) =>
    apiClient.put<LocationUpdateResponse>('/locations', input).then((r) => r.data),

  getNearby: (params: FindNearbyParams) =>
    apiClient
      .get<{ results: NearbyResult[] }>('/locations/nearby', { params })
      .then((r) => r.data),

  getGeofences: () =>
    apiClient.get<{ zones: GeofenceZone[] }>('/geofences').then((r) => r.data),
};