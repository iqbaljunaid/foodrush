import { apiClient } from '../client';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

export interface CourierAssignmentRequest {
  orderId: string;
  restaurantId: string;
  pickupLocation: GpsCoordinates;
  deliveryLocation: GpsCoordinates;
  maxRadiusKm?: number;
}

export interface CourierAssignmentResult {
  orderId: string;
  courierId: string;
  estimatedPickupMinutes: number;
  distanceKm: number;
}

export interface NearbyCourier {
  courierId: string;
  distanceKm: number;
}

export interface Delivery {
  id: string;
  orderId: string;
  courierId: string;
  status: string;
  pickupLocation: GpsCoordinates;
  deliveryLocation: GpsCoordinates;
  estimatedPickupMinutes: number;
  estimatedDeliveryMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryStatusInput {
  status: string;
}

export interface RouteInfo {
  polyline: string;
  distanceKm: number;
  durationMinutes: number;
  steps: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuver: string;
}

export interface EarningsResponse {
  total: number;
  trips: number;
  tips: number;
  onlineHours: number;
  period: string;
  breakdown: EarningsTrip[];
}

export interface EarningsTrip {
  deliveryId: string;
  restaurantName: string;
  payout: number;
  tip: number;
  distance: number;
  duration: number;
  rating: number | null;
  completedAt: string;
}

export interface PayoutResponse {
  id: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  createdAt: string;
}

export interface FindNearbyCouriersParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
}

export interface GetEarningsParams {
  period: 'today' | 'week' | 'month';
  from?: string;
  to?: string;
}

export const dispatchApi = {
  acceptOffer: (offerId: string) =>
    apiClient
      .post<Delivery>(`/dispatch/offers/${encodeURIComponent(offerId)}/accept`)
      .then((r) => r.data),

  rejectOffer: (offerId: string) =>
    apiClient
      .post<void>(`/dispatch/offers/${encodeURIComponent(offerId)}/reject`)
      .then((r) => r.data),

  getDelivery: (id: string) =>
    apiClient
      .get<Delivery>(`/dispatch/deliveries/${encodeURIComponent(id)}`)
      .then((r) => r.data),

  updateDeliveryStatus: (id: string, input: DeliveryStatusInput) =>
    apiClient
      .patch<Delivery>(`/dispatch/deliveries/${encodeURIComponent(id)}/status`, input)
      .then((r) => r.data),

  getEarnings: (params: GetEarningsParams) =>
    apiClient
      .get<EarningsResponse>('/dispatch/earnings', { params })
      .then((r) => r.data),

  getPayouts: () =>
    apiClient.get<PayoutResponse[]>('/dispatch/payouts').then((r) => r.data),

  requestInstantPayout: () =>
    apiClient.post<PayoutResponse>('/dispatch/payouts/instant').then((r) => r.data),

  getRoute: (deliveryId: string) =>
    apiClient
      .get<RouteInfo>(`/dispatch/deliveries/${encodeURIComponent(deliveryId)}/route`)
      .then((r) => r.data),
};