import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { dispatchApi, type RouteInfo, type RouteStep } from '@foodrush/shared/api';
import { Button } from '@foodrush/shared/components';
import type { DeliveriesStackParamList } from '@/navigation/types';

// ── Theme constants ─────────────────────────────────────────────────
const BG = '#0A0A0A';
const SURFACE = '#111111';
const SURFACE_MID = '#1C1C1C';
const TEAL = '#00C896';
const AMBER = '#FFBE0B';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_MUTED = '#9CA3AF';
const FONT_DISPLAY = 'Sora';
const FONT_BODY = 'DM Sans';
const REROUTE_THRESHOLD_METERS = 100;
const MIN_TAP_SIZE = 48;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Types ───────────────────────────────────────────────────────────
type RouteProp = NativeStackScreenProps<DeliveriesStackParamList, 'Navigation'>['route'];
type NavProp = NativeStackNavigationProp<DeliveriesStackParamList, 'Navigation'>;

interface ManeuverInfo {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const MANEUVER_MAP: Record<string, ManeuverInfo> = {
  'turn-left': { icon: 'arrow-back', label: 'Turn left' },
  'turn-right': { icon: 'arrow-forward', label: 'Turn right' },
  'turn-slight-left': { icon: 'arrow-back', label: 'Slight left' },
  'turn-slight-right': { icon: 'arrow-forward', label: 'Slight right' },
  'turn-sharp-left': { icon: 'arrow-back', label: 'Sharp left' },
  'turn-sharp-right': { icon: 'arrow-forward', label: 'Sharp right' },
  'uturn-left': { icon: 'return-up-back', label: 'U-turn' },
  'uturn-right': { icon: 'return-up-forward', label: 'U-turn' },
  straight: { icon: 'arrow-up', label: 'Continue straight' },
  merge: { icon: 'git-merge', label: 'Merge' },
  roundabout: { icon: 'sync', label: 'Roundabout' },
  arrive: { icon: 'flag', label: 'Arrive' },
};

function getManeuver(maneuver: string): ManeuverInfo {
  return MANEUVER_MAP[maneuver] ?? { icon: 'arrow-up', label: 'Continue' };
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

function formatEta(minutes: number): string {
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hrs}h ${mins}m`;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ── Main screen ─────────────────────────────────────────────────────
export function NavigationScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const routeParams = useRoute<RouteProp>();
  const { deliveryId, destinationType } = routeParams.params;

  const mapRef = useRef<MapView>(null);

  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isRerouting, setIsRerouting] = useState(false);
  const [arrived, setArrived] = useState(false);

  // Keep screen awake during navigation
  useEffect(() => {
    void activateKeepAwakeAsync('navigation');
    return () => {
      deactivateKeepAwake('navigation');
    };
  }, []);

  // Fetch route data
  const fetchRoute = useCallback(async () => {
    try {
      const route = await dispatchApi.getRoute(deliveryId);
      setRouteInfo(route);
      setCurrentStepIndex(0);
    } catch {
      Alert.alert('Error', 'Failed to load route. Please try again.');
    } finally {
      setLoading(false);
      setIsRerouting(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    void fetchRoute();
  }, [fetchRoute]);

  // Watch user location for deviation detection
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    async function startWatching() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
        },
        (location) => {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        },
      );
    }

    void startWatching();
    return () => {
      subscription?.remove();
    };
  }, []);

  // Route coordinates from polyline
  const routeCoordinates = useMemo(() => {
    if (!routeInfo?.polyline) return [];
    try {
      return JSON.parse(routeInfo.polyline) as Array<{
        latitude: number;
        longitude: number;
      }>;
    } catch {
      return [];
    }
  }, [routeInfo]);

  // Check for deviation and re-route
  useEffect(() => {
    if (!userLocation || routeCoordinates.length === 0 || isRerouting) return;

    let minDistance = Infinity;
    for (const coord of routeCoordinates) {
      const dist = haversineDistance(
        userLocation.latitude,
        userLocation.longitude,
        coord.latitude,
        coord.longitude,
      );
      if (dist < minDistance) minDistance = dist;
    }

    if (minDistance > REROUTE_THRESHOLD_METERS) {
      setIsRerouting(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      void fetchRoute();
    }
  }, [userLocation, routeCoordinates, isRerouting, fetchRoute]);

  // Advance step based on proximity
  useEffect(() => {
    if (!userLocation || !routeInfo?.steps) return;

    const steps = routeInfo.steps;
    let cumulativeDistance = 0;

    for (let i = 0; i < steps.length; i++) {
      cumulativeDistance += steps[i].distanceMeters;
      if (i > currentStepIndex) {
        // Check if we've passed the current step threshold
        const stepCoordIndex = Math.min(
          Math.floor((cumulativeDistance / (routeInfo.distanceKm * 1000)) * routeCoordinates.length),
          routeCoordinates.length - 1,
        );
        const stepCoord = routeCoordinates[stepCoordIndex];
        if (stepCoord) {
          const dist = haversineDistance(
            userLocation.latitude,
            userLocation.longitude,
            stepCoord.latitude,
            stepCoord.longitude,
          );
          if (dist < 30) {
            setCurrentStepIndex(i);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
        break;
      }
    }
  }, [userLocation, routeInfo, currentStepIndex, routeCoordinates]);

  const currentStep: RouteStep | null = routeInfo?.steps[currentStepIndex] ?? null;
  const maneuver = currentStep ? getManeuver(currentStep.maneuver) : null;

  const remainingDistanceKm = useMemo(() => {
    if (!routeInfo?.steps) return routeInfo?.distanceKm ?? 0;
    let total = 0;
    for (let i = currentStepIndex; i < routeInfo.steps.length; i++) {
      total += routeInfo.steps[i].distanceMeters;
    }
    return total / 1000;
  }, [routeInfo, currentStepIndex]);

  const remainingMinutes = useMemo(() => {
    if (!routeInfo?.steps) return routeInfo?.durationMinutes ?? 0;
    let total = 0;
    for (let i = currentStepIndex; i < routeInfo.steps.length; i++) {
      total += routeInfo.steps[i].durationSeconds;
    }
    return total / 60;
  }, [routeInfo, currentStepIndex]);

  const handleArrived = useCallback(async () => {
    setArrived(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const nextStatus =
        destinationType === 'restaurant'
          ? 'arrived_at_restaurant'
          : 'arrived_at_customer';

      await dispatchApi.updateDeliveryStatus(deliveryId, {
        status: nextStatus,
      });

      navigation.goBack();
    } catch {
      setArrived(false);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    }
  }, [deliveryId, destinationType, navigation]);

  const handleMuteToggle = useCallback(() => {
    setIsMuted((prev) => !prev);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  if (loading || !routeInfo) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading route…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Full-screen map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation
        followsUserLocation
        userInterfaceStyle="dark"
        showsCompass={false}
      >
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={TEAL}
            strokeWidth={5}
          />
        )}
        {/* Destination marker */}
        {routeCoordinates.length > 0 && (
          <Marker
            coordinate={routeCoordinates[routeCoordinates.length - 1]}
            title={destinationType === 'restaurant' ? 'Restaurant' : 'Customer'}
            pinColor={destinationType === 'restaurant' ? AMBER : TEAL}
          />
        )}
      </MapView>

      {/* Top instruction banner */}
      {currentStep && maneuver && (
        <View
          style={[styles.instructionBanner, { top: insets.top }]}
          accessibilityRole="header"
          accessibilityLabel={`${maneuver.label}, ${formatDistance(currentStep.distanceMeters)}, ${currentStep.instruction}`}
        >
          <Ionicons
            name={maneuver.icon}
            size={36}
            color={TEXT_PRIMARY}
            style={styles.maneuverIcon}
          />
          <View style={styles.instructionText}>
            <Text
              style={styles.instructionDistance}
              numberOfLines={1}
            >
              {formatDistance(currentStep.distanceMeters)}
            </Text>
            <Text
              style={styles.instructionStreet}
              numberOfLines={2}
            >
              {currentStep.instruction}
            </Text>
          </View>
        </View>
      )}

      {/* Top-right ETA/distance overlay */}
      <View
        style={[styles.etaOverlay, { top: insets.top + 80 }]}
        accessibilityLabel={`Remaining: ${formatDistance(remainingDistanceKm * 1000)}, ETA: ${formatEta(remainingMinutes)}`}
      >
        <Text style={styles.etaValue}>
          {formatDistance(remainingDistanceKm * 1000)}
        </Text>
        <Text style={styles.etaLabel}>
          {formatEta(remainingMinutes)}
        </Text>
      </View>

      {/* Re-routing indicator */}
      {isRerouting && (
        <View style={styles.rerouteOverlay}>
          <ActivityIndicator size="small" color={AMBER} />
          <Text style={styles.rerouteText}>Re-routing…</Text>
        </View>
      )}

      {/* Mute button */}
      <Pressable
        onPress={handleMuteToggle}
        accessibilityRole="button"
        accessibilityLabel={isMuted ? 'Unmute navigation' : 'Mute navigation'}
        accessibilityState={{ selected: isMuted }}
        style={[styles.muteButton, { top: insets.top + 80 }]}
        hitSlop={8}
      >
        <Ionicons
          name={isMuted ? 'volume-mute' : 'volume-high'}
          size={24}
          color={isMuted ? TEXT_MUTED : TEXT_PRIMARY}
        />
      </Pressable>

      {/* Bottom "I've Arrived" button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          title="I've Arrived"
          variant="primary"
          size="lg"
          loading={arrived}
          onPress={handleArrived}
          style={styles.arrivedButton}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: FONT_BODY,
    fontSize: 16,
    color: TEXT_MUTED,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  instructionBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  maneuverIcon: {
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
  },
  instructionDistance: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 28,
    color: TEAL,
    marginBottom: 2,
  },
  instructionStreet: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  etaOverlay: {
    position: 'absolute',
    right: 16,
    backgroundColor: SURFACE,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  etaValue: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  etaLabel: {
    fontFamily: FONT_BODY,
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  rerouteOverlay: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  rerouteText: {
    fontFamily: FONT_BODY,
    fontSize: 14,
    color: AMBER,
    fontWeight: '600',
  },
  muteButton: {
    position: 'absolute',
    left: 16,
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    borderRadius: MIN_TAP_SIZE / 2,
    backgroundColor: SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: BG,
  },
  arrivedButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: TEAL,
  },
});