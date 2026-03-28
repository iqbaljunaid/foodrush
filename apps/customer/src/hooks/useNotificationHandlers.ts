import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useNotificationHandler,
  type NotificationPayload,
} from '@foodrush/shared/notifications';
import type { RootStackParamList } from '../navigation/types';

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

// Badge count setter – uses expo-notifications when available
let pendingBadgeCount = 0;

function showToast(message: string): void {
  Alert.alert('FoodRush', message);
}

export function useCustomerNotificationHandlers(): void {
  const navigation = useNavigation<RootNavigation>();

  // order.accepted → toast + navigate to tracking
  const handleOrderAccepted = useCallback(
    (payload: NotificationPayload) => {
      const orderId = payload.data['orderId'];
      showToast('Your order is confirmed!');
      if (orderId) {
        navigation.navigate('Main', {
          screen: 'OrdersTab',
          params: { screen: 'OrderTracking', params: { orderId } },
        });
      }
    },
    [navigation],
  );

  // order.picked_up → toast
  const handleOrderPickedUp = useCallback(
    (_payload: NotificationPayload) => {
      showToast('Courier has your food!');
    },
    [],
  );

  // order.delivered → navigate to confirmation
  const handleOrderDelivered = useCallback(
    (payload: NotificationPayload) => {
      const orderId = payload.data['orderId'];
      if (orderId) {
        navigation.navigate('Main', {
          screen: 'OrdersTab',
          params: { screen: 'Confirmation', params: { orderId } },
        });
      }
    },
    [navigation],
  );

  // promo.available → increment badge count on Home tab
  const handlePromoAvailable = useCallback(
    (_payload: NotificationPayload) => {
      pendingBadgeCount += 1;
      // Badge count is surfaced via getPromoBadgeCount()
    },
    [],
  );

  useNotificationHandler('order.accepted', handleOrderAccepted);
  useNotificationHandler('order.picked_up', handleOrderPickedUp);
  useNotificationHandler('order.delivered', handleOrderDelivered);
  useNotificationHandler('promo.available', handlePromoAvailable);
}

/** Returns the current pending promo badge count and resets it. */
export function consumePromoBadgeCount(): number {
  const count = pendingBadgeCount;
  pendingBadgeCount = 0;
  return count;
}

/** Returns the current pending promo badge count without resetting. */
export function getPromoBadgeCount(): number {
  return pendingBadgeCount;
}
