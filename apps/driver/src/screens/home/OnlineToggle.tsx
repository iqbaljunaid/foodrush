import React, { useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  cancelAnimation,
  interpolateColor,
} from 'react-native-reanimated';
import { useDriverStore } from '../../store/driver';
import {
  startLocationUpdates,
  stopLocationUpdates,
} from '../../services/gpsService';

const TEAL = '#00C896';
const SURFACE = '#111111';
const NEAR_BLACK = '#0A0A0A';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_MUTED = '#9CA3AF';

const TOGGLE_SIZE = 160;
const RIPPLE_SIZE = 200;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function OnlineToggle(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const isOnline = useDriverStore((s) => s.isOnline);
  const toggleOnline = useDriverStore((s) => s.toggleOnline);
  const todayEarnings = useDriverStore((s) => s.todayEarnings);
  const tripCount = useDriverStore((s) => s.tripCount);
  const onlineHours = useDriverStore((s) => s.onlineHours);

  // Pulsing animation for offline state
  const pulseScale = useSharedValue(1);
  // Ripple animation on toggle
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  // Color transition
  const colorProgress = useSharedValue(isOnline ? 1 : 0);

  useEffect(() => {
    if (!isOnline) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 300 });
    }
  }, [isOnline, pulseScale]);

  useEffect(() => {
    colorProgress.value = withTiming(isOnline ? 1 : 0, { duration: 400 });
  }, [isOnline, colorProgress]);

  const handleToggle = useCallback(async () => {
    // Trigger ripple
    rippleScale.value = 0;
    rippleOpacity.value = 0.4;
    rippleScale.value = withSpring(2.5, { damping: 15, stiffness: 80 });
    rippleOpacity.value = withTiming(0, { duration: 800 });

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    if (!isOnline) {
      const started = await startLocationUpdates();
      if (started) {
        toggleOnline();
      }
    } else {
      toggleOnline();
      await stopLocationUpdates();
    }
  }, [isOnline, toggleOnline, rippleScale, rippleOpacity]);

  const toggleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    backgroundColor: interpolateColor(
      colorProgress.value,
      [0, 1],
      [SURFACE, TEAL],
    ),
  }));

  const rippleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const formatCurrency = (amount: number): string =>
    `$${amount.toFixed(2)}`;

  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Status text */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>
          {isOnline ? 'You are' : 'You are'}
        </Text>
        <Text style={[styles.statusValue, isOnline && styles.statusOnline]}>
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </Text>
      </View>

      {/* Toggle button area */}
      <View style={styles.toggleArea}>
        {/* Ripple effect */}
        <Animated.View
          style={[styles.ripple, rippleAnimatedStyle]}
          pointerEvents="none"
        />

        {/* Main toggle button */}
        <AnimatedPressable
          onPress={handleToggle}
          style={[styles.toggleButton, toggleAnimatedStyle]}
          accessibilityRole="switch"
          accessibilityState={{ checked: isOnline }}
          accessibilityLabel={isOnline ? 'Go offline' : 'Go online'}
          accessibilityHint={
            isOnline
              ? 'Double tap to stop receiving delivery requests'
              : 'Double tap to start receiving delivery requests'
          }
        >
          <Text style={[styles.toggleIcon, isOnline && styles.toggleIconOnline]}>
            {isOnline ? '●' : '○'}
          </Text>
          <Text style={[styles.toggleText, isOnline && styles.toggleTextOnline]}>
            {isOnline ? 'ON' : 'GO'}
          </Text>
        </AnimatedPressable>
      </View>

      {/* Earnings summary */}
      <View style={styles.earningsContainer}>
        <Text style={styles.earningsTitle}>Today's Summary</Text>
        <View style={styles.earningsRow}>
          <View style={styles.earningsStat}>
            <Text style={styles.earningsValue}>
              {formatCurrency(todayEarnings)}
            </Text>
            <Text style={styles.earningsLabel}>Earned</Text>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsStat}>
            <Text style={styles.earningsValue}>{tripCount}</Text>
            <Text style={styles.earningsLabel}>Trips</Text>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsStat}>
            <Text style={styles.earningsValue}>{formatHours(onlineHours)}</Text>
            <Text style={styles.earningsLabel}>Online</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NEAR_BLACK,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 32,
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 48,
  },
  statusLabel: {
    fontFamily: 'DM Sans',
    fontSize: 18,
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  statusValue: {
    fontFamily: 'Sora',
    fontSize: 32,
    fontWeight: '700',
    color: TEXT_MUTED,
    letterSpacing: 4,
  },
  statusOnline: {
    color: TEAL,
  },
  toggleArea: {
    justifyContent: 'center',
    alignItems: 'center',
    width: RIPPLE_SIZE * 2.5,
    height: RIPPLE_SIZE * 2.5,
  },
  ripple: {
    position: 'absolute',
    width: RIPPLE_SIZE,
    height: RIPPLE_SIZE,
    borderRadius: RIPPLE_SIZE / 2,
    backgroundColor: TEAL,
  },
  toggleButton: {
    width: TOGGLE_SIZE,
    height: TOGGLE_SIZE,
    borderRadius: TOGGLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#2A2A2A',
    minHeight: 48,
    minWidth: 48,
  },
  toggleIcon: {
    fontSize: 28,
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  toggleIconOnline: {
    color: NEAR_BLACK,
  },
  toggleText: {
    fontFamily: 'Sora',
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_MUTED,
  },
  toggleTextOnline: {
    color: NEAR_BLACK,
  },
  earningsContainer: {
    width: '100%',
    paddingHorizontal: 24,
  },
  earningsTitle: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  earningsRow: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningsStat: {
    flex: 1,
    alignItems: 'center',
  },
  earningsValue: {
    fontFamily: 'Sora',
    fontSize: 22,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  earningsLabel: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: TEXT_MUTED,
  },
  earningsDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 8,
  },
});