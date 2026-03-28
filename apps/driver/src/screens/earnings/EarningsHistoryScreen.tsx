import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  dispatchApi,
  type EarningsResponse,
  type EarningsTrip,
  type GetEarningsParams,
} from '@foodrush/shared/api';
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
const MIN_TAP_SIZE = 48;

type NavProp = NativeStackNavigationProp<EarningsStackParamList, 'EarningsHistory'>;

type PeriodFilter = 'week' | 'month';

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

// ── Bar chart ───────────────────────────────────────────────────────
interface BarChartProps {
  data: Array<{ label: string; value: number }>;
}

function BarChart({ data }: BarChartProps): React.JSX.Element {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View
      style={barStyles.container}
      accessibilityRole="image"
      accessibilityLabel="Earnings bar chart"
    >
      <View style={barStyles.barsRow}>
        {data.map((item, index) => {
          const heightPercent = (item.value / maxValue) * 100;
          const isHighest = item.value === maxValue && item.value > 0;

          return (
            <View key={`${item.label}-${index}`} style={barStyles.barColumn}>
              <Text
                style={[
                  barStyles.barValue,
                  isHighest && barStyles.barValueHighest,
                ]}
              >
                {item.value > 0 ? `$${Math.round(item.value)}` : ''}
              </Text>
              <View style={barStyles.barTrack}>
                <View
                  style={[
                    barStyles.barFill,
                    {
                      height: `${Math.max(heightPercent, 2)}%`,
                      backgroundColor: isHighest ? AMBER : TEAL,
                    },
                  ]}
                />
              </View>
              <Text style={barStyles.barLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '80%',
    height: 120,
    justifyContent: 'flex-end',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  barValue: {
    fontFamily: FONT_BODY,
    fontSize: 10,
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  barValueHighest: {
    color: AMBER,
    fontWeight: '600',
  },
  barLabel: {
    fontFamily: FONT_BODY,
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 6,
  },
});

// ── Trip Row ────────────────────────────────────────────────────────
function TripRow({ trip }: { trip: EarningsTrip }): React.JSX.Element {
  const dateStr = new Date(trip.completedAt).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
  const timeStr = new Date(trip.completedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View
      style={styles.tripRow}
      accessibilityRole="text"
      accessibilityLabel={`${trip.restaurantName}, ${formatCurrency(trip.payout + trip.tip)}, ${dateStr}`}
    >
      <View style={styles.tripInfo}>
        <Text style={styles.tripRestaurant} numberOfLines={1}>
          {trip.restaurantName}
        </Text>
        <Text style={styles.tripMeta}>
          {dateStr} · {timeStr} · {formatDuration(trip.duration)}
        </Text>
      </View>
      <View style={styles.tripEarnings}>
        <Text style={styles.tripPayout}>
          {formatCurrency(trip.payout + trip.tip)}
        </Text>
        {trip.tip > 0 && (
          <Text style={styles.tripTip}>+{formatCurrency(trip.tip)} tip</Text>
        )}
      </View>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────
export function EarningsHistoryScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const [period, setPeriod] = useState<PeriodFilter>('week');
  const [earnings, setEarnings] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEarnings = useCallback(async (selectedPeriod: PeriodFilter) => {
    try {
      const params: GetEarningsParams = { period: selectedPeriod };
      const data = await dispatchApi.getEarnings(params);
      setEarnings(data);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchEarnings(period);
  }, [period, fetchEarnings]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchEarnings(period);
  }, [period, fetchEarnings]);

  const handlePeriodChange = useCallback((newPeriod: PeriodFilter) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPeriod(newPeriod);
  }, []);

  // Build chart data
  const chartData = useMemo(() => {
    if (!earnings?.breakdown) return [];

    const grouped = new Map<string, number>();

    for (const trip of earnings.breakdown) {
      const date = new Date(trip.completedAt);
      const key =
        period === 'week'
          ? date.toLocaleDateString([], { weekday: 'short' })
          : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      grouped.set(key, (grouped.get(key) ?? 0) + trip.payout + trip.tip);
    }

    return Array.from(grouped.entries()).map(([label, value]) => ({
      label,
      value,
    }));
  }, [earnings, period]);

  const renderTrip = useCallback(({ item }: { item: EarningsTrip }) => {
    return <TripRow trip={item} />;
  }, []);

  const keyExtractor = useCallback((item: EarningsTrip) => item.deliveryId, []);

  const totalEarned = earnings?.total ?? 0;
  const totalTrips = earnings?.trips ?? 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.pageTitle}>Earnings History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Period toggle */}
      <View style={styles.toggleRow}>
        {(['week', 'month'] as const).map((p) => (
          <Pressable
            key={p}
            onPress={() => handlePeriodChange(p)}
            accessibilityRole="tab"
            accessibilityLabel={`This ${p}`}
            accessibilityState={{ selected: period === p }}
            style={[
              styles.toggleButton,
              period === p && styles.toggleButtonActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                period === p && styles.toggleTextActive,
              ]}
            >
              This {p === 'week' ? 'Week' : 'Month'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      ) : (
        <FlatList
          data={earnings?.breakdown ?? []}
          renderItem={renderTrip}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={TEAL}
            />
          }
          ListHeaderComponent={
            chartData.length > 0 ? <BarChart data={chartData} /> : null
          }
          ListEmptyComponent={
            <View style={styles.emptyTrips}>
              <Ionicons name="analytics-outline" size={48} color={TEXT_MUTED} />
              <Text style={styles.emptyText}>No earnings this period</Text>
            </View>
          }
        />
      )}

      {/* Sticky footer summary */}
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.footerStat}>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerValue}>{formatCurrency(totalEarned)}</Text>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerStat}>
          <Text style={styles.footerLabel}>Trips</Text>
          <Text style={styles.footerValue}>{totalTrips}</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backButton: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    flex: 1,
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 22,
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  headerSpacer: {
    width: MIN_TAP_SIZE,
  },
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: MIN_TAP_SIZE,
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: TEAL,
  },
  toggleText: {
    fontFamily: FONT_BODY,
    fontSize: 14,
    color: TEXT_MUTED,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: BG,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
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
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    color: TEXT_MUTED,
  },
  stickyFooter: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderTopWidth: 1,
    borderTopColor: SURFACE_MID,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerStat: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  footerLabel: {
    fontFamily: FONT_BODY,
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  footerValue: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 18,
    color: TEAL,
  },
  footerDivider: {
    width: 1,
    height: 32,
    backgroundColor: SURFACE_MID,
  },
});