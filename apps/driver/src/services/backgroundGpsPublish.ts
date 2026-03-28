import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { useRealtimeChannel } from '@foodrush/shared/hooks/useRealtimeChannel';
import { useDriverStore } from '../store/driver';
import type { CourierLocationEvent } from '@foodrush/shared/types/events';

const PUBLISH_INTERVAL_MS = 3_000;

interface GpsPublisherOptions {
  /** Override interval for degraded mode (battery saver, poor network). */
  intervalMs?: number;
}

/**
 * Publishes courier GPS location to the realtime channel at a fixed interval
 * while the driver is online and has an active delivery.
 */
export function useBackgroundGpsPublish(options?: GpsPublisherOptions): void {
  const interval = options?.intervalMs ?? PUBLISH_INTERVAL_MS;

  const isOnline = useDriverStore((s) => s.isOnline);
  const activeDeliveryId = useDriverStore((s) => s.activeDeliveryId);
  const courierId = useDriverStore((s) => s.courierId);

  const channelTopic = courierId ? `courier.${courierId}` : '';
  const { send, status } = useRealtimeChannel<CourierLocationEvent>(channelTopic);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendRef = useRef(send);
  sendRef.current = send;

  const shouldPublish = isOnline && activeDeliveryId !== null && courierId !== null;

  useEffect(() => {
    if (!shouldPublish || status !== 'connected' || !courierId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    async function publishLocation(): Promise<void> {
      try {
        const location = await Location.getLastKnownPositionAsync();
        if (!location || !courierId) return;

        const event: CourierLocationEvent = {
          courierId,
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          heading: location.coords.heading ?? 0,
          speed: location.coords.speed ?? 0,
          timestamp: new Date(location.timestamp).toISOString(),
        };

        sendRef.current(event);
      } catch {
        // Silently skip on location read failure
      }
    }

    // Publish immediately, then on interval
    void publishLocation();
    intervalRef.current = setInterval(() => {
      void publishLocation();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [shouldPublish, status, courierId, interval]);
}
