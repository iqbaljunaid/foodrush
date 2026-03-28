import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Badge } from '@foodrush/shared/components';
import { useRealtimeChannel, type RealtimeMessage } from '@foodrush/shared/hooks/useRealtimeChannel';
import { orderApi, type OrderStatus } from '@foodrush/shared/api';
import { useActiveOrderStore, type CourierLocation } from '@/store/activeOrder';
import type { OrdersStackParamList } from '@/navigation/types';

type TrackingRoute = RouteProp<OrdersStackParamList, 'OrderTracking'>;

// ── Status timeline config ──────────────────────────────────────────

interface StatusStep {
  key: OrderStatus;
  label: string;
}

const STATUS_STEPS: StatusStep[] = [
  { key: 'placed', label: 'Order Placed' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'delivered', label: 'Delivered' },
];

function getStatusIndex(status: OrderStatus): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

// ── Realtime payload ────────────────────────────────────────────────

interface CourierPositionPayload {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  eta: number;
  status?: OrderStatus;
  courierName?: string;
  courierPhone?: string;
}

// ── ETA Countdown ───────────────────────────────────────────────────

function useEtaCountdown(etaMinutes: number | null): string {
  const [remaining, setRemaining] = useState(etaMinutes);

  useEffect(() => {
    setRemaining(etaMinutes);
  }, [etaMinutes]);

  useEffect(() => {
    if (remaining === null || remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 60_000);

    return () => clearInterval(interval);
  }, [remaining]);

  if (remaining === null) return 'Calculating...';
  if (remaining <= 0) return 'Arriving now';
  return `${remaining} min`;
}

// ── Status Timeline Component ───────────────────────────────────────

interface StatusTimelineProps {
  currentStatus: OrderStatus;
}

function StatusTimeline({ currentStatus }: StatusTimelineProps): React.JSX.Element {
  const activeIndex = getStatusIndex(currentStatus);

  return (
    <View style={styles.timeline} accessibilityLabel={`Order status: ${currentStatus}`}>
      {STATUS_STEPS.map((step, i) => {
        const completed = i <= activeIndex;
        const isCurrent = i === activeIndex;
        return (
          <View key={step.key} style={styles.timelineStep}>
            <View style={styles.timelineDotRow}>
              <View
                style={[
                  styles.timelineDot,
                  completed && styles.timelineDotCompleted,
                  isCurrent && styles.timelineDotCurrent,
                ]}
              />
              {i < STATUS_STEPS.length - 1 ? (
                <View
                  style={[
                    styles.timelineLine,
                    completed && styles.timelineLineCompleted,
                  ]}
                />
              ) : null}
            </View>
            <Text
              style={[
                styles.timelineLabel,
                completed && styles.timelineLabelCompleted,
                isCurrent && styles.timelineLabelCurrent,
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Tracking Screen ─────────────────────────────────────────────────

// Default region (centered on a generic location)
const DEFAULT_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

export function TrackingScreen(): React.JSX.Element {
  const route = useRoute<TrackingRoute>();
  const { orderId } = route.params;

  const mapRef = useRef<MapView>(null);

  const status = useActiveOrderStore((s) => s.status);
  const courierLocation = useActiveOrderStore((s) => s.courierLocation);
  const eta = useActiveOrderStore((s) => s.eta);
  const courierName = useActiveOrderStore((s) => s.courierName);
  const courierPhone = useActiveOrderStore((s) => s.courierPhone);
  const updateStatus = useActiveOrderStore((s) => s.updateStatus);
  const updateCourierLocation = useActiveOrderStore((s) => s.updateCourierLocation);
  const updateEta = useActiveOrderStore((s) => s.updateEta);
  const setCourier = useActiveOrderStore((s) => s.setCourier);

  const etaDisplay = useEtaCountdown(eta);

  // Fetch initial order data
  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.getOrder(orderId),
  });

  useEffect(() => {
    if (orderQuery.data) {
      updateStatus(orderQuery.data.status);
    }
  }, [orderQuery.data, updateStatus]);

  // Realtime courier position
  const { lastMessage } = useRealtimeChannel<CourierPositionPayload>(
    `order.${orderId}`,
  );

  useEffect(() => {
    if (!lastMessage) return;
    const payload = lastMessage.payload;

    updateCourierLocation({
      lat: payload.lat,
      lng: payload.lng,
      heading: payload.heading,
      speed: payload.speed,
    });

    if (payload.eta !== undefined) {
      updateEta(payload.eta);
    }
    if (payload.status) {
      updateStatus(payload.status);
    }
    if (payload.courierName && payload.courierPhone) {
      setCourier(payload.courierName, payload.courierPhone);
    }
  }, [lastMessage, updateCourierLocation, updateEta, updateStatus, setCourier]);

  // Animate map to courier
  useEffect(() => {
    if (courierLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: courierLocation.lat,
          longitude: courierLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500,
      );
    }
  }, [courierLocation]);

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: () =>
      orderApi.updateOrderStatus(orderId, {
        status: 'cancelled',
        actorId: '',
        reason: 'Customer cancelled',
      }),
    onSuccess: () => {
      updateStatus('cancelled');
    },
    onError: () => {
      Alert.alert('Error', 'Could not cancel the order. Please try again.');
    },
  });

  const canCancel = useMemo(() => {
    if (status !== 'placed' && status !== 'accepted') return false;
    if (!orderQuery.data) return false;
    const orderTime = new Date(orderQuery.data.createdAt).getTime();
    const twoMinutesMs = 2 * 60 * 1000;
    return Date.now() - orderTime < twoMinutesMs;
  }, [status, orderQuery.data]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(),
        },
      ],
    );
  }, [cancelMutation]);

  const handleCallCourier = useCallback(() => {
    if (courierPhone) {
      Linking.openURL(`tel:${courierPhone}`);
    }
  }, [courierPhone]);

  const currentStatus = status ?? orderQuery.data?.status ?? 'placed';

  return (
    <View style={styles.screen}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={DEFAULT_REGION}
        accessibilityLabel="Order tracking map"
      >
        {/* Customer pin */}
        <Marker
          coordinate={{ latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude }}
          title="You"
          pinColor="#FF6B35"
        />

        {/* Restaurant pin */}
        <Marker
          coordinate={{
            latitude: DEFAULT_REGION.latitude + 0.005,
            longitude: DEFAULT_REGION.longitude + 0.003,
          }}
          title="Restaurant"
          pinColor="#1A1A2E"
        />

        {/* Courier marker */}
        {courierLocation ? (
          <Marker
            coordinate={{
              latitude: courierLocation.lat,
              longitude: courierLocation.lng,
            }}
            title={courierName ?? 'Courier'}
            flat
            rotation={courierLocation.heading}
          >
            <View style={styles.courierMarker}>
              <Text style={styles.courierMarkerText}>🛵</Text>
            </View>
          </Marker>
        ) : null}
      </MapView>

      {/* Bottom panel */}
      <View style={styles.panel}>
        {/* ETA */}
        <View style={styles.etaRow}>
          <Text style={styles.etaLabel}>Estimated arrival</Text>
          <Text style={styles.etaValue} accessibilityLiveRegion="polite">
            {etaDisplay}
          </Text>
        </View>

        {/* Status badge */}
        <Badge
          label={currentStatus.replace('_', ' ').toUpperCase()}
          variant={currentStatus === 'delivered' ? 'success' : 'info'}
        />

        {/* Status timeline */}
        <StatusTimeline currentStatus={currentStatus} />

        {/* Courier info + actions */}
        {courierName ? (
          <View style={styles.courierInfo}>
            <View style={styles.courierDetails}>
              <Text style={styles.courierNameText}>{courierName}</Text>
              <Text style={styles.courierRoleText}>Your courier</Text>
            </View>
            <Pressable
              onPress={handleCallCourier}
              style={styles.callButton}
              accessibilityRole="button"
              accessibilityLabel={`Call courier ${courierName}`}
            >
              <Text style={styles.callButtonText}>📞 Call</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Cancel button */}
        {canCancel ? (
          <Pressable
            onPress={handleCancel}
            style={styles.cancelButton}
            accessibilityRole="button"
            accessibilityLabel="Cancel order"
            disabled={cancelMutation.isPending}
          >
            <Text style={styles.cancelButtonText}>
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  etaLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  etaValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FF6B35',
  },
  timeline: {
    marginTop: 16,
    marginBottom: 16,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 28,
  },
  timelineDotRow: {
    alignItems: 'center',
    width: 20,
    marginRight: 10,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  timelineDotCompleted: {
    borderColor: '#FF6B35',
    backgroundColor: '#FF6B35',
  },
  timelineDotCurrent: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 16,
    backgroundColor: '#E5E7EB',
  },
  timelineLineCompleted: {
    backgroundColor: '#FF6B35',
  },
  timelineLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    paddingTop: 0,
  },
  timelineLabelCompleted: {
    color: '#0D0D0D',
  },
  timelineLabelCurrent: {
    color: '#FF6B35',
    fontWeight: '700',
  },
  courierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 4,
  },
  courierDetails: {
    flex: 1,
  },
  courierNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D0D0D',
  },
  courierRoleText: {
    fontSize: 13,
    color: '#6B7280',
  },
  callButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FF6B3515',
    borderRadius: 8,
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  courierMarker: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courierMarkerText: {
    fontSize: 24,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF233C',
  },
});
