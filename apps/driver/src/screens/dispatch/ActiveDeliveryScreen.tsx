import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { dispatchApi, type Delivery, type RouteInfo } from '@foodrush/shared/api';
import { Button } from '@foodrush/shared/components';
import { useDriverStore } from '@/store/driver';
import type { DeliveriesStackParamList } from '@/navigation/types';
import { DeliveryStatusControls, type DeliveryStatus } from './DeliveryStatusControls';

// ── Theme constants ─────────────────────────────────────────────────
const BG = '#0A0A0A';
const SURFACE = '#111111';
const SURFACE_MID = '#1C1C1C';
const TEAL = '#00C896';
const AMBER = '#FFBE0B';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_MUTED = '#9CA3AF';
const ORANGE = '#FF8C00';
const FONT_DISPLAY = 'Sora';
const FONT_BODY = 'DM Sans';

const BOTTOM_SHEET_HEIGHT = 200;

// ── Types ───────────────────────────────────────────────────────────
type RouteProp = NativeStackScreenProps<DeliveriesStackParamList, 'ActiveDelivery'>['route'];
type NavProp = NativeStackNavigationProp<DeliveriesStackParamList, 'ActiveDelivery'>;

interface StopInfo {
  name: string;
  distanceKm: number;
  etaMinutes: number;
  action: string;
  destinationType: 'restaurant' | 'customer';
}

function getNextStop(status: DeliveryStatus, delivery: Delivery | null, route: RouteInfo | null): StopInfo {
  const isRestaurantPhase = ['accepted', 'en_route_to_restaurant', 'arrived_at_restaurant'].includes(status);

  if (isRestaurantPhase) {
    return {
      name: 'Restaurant pickup',
      distanceKm: route?.distanceKm ?? 0,
      etaMinutes: route?.durationMinutes ?? 0,
      action: status === 'accepted'
        ? 'Navigate to Restaurant'
        : status === 'en_route_to_restaurant'
          ? 'Arrived at Restaurant'
          : 'Picked Up Order',
      destinationType: 'restaurant',
    };
  }

  return {
    name: 'Customer delivery',
    distanceKm: route?.distanceKm ?? 0,
    etaMinutes: route?.durationMinutes ?? 0,
    action: status === 'picked_up'
      ? 'Navigate to Customer'
      : status === 'en_route_to_customer'
        ? 'Arrived at Customer'
        : 'Complete Delivery',
    destinationType: 'customer',
  };
}

// ── Main screen ─────────────────────────────────────────────────────
export function ActiveDeliveryScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const routeParams = useRoute<RouteProp>();
  const { deliveryId } = routeParams.params;

  const clearActiveDelivery = useDriverStore((s) => s.clearActiveDelivery);
  const incrementTripCount = useDriverStore((s) => s.incrementTripCount);

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [currentStatus, setCurrentStatus] = useState<DeliveryStatus>('accepted');
  const [loadingMap, setLoadingMap] = useState(true);

  // Fetch delivery details
  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        const [del, rt] = await Promise.all([
          dispatchApi.getDelivery(deliveryId),
          dispatchApi.getRoute(deliveryId),
        ]);
        if (!mounted) return;
        setDelivery(del);
        setRouteInfo(rt);
        setCurrentStatus(del.status as DeliveryStatus);
      } catch {
        Alert.alert('Error', 'Failed to load delivery details.');
      }
    }
    void fetchData();
    return () => { mounted = false; };
  }, [deliveryId]);

  const routeCoordinates = useMemo(() => {
    if (!routeInfo?.polyline) return [];
    // Decode polyline string into coordinate array
    try {
      return JSON.parse(routeInfo.polyline) as Array<{ latitude: number; longitude: number }>;
    } catch {
      return [];
    }
  }, [routeInfo]);

  const mapRegion = useMemo(() => {
    if (!delivery) return undefined;
    return {
      latitude: (delivery.pickupLocation.latitude + delivery.deliveryLocation.latitude) / 2,
      longitude: (delivery.pickupLocation.longitude + delivery.deliveryLocation.longitude) / 2,
      latitudeDelta:
        Math.abs(delivery.pickupLocation.latitude - delivery.deliveryLocation.latitude) * 2 + 0.01,
      longitudeDelta:
        Math.abs(delivery.pickupLocation.longitude - delivery.deliveryLocation.longitude) * 2 + 0.01,
    };
  }, [delivery]);

  const stopInfo = useMemo(
    () => getNextStop(currentStatus, delivery, routeInfo),
    [currentStatus, delivery, routeInfo],
  );

  const handleStatusChange = useCallback(
    (newStatus: DeliveryStatus, updatedDelivery: Delivery) => {
      setCurrentStatus(newStatus);
      setDelivery(updatedDelivery);

      if (newStatus === 'delivered') {
        incrementTripCount();
        clearActiveDelivery();
        navigation.popToTop();
      }
    },
    [clearActiveDelivery, incrementTripCount, navigation],
  );

  const handleNavigatePress = useCallback(() => {
    navigation.navigate('Navigation', {
      deliveryId,
      destinationType: stopInfo.destinationType,
    });
  }, [deliveryId, navigation, stopInfo.destinationType]);

  if (!delivery || !mapRegion) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading delivery…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Full-screen map */}
      <MapView
        style={styles.map}
        region={mapRegion}
        showsUserLocation
        followsUserLocation
        userInterfaceStyle="dark"
        onMapReady={() => setLoadingMap(false)}
      >
        {/* Restaurant pin (orange) */}
        <Marker
          coordinate={{
            latitude: delivery.pickupLocation.latitude,
            longitude: delivery.pickupLocation.longitude,
          }}
          title="Restaurant"
          pinColor={ORANGE}
        />

        {/* Customer pin */}
        <Marker
          coordinate={{
            latitude: delivery.deliveryLocation.latitude,
            longitude: delivery.deliveryLocation.longitude,
          }}
          title="Customer"
          pinColor={TEAL}
        />

        {/* Route polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={TEAL}
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Bottom sheet */}
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHandle} />

        <View style={styles.stopRow}>
          <View style={styles.stopInfo}>
            <Text style={styles.stopName}>{stopInfo.name}</Text>
            <View style={styles.stopMeta}>
              <Text style={styles.stopMetaText}>
                {stopInfo.distanceKm.toFixed(1)} km
              </Text>
              <Text style={styles.stopMetaDot}>•</Text>
              <Text style={styles.stopMetaText}>
                {stopInfo.etaMinutes} min
              </Text>
            </View>
          </View>
        </View>

        <DeliveryStatusControls
          deliveryId={deliveryId}
          currentStatus={currentStatus}
          onStatusChange={handleStatusChange}
        />
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'DM Sans',
    color: TEXT_MUTED,
  },
  map: {
    flex: 1,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: BOTTOM_SHEET_HEIGHT,
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    marginBottom: 16,
  },
  stopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: FONT_DISPLAY,
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  stopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopMetaText: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    color: TEXT_MUTED,
  },
  stopMetaDot: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginHorizontal: 8,
  },
});