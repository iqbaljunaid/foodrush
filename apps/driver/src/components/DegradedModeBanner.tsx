import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import * as Battery from 'expo-battery';
import NetInfo, { type NetInfoCellularGeneration } from '@react-native-community/netinfo';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AMBER = '#FFBE0B';
const LOW_BATTERY_THRESHOLD = 0.2;
const SLOW_CONNECTIONS: Array<NetInfoCellularGeneration | null> = ['2g'];

export function DegradedModeBanner(): React.JSX.Element {
  const [isDegraded, setIsDegraded] = useState(false);
  const [reason, setReason] = useState('');
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-60);

  useEffect(() => {
    let batteryLow = false;
    let connectionSlow = false;

    const updateState = (): void => {
      const degraded = batteryLow || connectionSlow;
      setIsDegraded(degraded);
      if (batteryLow && connectionSlow) {
        setReason('Low battery & weak signal');
      } else if (batteryLow) {
        setReason('Low battery');
      } else if (connectionSlow) {
        setReason('Weak signal');
      }
    };

    const batterySubscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      batteryLow = batteryLevel >= 0 && batteryLevel < LOW_BATTERY_THRESHOLD;
      updateState();
    });

    // Check initial battery level
    void Battery.getBatteryLevelAsync().then((level) => {
      batteryLow = level >= 0 && level < LOW_BATTERY_THRESHOLD;
      updateState();
    });

    const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.type === 'cellular' && state.details) {
        const generation = (state.details as { cellularGeneration?: NetInfoCellularGeneration }).cellularGeneration ?? null;
        connectionSlow = SLOW_CONNECTIONS.includes(generation);
      } else {
        connectionSlow = false;
      }
      updateState();
    });

    return () => {
      batterySubscription.remove();
      netInfoUnsubscribe();
    };
  }, []);

  useEffect(() => {
    translateY.value = withTiming(isDegraded ? 0 : -60, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [isDegraded, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: insets.top + 4 },
        animatedStyle,
      ]}
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLabel={`Reduced accuracy mode: ${reason}`}
    >
      <Text style={styles.text}>
        ⚠ Reduced accuracy mode — {reason}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: AMBER,
    paddingBottom: 6,
    alignItems: 'center',
  },
  text: {
    fontFamily: 'Sora',
    fontSize: 12,
    fontWeight: '700',
    color: '#0A0A0A',
    letterSpacing: 0.3,
  },
});