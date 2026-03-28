import type { NavigatorScreenParams } from '@react-navigation/native';

// ── Auth Stack ──────────────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  OTP: { phone: string };
};

// ── Home Stack ──────────────────────────────────────────────────────
export type HomeStackParamList = {
  Discovery: undefined;
  RestaurantList: { categoryId?: string };
  RestaurantDetail: { restaurantId: string };
  Search: undefined;
};

// ── Orders Stack ────────────────────────────────────────────────────
export type OrdersStackParamList = {
  OrdersList: undefined;
  OrderDetail: { orderId: string };
  OrderTracking: { orderId: string };
  Cart: undefined;
  Checkout: undefined;
  Payment: undefined;
  Confirmation: { orderId: string };
};

// ── Profile Stack ───────────────────────────────────────────────────
export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  AddressBook: undefined;
  AddressEditor: { addressId?: string };
  OrderHistory: undefined;
  Settings: undefined;
};

// ── Main Tab Bar ────────────────────────────────────────────────────
export type MainTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  OrdersTab: NavigatorScreenParams<OrdersStackParamList>;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// ── Root Stack ──────────────────────────────────────────────────────
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

// Re-export for use with useNavigation / useRoute
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
