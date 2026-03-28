import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { dispatchApi, type Delivery } from '@foodrush/shared/api';
import { Button } from '@foodrush/shared/components';
import type { DeliveriesStackParamList } from '@/navigation/types';

// ── Theme constants ─────────────────────────────────────────────────
const TEAL = '#00C896';
const AMBER = '#FFBE0B';

// ── Delivery status FSM ─────────────────────────────────────────────
export type DeliveryStatus =
  | 'accepted'
  | 'en_route_to_restaurant'
  | 'arrived_at_restaurant'
  | 'picked_up'
  | 'en_route_to_customer'
  | 'arrived_at_customer'
  | 'delivered';

const STATUS_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus | null> = {
  accepted: 'en_route_to_restaurant',
  en_route_to_restaurant: 'arrived_at_restaurant',
  arrived_at_restaurant: 'picked_up',
  picked_up: 'en_route_to_customer',
  en_route_to_customer: 'arrived_at_customer',
  arrived_at_customer: 'delivered',
  delivered: null,
};

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  accepted: 'Navigate to Restaurant',
  en_route_to_restaurant: 'Arrived at Restaurant',
  arrived_at_restaurant: 'Picked Up Order',
  picked_up: 'Navigate to Customer',
  en_route_to_customer: 'Arrived at Customer',
  arrived_at_customer: 'Complete Delivery',
  delivered: 'Delivered',
};

// ── Props ───────────────────────────────────────────────────────────
interface DeliveryStatusControlsProps {
  deliveryId: string;
  currentStatus: DeliveryStatus;
  onStatusChange: (newStatus: DeliveryStatus, delivery: Delivery) => void;
}

type NavProp = NativeStackNavigationProp<DeliveriesStackParamList, 'ActiveDelivery'>;

// ── Component ───────────────────────────────────────────────────────
export function DeliveryStatusControls({
  deliveryId,
  currentStatus,
  onStatusChange,
}: DeliveryStatusControlsProps): React.JSX.Element | null {
  const navigation = useNavigation<NavProp>();
  const [transitioning, setTransitioning] = useState(false);

  const nextStatus = STATUS_TRANSITIONS[currentStatus];

  const handleTransition = useCallback(async () => {
    if (!nextStatus) return;

    setTransitioning(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const updated = await dispatchApi.updateDeliveryStatus(deliveryId, {
        status: nextStatus,
      });

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onStatusChange(nextStatus, updated);

      // Navigate to pickup/dropoff screens for specific transitions
      if (nextStatus === 'arrived_at_restaurant') {
        navigation.navigate('Pickup', {
          deliveryId,
          orderId: updated.orderId,
        });
      } else if (nextStatus === 'arrived_at_customer') {
        navigation.navigate('Dropoff', {
          deliveryId,
          orderId: updated.orderId,
        });
      }
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to update delivery status. Please try again.');
    } finally {
      setTransitioning(false);
    }
  }, [deliveryId, nextStatus, onStatusChange, navigation]);

  if (!nextStatus) return null;

  const buttonLabel = STATUS_LABELS[currentStatus];
  const isNavigationAction = currentStatus === 'accepted' || currentStatus === 'picked_up';

  return (
    <View style={styles.container}>
      <Button
        title={buttonLabel}
        variant="primary"
        size="lg"
        loading={transitioning}
        onPress={handleTransition}
        style={[
          styles.actionButton,
          { backgroundColor: isNavigationAction ? AMBER : TEAL },
        ]}
      />
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  actionButton: {
    minHeight: 56,
    borderRadius: 16,
  },
});