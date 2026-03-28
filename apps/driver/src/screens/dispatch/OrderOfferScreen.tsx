import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
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
import { dispatchApi } from '@foodrush/shared/api';
import { Button } from '@foodrush/shared/components';
import { useDriverStore } from '@/store/driver';
import type { DeliveriesStackParamList } from '@/navigation/types';

// ── Theme constants ─────────────────────────────────────────────────
const BG = '#0A0A0A';
const SURFACE = '#111111';
const SURFACE_MID = '#1C1C1C';
const TEAL = '#00C896';
const AMBER = '#FFBE0B';
const DANGER = '#FF3A5C';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_MUTED = '#9CA3AF';
const FONT_DISPLAY = 'Sora';
const FONT_BODY = 'DM Sans';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const OFFER_TIMEOUT_SECONDS = 30;

// ── Types ───────────────────────────────────────────────────────────
type RouteProp = NativeStackScreenProps<DeliveriesStackParamList, 'OrderOffer'>['route'];
type NavProp = NativeStackNavigationProp<DeliveriesStackParamList, 'OrderOffer'>;

interface OfferDetail {
  offerId: string;
  restaurantName: string;
  restaurantLocation: { latitude: number; longitude: number };
  deliveryLocation: { latitude: number; longitude: number };
  routePolyline: Array<{ latitude: number; longitude: number }>;
  baseFare: number;
  distanceFee: number;
  estimatedTip: number;
  total: number;
  distanceKm: number;
  deliveryEtaMinutes: number;
  expiresAt: string;
}

// ── Countdown ring corner ───────────────────────────────────────────
function CountdownCorner({
  expiresAt,
  onExpire,
}: {
  expiresAt: string;
  onExpire: () => void;
}): React.JSX.Element {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(diff);
      if (diff <= 0) {
        clearInterval(timer);
        onExpireRef.current();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const color = remaining <= 10 ? DANGER : AMBER;
  const progress = remaining / OFFER_TIMEOUT_SECONDS;

  return (
    <View style={styles.countdownCorner}>
      <View
        style={[
          styles.countdownRing,
          {
            borderColor: color,
            borderWidth: 3,
            opacity: progress,
          },
        ]}
      />
      <Text style={[styles.countdownText, { color }]}>{remaining}s</Text>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────
export function OrderOfferScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp>();
  const { offerId } = route.params;
  const setActiveDelivery = useDriverStore((s) => s.setActiveDelivery);

  const [loading, setLoading] = useState(false);
  const [declining, setDeclining] = useState(false);

  // In production, fetch from API. Using placeholder data for the screen layout.
  const [offer] = useState<OfferDetail>({
    offerId,
    restaurantName: 'Loading…',
    restaurantLocation: { latitude: 37.785, longitude: -122.406 },
    deliveryLocation: { latitude: 37.775, longitude: -122.418 },
    routePolyline: [
      { latitude: 37.785, longitude: -122.406 },
      { latitude: 37.780, longitude: -122.412 },
      { latitude: 37.775, longitude: -122.418 },
    ],
    baseFare: 0,
    distanceFee: 0,
    estimatedTip: 0,
    total: 0,
    distanceKm: 0,
    deliveryEtaMinutes: 0,
    expiresAt: new Date(Date.now() + OFFER_TIMEOUT_SECONDS * 1000).toISOString(),
  });

  const handleAccept = useCallback(async () => {
    setLoading(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const delivery = await dispatchApi.acceptOffer(offerId);
      setActiveDelivery(delivery.id);
      navigation.replace('ActiveDelivery', { deliveryId: delivery.id });
    } catch {
      Alert.alert('Error', 'Failed to accept offer. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [offerId, navigation, setActiveDelivery]);

  const handleDecline = useCallback(async () => {
    setDeclining(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      await dispatchApi.rejectOffer(offerId);
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to decline offer.');
    } finally {
      setDeclining(false);
    }
  }, [offerId, navigation]);

  const handleExpire = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    navigation.goBack();
  }, [navigation]);

  const mapRegion = {
    latitude:
      (offer.restaurantLocation.latitude + offer.deliveryLocation.latitude) / 2,
    longitude:
      (offer.restaurantLocation.longitude + offer.deliveryLocation.longitude) / 2,
    latitudeDelta:
      Math.abs(offer.restaurantLocation.latitude - offer.deliveryLocation.latitude) * 2 + 0.01,
    longitudeDelta:
      Math.abs(offer.restaurantLocation.longitude - offer.deliveryLocation.longitude) * 2 + 0.01,
  };

  return (
    <View style={styles.screen}>
      {/* Map preview */}
      <MapView
        style={styles.map}
        region={mapRegion}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled={false}
        zoomEnabled={false}
        userInterfaceStyle="dark"
      >
        <Marker
          coordinate={offer.restaurantLocation}
          title={offer.restaurantName}
          pinColor="#FF8C00"
        />
        <Marker
          coordinate={offer.deliveryLocation}
          title="Delivery Destination"
          pinColor={TEAL}
        />
        <Polyline
          coordinates={offer.routePolyline}
          strokeColor={TEAL}
          strokeWidth={4}
        />
      </MapView>

      {/* Countdown corner */}
      <View style={[styles.cornerOverlay, { top: insets.top + 12 }]}>
        <CountdownCorner expiresAt={offer.expiresAt} onExpire={handleExpire} />
      </View>

      {/* Bottom panel */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.restaurantTitle}>{offer.restaurantName}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{offer.distanceKm.toFixed(1)} km</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>{offer.deliveryEtaMinutes} min</Text>
        </View>

        {/* Payout breakdown */}
        <View style={styles.payoutCard}>
          <View style={styles.payoutRow}>
            <Text style={styles.payoutLabel}>Base fare</Text>
            <Text style={styles.payoutAmount}>${offer.baseFare.toFixed(2)}</Text>
          </View>
          <View style={styles.payoutRow}>
            <Text style={styles.payoutLabel}>Distance fee</Text>
            <Text style={styles.payoutAmount}>${offer.distanceFee.toFixed(2)}</Text>
          </View>
          <View style={styles.payoutRow}>
            <Text style={styles.payoutLabel}>Est. tip</Text>
            <Text style={styles.payoutAmount}>${offer.estimatedTip.toFixed(2)}</Text>
          </View>
          <View style={styles.payoutDivider} />
          <View style={styles.payoutRow}>
            <Text style={styles.payoutTotalLabel}>Total</Text>
            <Text style={styles.payoutTotal}>${offer.total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Button
            title="DECLINE"
            variant="ghost"
            size="lg"
            loading={declining}
            disabled={loading}
            onPress={handleDecline}
            style={styles.declineButton}
          />
          <Button
            title="ACCEPT"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={declining}
            onPress={handleAccept}
            style={styles.acceptButton}
          />
        </View>
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
  map: {
    flex: 1,
  },
  cornerOverlay: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  countdownCorner: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 28,
  },
  countdownRing: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  countdownText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: FONT_DISPLAY,
  },
  bottomPanel: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  restaurantTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: FONT_DISPLAY,
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  metaText: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    color: TEXT_MUTED,
  },
  metaDot: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginHorizontal: 8,
  },
  payoutCard: {
    backgroundColor: SURFACE_MID,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  payoutLabel: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    color: TEXT_MUTED,
  },
  payoutAmount: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    color: TEXT_PRIMARY,
  },
  payoutDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 8,
  },
  payoutTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONT_DISPLAY,
    color: TEXT_PRIMARY,
  },
  payoutTotal: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: FONT_DISPLAY,
    color: TEAL,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    minHeight: 56,
    borderColor: DANGER,
  },
  acceptButton: {
    flex: 1,
    minHeight: 56,
    backgroundColor: TEAL,
  },
});