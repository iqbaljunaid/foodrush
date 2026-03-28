import { v4 as uuidv4 } from 'uuid';
import type { CourierAssignmentResult, CourierLocation, DispatchEvent } from '../types/index.js';

export const TOPICS = {
  COURIER_REQUESTS: 'dispatch.courier-requests',
  COURIER_ASSIGNED: 'dispatch.courier-assigned',
  LOCATION_UPDATED: 'dispatch.location-updated',
} as const;

export function buildCourierAssignedEvent(assignment: CourierAssignmentResult): DispatchEvent {
  return {
    eventId: uuidv4(),
    eventType: 'dispatch.courier-assigned',
    timestamp: new Date().toISOString(),
    payload: {
      orderId: assignment.orderId,
      courierId: assignment.courierId,
      estimatedPickupMinutes: assignment.estimatedPickupMinutes,
      distanceKm: assignment.distanceKm,
    },
  };
}

export function buildLocationUpdatedEvent(location: CourierLocation): DispatchEvent {
  return {
    eventId: uuidv4(),
    eventType: 'dispatch.location-updated',
    timestamp: new Date().toISOString(),
    payload: {
      courierId: location.courierId,
      latitude: location.latitude,
      longitude: location.longitude,
      heading: location.heading ?? null,
      speed: location.speed ?? null,
      recordedAt: location.timestamp,
    },
  };
}
