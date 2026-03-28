import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  type ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRealtimeChannel } from '@foodrush/shared/hooks/useRealtimeChannel';
import { Card } from '@foodrush/shared/components';
import { useDriverStore } from '@/store/driver';
import type { DeliveriesStackParamList } from '@/navigation/types';

// ── Theme constants ─────────────────────────────────────────────────
const BG = '#0A0A0A';
const SURFACE = '#111111';
const TEAL = '#00C896';
const AMBER = '#FFBE0B';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_MUTED = '#9CA3AF';
const FONT_DISPLAY = 'Sora';
const FONT_BODY = 'DM Sans';

// ── Types ───────────────────────────────────────────────────────────
interface OfferPayload {
  offerId: string;
  restaurantName: string;
  cuisine: string;
  distanceKm: number;
  estimatedPayout: number;
  deliveryEtaMinutes: number;
  expiresAt: string;
}

type NavProp = NativeStackNavigationProp<DeliveriesStackParamList, 'DeliveryQueue'>;

const OFFER_TIMEOUT_SECONDS = 30;

// ── Countdown ring ──────────────────────────────────────────────────
function CountdownRing({
  expiresAt,
  onExpire,
}: {
  expiresAt: string;
  onExpire: () => void;
}): React.JSX.Element {
  const [remaining, setRemaining] = useState(() => {
    const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    return diff;
  });

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

  const progress = remaining / OFFER_TIMEOUT_SECONDS;
  const circumference = 2 * Math.PI * 20;
  const strokeDashoffset = circumference * (1 - progress);
  const color = remaining <= 10 ? '#FF3A5C' : AMBER;

  return (
    <View style={styles.countdownContainer}>
      <View style={styles.countdownSvgPlaceholder}>
        <View
          style={[
            styles.countdownArc,
            {
              borderColor: color,
              borderWidth: 3,
              opacity: progress,
            },
          ]}
        />
      </View>
      <Text style={[styles.countdownText, { color }]}>{remaining}s</Text>
    </View>
  );
}

// ── Pulsing dot ─────────────────────────────────────────────────────
function PulsingDot(): React.JSX.Element {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(scale);
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: 0.3 + 0.7 / scale.value,
  }));

  return (
    <View style={styles.emptyContainer}>
      <Animated.View style={[styles.pulsingDot, animStyle]} />
      <Text style={styles.emptyTitle}>Waiting for deliveries</Text>
      <Text style={styles.emptySubtext}>
        Stay online — offers will appear here
      </Text>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────
export function DeliveryQueueScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const isOnline = useDriverStore((s) => s.isOnline);
  const courierId = useDriverStore((s) => s.courierId);

  const topic = courierId ? `courier.${courierId}.offers` : '';
  const { lastMessage, status } = useRealtimeChannel<OfferPayload>(topic);

  const [offers, setOffers] = useState<OfferPayload[]>([]);

  useEffect(() => {
    if (lastMessage?.payload) {
      setOffers((prev) => {
        const exists = prev.some((o) => o.offerId === lastMessage.payload.offerId);
        if (exists) return prev;
        return [lastMessage.payload, ...prev];
      });
    }
  }, [lastMessage]);

  const handleOfferPress = useCallback(
    (offerId: string) => {
      navigation.navigate('OrderOffer', { offerId });
    },
    [navigation],
  );

  const handleOfferExpired = useCallback((offerId: string) => {
    setOffers((prev) => prev.filter((o) => o.offerId !== offerId));
  }, []);

  const renderOffer = useCallback(
    ({ item }: ListRenderItemInfo<OfferPayload>) => (
      <Card
        accessibilityLabel={`Delivery offer from ${item.restaurantName}`}
        onPress={() => handleOfferPress(item.offerId)}
        style={styles.offerCard}
      >
        <View style={styles.offerHeader}>
          <View style={styles.offerInfo}>
            <Text style={styles.restaurantName}>{item.restaurantName}</Text>
            <Text style={styles.cuisine}>{item.cuisine}</Text>
          </View>
          <CountdownRing
            expiresAt={item.expiresAt}
            onExpire={() => handleOfferExpired(item.offerId)}
          />
        </View>

        <View style={styles.offerDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Distance</Text>
            <Text style={styles.detailValue}>{item.distanceKm.toFixed(1)} km</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>ETA</Text>
            <Text style={styles.detailValue}>{item.deliveryEtaMinutes} min</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Payout</Text>
            <Text style={[styles.detailValue, styles.payoutValue]}>
              ${item.estimatedPayout.toFixed(2)}
            </Text>
          </View>
        </View>
      </Card>
    ),
    [handleOfferPress, handleOfferExpired],
  );

  const keyExtractor = useCallback((item: OfferPayload) => item.offerId, []);

  if (!isOnline) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.offlineContainer}>
          <Text style={styles.offlineTitle}>You are offline</Text>
          <Text style={styles.offlineSubtext}>Go online to receive delivery offers</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Delivery Queue</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, status === 'connected' && styles.statusDotConnected]} />
          <Text style={styles.statusText}>
            {status === 'connected' ? 'Live' : 'Connecting…'}
          </Text>
        </View>
      </View>

      {offers.length === 0 ? (
        <PulsingDot />
      ) : (
        <FlatList
          data={offers}
          renderItem={renderOffer}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: FONT_DISPLAY,
    color: TEXT_PRIMARY,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEXT_MUTED,
    marginRight: 6,
  },
  statusDotConnected: {
    backgroundColor: TEAL,
  },
  statusText: {
    fontSize: 13,
    fontFamily: FONT_BODY,
    color: TEXT_MUTED,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  offerCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  offerInfo: {
    flex: 1,
    marginRight: 12,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: FONT_DISPLAY,
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  cuisine: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    color: TEXT_MUTED,
  },
  offerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: FONT_BODY,
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONT_BODY,
    color: TEXT_PRIMARY,
  },
  payoutValue: {
    color: TEAL,
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 18,
  },
  countdownContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownSvgPlaceholder: {
    position: 'absolute',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownArc: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: FONT_DISPLAY,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  pulsingDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: TEAL,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: FONT_DISPLAY,
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    color: TEXT_MUTED,
  },
  offlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: FONT_DISPLAY,
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  offlineSubtext: {
    fontSize: 14,
    fontFamily: FONT_BODY,
    color: TEXT_MUTED,
  },
});