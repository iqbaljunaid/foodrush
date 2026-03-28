import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import type { CourierLocationEvent } from '@foodrush/shared/types/events';

export const COURIER_LOCATION_TASK = 'COURIER_LOCATION_TASK';

const PUBLISH_INTERVAL_NORMAL_MS = 3_000;
const PUBLISH_INTERVAL_LOW_BATTERY_MS = 15_000;
const LOW_BATTERY_THRESHOLD = 0.2;

let lastPublishTimestamp = 0;
let publishCallback: ((event: CourierLocationEvent) => void) | null = null;
let currentCourierId: string | null = null;

export function setGpsPublishCallback(
  callback: (event: CourierLocationEvent) => void,
): void {
  publishCallback = callback;
}

export function clearGpsPublishCallback(): void {
  publishCallback = null;
}

export function setGpsCourierId(courierId: string): void {
  currentCourierId = courierId;
}

async function isLowBattery(): Promise<boolean> {
  const level = await Battery.getBatteryLevelAsync();
  return level >= 0 && level < LOW_BATTERY_THRESHOLD;
}

TaskManager.defineTask(
  COURIER_LOCATION_TASK,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
    if (error) {
      console.error('[GPS] Background task error:', error.message);
      return;
    }

    if (!data?.locations?.length || !publishCallback || !currentCourierId) {
      return;
    }

    const lowBattery = await isLowBattery();
    const interval = lowBattery
      ? PUBLISH_INTERVAL_LOW_BATTERY_MS
      : PUBLISH_INTERVAL_NORMAL_MS;

    const now = Date.now();
    if (now - lastPublishTimestamp < interval) {
      return;
    }
    lastPublishTimestamp = now;

    const location = data.locations[data.locations.length - 1];
    if (!location) return;

    const event: CourierLocationEvent = {
      courierId: currentCourierId,
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      heading: location.coords.heading ?? 0,
      speed: location.coords.speed ?? 0,
      timestamp: new Date(location.timestamp).toISOString(),
    };

    publishCallback(event);
  },
);

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    return false;
  }

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') {
    return false;
  }

  return true;
}

export async function startLocationUpdates(): Promise<boolean> {
  const hasPermissions = await requestLocationPermissions();
  if (!hasPermissions) {
    return false;
  }

  const isTaskDefined = TaskManager.isTaskDefined(COURIER_LOCATION_TASK);
  if (!isTaskDefined) {
    console.error('[GPS] Task not defined');
    return false;
  }

  const hasStarted = await Location.hasStartedLocationUpdatesAsync(COURIER_LOCATION_TASK);
  if (hasStarted) {
    return true;
  }

  await Location.startLocationUpdatesAsync(COURIER_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: PUBLISH_INTERVAL_NORMAL_MS,
    distanceInterval: 5,
    deferredUpdatesInterval: PUBLISH_INTERVAL_NORMAL_MS,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'FoodRush Driver',
      notificationBody: 'Sharing your location with customers',
      notificationColor: '#00C896',
    },
  });

  return true;
}

export async function stopLocationUpdates(): Promise<void> {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(COURIER_LOCATION_TASK);
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(COURIER_LOCATION_TASK);
  }
  lastPublishTimestamp = 0;
}