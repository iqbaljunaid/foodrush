import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useNotificationHandler,
  type NotificationPayload,
} from '@foodrush/shared/notifications';
import type { DriverRootStackParamList } from '../navigation/types';

type DriverNavigation = NativeStackNavigationProp<DriverRootStackParamList>;

/**
 * Registers push notification handlers for the driver app.
 * Call once near the root of the driver app tree (inside NavigationContainer).
 */
export function useDriverNotificationHandlers(): void {
  const navigation = useNavigation<DriverNavigation>();

  const handleNewOrder = useCallback(
    (_payload: NotificationPayload) => {
      navigation.navigate('Main', {
        screen: 'DeliveriesTab',
        params: { screen: 'DeliveryQueue' },
      });
    },
    [navigation],
  );

  useNotificationHandler('dispatch.new_order', handleNewOrder);
}
