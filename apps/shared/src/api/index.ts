export { apiClient } from './client';
export type { StoredTokens } from './client';

export { userApi } from './user';
export type {
  User,
  LoginInput,
  RegisterInput,
  AuthResponse,
  UpdateProfileInput,
  Address,
  AddAddressInput,
} from './user';

export { orderApi } from './order';
export type {
  Order,
  OrderItem,
  OrderStatus,
  CreateOrderInput,
  TransitionInput,
  RateOrderInput,
  ListOrdersParams,
} from './order';

export { catalogueApi } from './catalogue';
export type {
  Catalogue,
  MenuItem,
  ListCataloguesParams,
  ListMenuItemsParams,
  SearchMenusParams,
} from './catalogue';

export { dispatchApi } from './dispatch';
export type {
  GpsCoordinates,
  CourierAssignmentRequest,
  CourierAssignmentResult,
  NearbyCourier,
  Delivery,
  DeliveryStatusInput,
  RouteInfo,
  RouteStep,
  EarningsResponse,
  EarningsTrip,
  PayoutResponse,
  FindNearbyCouriersParams,
  GetEarningsParams,
} from './dispatch';

export { locationApi } from './location';
export type {
  LocationUpdate,
  LocationData,
  NearbyResult,
  GeofenceZone,
  GeofenceEvent,
  LocationUpdateResponse,
  FindNearbyParams,
} from './location';

export { paymentApi } from './payment';
export type {
  Payment,
  PaymentStatus,
  CreatePaymentInput,
  RefundPaymentInput,
  Card,
  AddCardInput,
} from './payment';