export const CourierStatus = {
  AVAILABLE: 'available',
  ASSIGNED: 'assigned',
  EN_ROUTE_PICKUP: 'en_route_pickup',
  AT_PICKUP: 'at_pickup',
  EN_ROUTE_DELIVERY: 'en_route_delivery',
  AT_DELIVERY: 'at_delivery',
  OFFLINE: 'offline',
} as const;

export type CourierStatusType = (typeof CourierStatus)[keyof typeof CourierStatus];

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

export interface CourierLocation extends GpsCoordinates {
  courierId: string;
  timestamp: string;
  heading?: number;
  speed?: number;
}

export interface CourierProfile {
  courierId: string;
  status: CourierStatusType;
  currentLocation: GpsCoordinates | null;
  activeOrderId: string | null;
  lastSeenAt: string;
}

export interface CourierAssignmentRequest {
  orderId: string;
  restaurantId: string;
  pickupLocation: GpsCoordinates;
  deliveryLocation: GpsCoordinates;
  maxRadiusKm: number;
}

export interface CourierAssignmentResult {
  orderId: string;
  courierId: string;
  estimatedPickupMinutes: number;
  distanceKm: number;
}

export interface GpsPing {
  courierId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  heading?: number;
  speed?: number;
}

export interface DispatchEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface WebSocketMessage {
  type: string;
  data: unknown;
}
