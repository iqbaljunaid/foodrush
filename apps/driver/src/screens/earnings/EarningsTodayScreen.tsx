import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  dispatchApi,
  type EarningsResponse,
  type EarningsTrip,
} from '@foodrush/shared/api';
import { Card } from '@foodrush/shared/components';
import { useDriverStore } from '@/store/driver';
import type { EarningsStackParamList } from '@/navigation/types';

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
const STREAK_THRESHOLD = 5;
const RECENT_TRIPS_LIMIT = 5;

type NavProp = NativeStackNavigationProp<EarningsStackParamList, 'EarningsToday'>;

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

// ── Hero Metric Card ────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
}

function MetricCard({ label, value, icon, accessibilityLabel }: MetricCardProps): React.JSX.Element {
  return (
    <View
      style={styles.metricCard}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={24} color={TEAL} style={styles.metricIcon} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

// ── Trip Row ────────────────────────────────────────────────────────
interface TripRowProps {
  trip: EarningsTrip;
}

function TripRow({ trip }: TripRowProps): React.JSX.Element {
  const dateStr = new Date(trip.completedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View
      style={styles.tripRow}
      accessibilityRole="text"
      accessibilityLabel={`${trip.restaurantName}, earned ${formatCurrency(trip.payout + trip.tip)}, completed at ${dateStr}`}
    >
      <View style={styles.tripInfo}>
        <Text style={styles.tripRestaurant} numberOfLines={1}>
          {trip.restaurantName}
        </Text>
        <Text style={styles.tripMeta}>
          {dateStr} · {formatDuration(trip.duration)} · {trip.distance.toFixed(1)} km
        </Text>
      </View>
      <View style={styles.tripEarnings}>
        <Text style={styles.tripPayout}>
          {formatCurrency(trip.payout + trip.tip)}
        </Text>
        {trip.tip > 0 && (
          <Text style={styles.tripTip}>
            +{formatCurrency(trip.tip)} tip
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────
export function EarningsTodayScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const tripCount = useDriverStore((s) => s.tripCount);

  const [earnings, setEarnings] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEarnings = useCallback(async () => {
    try {
      const data = await dispatchApi.getEarnings({ period: 'today' });
      setEarnings(data);
    } catch {
      // Silent fail — show cached store data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchEarnings();
  }, [fetchEarnings]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchEarnings();
  }, [fetchEarnings]);

  const totalEarned = earnings?.total ?? 0;
  const totalTrips = earnings?.trips ?? tripCount;
  const onlineHours = earnings?.onlineHours ?? 0;
  const basePay = totalEarned - (earnings?.tips ?? 0);
  const tips = earnings?.tips ?? 0;
  const isStreak = totalTrips >= STREAK_THRESHOLD;
  const recentTrips = (earnings?.breakdown ?? []).slice(0, RECENT_TRIPS_LIMIT);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={TEAL}
        />
      }
    >
      {/* Header */}
      <Text style={styles.pageTitle}>Today's Earnings</Text>

      {/* Hero metrics */}
      <View style={styles.metricsRow}>
        <MetricCard
          label="Earned"
          value={formatCurrency(totalEarned)}
          icon="wallet"
          accessibilityLabel={`Total earned today: ${formatCurrency(totalEarned)}`}
        />
        <MetricCard
          label="Trips"
          value={String(totalTrips)}
          icon="car"
          accessibilityLabel={`Trips completed: ${totalTrips}`}
        />
        <MetricCard
          label="Online"
          value={`${onlineHours.toFixed(1)}h`}
          icon="time"
          accessibilityLabel={`Online hours: ${onlineHours.toFixed(1)} hours`}
        />
      </View>

      {/* Streak badge */}
      {isStreak && (
        <View
          style={styles.streakBadge}
          accessibilityRole="text"
          accessibilityLabel={`Streak: ${totalTrips} trips completed`}
        >
          <Ionicons name="flame" size={20} color={AMBER} />
          <Text style={styles.streakText}>
            {totalTrips}-trip streak!
          </Text>
        </View>
      )}

      {/* Tip breakdown */}
      <Card accessibilityLabel="Earnings breakdown" style={styles.breakdownCard}>
        <Text style={styles.sectionTitle}>Breakdown</Text>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Base pay</Text>
          <Text style={styles.breakdownValue}>{formatCurrency(basePay)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Tips</Text>
          <Text style={[styles.breakdownValue, styles.tipsValue]}>
            {formatCurrency(tips)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownTotalLabel}>Total</Text>
          <Text style={styles.breakdownTotal}>
            {formatCurrency(totalEarned)}
          </Text>
        </View>
      </Card>

      {/* Recent trips */}
      <View style={styles.tripsHeader}>
        <Text style={styles.sectionTitle}>Recent Trips</Text>
        <Pressable
          onPress={() => navigation.navigate('EarningsHistory')}
          accessibilityRole="link"
          accessibilityLabel="See full earnings history"
          style={styles.seeAllButton}
          hitSlop={8}
        >
          <Text style={styles.seeAllText}>See full history</Text>
          <Ionicons name="chevron-forward" size={16} color={TEAL} />
        </Pressable>
      </View>

      {recentTrips.length > 0 ? (
        recentTrips.map((trip) => (
          <TripRow key={trip.deliveryId} trip={trip} />
        ))
      ) : (
        <View style={styles.emptyTrips}>
          <Ionicons name="bicycle-outline" size={48} color={TEXT_MUTED} />
          <Text style={styles.emptyText}>No trips yet today</Text>
        </View>
      )}
    </ScrollView>
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
  content: {
    paddingHorizontal: 16,
  },
  pageTitle: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 26,
    color: TEXT_PRIMARY,
    marginBottom: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  metricIcon: {
    marginBottom: 8,
  },
  metricValue: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 22,
    color: TEAL,
    marginBottom: 4,
  },
  metricLabel: {
    fontFamily: FONT_BODY,
    fontSize: 12,
    color: TEXT_MUTED,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: `${AMBER}20`,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 16,
  },
  streakText: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 14,
    color: AMBER,
  },
  breakdownCard: {
    backgroundColor: SURFACE,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 16,
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownLabel: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEXT_MUTED,
  },
  breakdownValue: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  tipsValue: {
    color: TEAL,
  },
  breakdownTotalLabel: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  breakdownTotal: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 18,
    color: TEAL,
  },
  divider: {
    height: 1,
    backgroundColor: SURFACE_MID,
  },
  tripsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 48,
    paddingHorizontal: 4,
  },
  seeAllText: {
    fontFamily: FONT_BODY,
    fontSize: 14,
    color: TEAL,
    fontWeight: '600',
  },
  tripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  tripInfo: {
    flex: 1,
    marginRight: 12,
  },
  tripRestaurant: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEXT_PRIMARY,
    fontWeight: '500',
    marginBottom: 4,
  },
  tripMeta: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    color: TEXT_MUTED,
  },
  tripEarnings: {
    alignItems: 'flex-end',
  },
  tripPayout: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  tripTip: {
    fontFamily: FONT_BODY,
    fontSize: 12,
    color: TEAL,
    marginTop: 2,
  },
  emptyTrips: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    color: TEXT_MUTED,
  },
});