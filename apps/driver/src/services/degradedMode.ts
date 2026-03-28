import { useEffect, useState } from 'react';
import * as Battery from 'expo-battery';
import NetInfo, { type NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';

const LOW_BATTERY_THRESHOLD = 0.2;
const DEGRADED_GPS_INTERVAL_MS = 15_000;
const NORMAL_GPS_INTERVAL_MS = 3_000;

const SLOW_NETWORK_TYPES: ReadonlySet<NetInfoStateType> = new Set([
  NetInfoStateType.cellular,
]);

export interface DegradedModeState {
  /** Whether the device is in degraded mode. */
  isDegraded: boolean;
  /** Whether battery is below threshold. */
  isLowBattery: boolean;
  /** Whether the connection is slow (2G or equivalent). */
  isSlowNetwork: boolean;
  /** GPS publish interval to use (ms). */
  gpsIntervalMs: number;
  /** Whether to disable satellite map layer. */
  disableMapSatellite: boolean;
  /** Banner message to show when degraded, or null. */
  bannerMessage: string | null;
}

function isSlowConnection(state: NetInfoState): boolean {
  if (!state.isConnected) return true;

  if (
    SLOW_NETWORK_TYPES.has(state.type) &&
    state.details &&
    'cellularGeneration' in state.details
  ) {
    const gen = state.details.cellularGeneration;
    return gen === '2g';
  }
  return false;
}

/**
 * Monitors battery level and network quality.
 * Returns degraded mode flags that UI and services should respect:
 * - Reduce GPS interval from 3s → 15s
 * - Show amber warning banner
 * - Disable satellite map tiles
 */
export function useDegradedMode(): DegradedModeState {
  const [isLowBattery, setIsLowBattery] = useState(false);
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);

  // Battery monitoring
  useEffect(() => {
    let subscription: Battery.Subscription | null = null;

    async function init(): Promise<void> {
      const level = await Battery.getBatteryLevelAsync();
      if (level >= 0) {
        setIsLowBattery(level < LOW_BATTERY_THRESHOLD);
      }
    }

    void init();

    subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setIsLowBattery(batteryLevel >= 0 && batteryLevel < LOW_BATTERY_THRESHOLD);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Network monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsSlowNetwork(isSlowConnection(state));
    });
    return () => unsubscribe();
  }, []);

  const isDegraded = isLowBattery || isSlowNetwork;

  let bannerMessage: string | null = null;
  if (isLowBattery && isSlowNetwork) {
    bannerMessage = 'Low battery & weak signal — reduced tracking active';
  } else if (isLowBattery) {
    bannerMessage = 'Low battery — reduced tracking to save power';
  } else if (isSlowNetwork) {
    bannerMessage = 'Weak signal — reduced tracking active';
  }

  return {
    isDegraded,
    isLowBattery,
    isSlowNetwork,
    gpsIntervalMs: isDegraded ? DEGRADED_GPS_INTERVAL_MS : NORMAL_GPS_INTERVAL_MS,
    disableMapSatellite: isDegraded,
    bannerMessage,
  };
}
