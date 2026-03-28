import type { NavigatorScreenParams } from '@react-navigation/native';

// ── Auth Stack ──────────────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  OTP: { phone: string };
};

// ── Deliveries Stack ────────────────────────────────────────────────
export type DeliveriesStackParamList = {
  OnlineToggle: undefined;
  DeliveryQueue: undefined;
  OrderOffer: { offerId: string };
  ActiveDelivery: { deliveryId: string };
  Navigation: { deliveryId: string; destinationType: 'restaurant' | 'customer' };
  Pickup: { deliveryId: string; orderId: string };
  Dropoff: { deliveryId: string; orderId: string };
};

// ── Earnings Stack ──────────────────────────────────────────────────
export type EarningsStackParamList = {
  EarningsToday: undefined;
  EarningsHistory: undefined;
  Payout: undefined;
};

// ── Account Stack ───────────────────────────────────────────────────
export type AccountStackParamList = {
  AccountHome: undefined;
  EditVehicle: undefined;
  Documents: undefined;
};

// ── Driver Tab Bar ──────────────────────────────────────────────────
export type DriverTabParamList = {
  DeliveriesTab: NavigatorScreenParams<DeliveriesStackParamList>;
  EarningsTab: NavigatorScreenParams<EarningsStackParamList>;
  AccountTab: NavigatorScreenParams<AccountStackParamList>;
};

// ── Root Stack ──────────────────────────────────────────────────────
export type DriverRootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<DriverTabParamList>;
};

// Re-export for use with useNavigation / useRoute
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends DriverRootStackParamList {}
  }
}