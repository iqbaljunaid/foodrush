import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { apiClient } from '../api/client';

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  receivedAt: string;
}

type NotificationHandler = (payload: NotificationPayload) => void;

export interface NotificationState {
  deviceToken: string | null;
  isRegistered: boolean;
  lastNotification: NotificationPayload | null;
  registerHandler: (type: string, handler: NotificationHandler) => () => void;
}

export const NotificationContext = createContext<NotificationState | null>(null);

interface NotificationProviderProps {
  children: ReactNode;
  /** Called by the native notification module when a token is received */
  onTokenReceived?: (callback: (token: string) => void) => () => void;
  /** Called by the native notification module when a notification is received */
  onNotificationReceived?: (callback: (payload: NotificationPayload) => void) => () => void;
}

export function NotificationProvider({
  children,
  onTokenReceived,
  onNotificationReceived,
}: NotificationProviderProps): React.JSX.Element {
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [lastNotification, setLastNotification] = useState<NotificationPayload | null>(null);
  const handlersRef = useRef<Map<string, Set<NotificationHandler>>>(new Map());

  const registerDeviceToken = useCallback(async (token: string) => {
    try {
      await apiClient.post('/notifications/devices', {
        token,
        platform: Platform.OS === 'ios' ? 'apns' : 'fcm',
        deviceId: `${Platform.OS}-${Date.now()}`,
      });
      setDeviceToken(token);
      setIsRegistered(true);
    } catch {
      setIsRegistered(false);
    }
  }, []);

  useEffect(() => {
    if (!onTokenReceived) return;
    const unsubscribe = onTokenReceived((token: string) => {
      void registerDeviceToken(token);
    });
    return unsubscribe;
  }, [onTokenReceived, registerDeviceToken]);

  useEffect(() => {
    if (!onNotificationReceived) return;
    const unsubscribe = onNotificationReceived((payload: NotificationPayload) => {
      setLastNotification(payload);
      const typeHandlers = handlersRef.current.get(payload.type);
      if (typeHandlers) {
        typeHandlers.forEach((handler) => handler(payload));
      }
    });
    return unsubscribe;
  }, [onNotificationReceived]);

  // Re-register on app foreground
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active' && deviceToken && !isRegistered) {
        void registerDeviceToken(deviceToken);
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [deviceToken, isRegistered, registerDeviceToken]);

  const registerHandler = useCallback((type: string, handler: NotificationHandler) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    handlersRef.current.get(type)!.add(handler);

    return () => {
      handlersRef.current.get(type)?.delete(handler);
      if (handlersRef.current.get(type)?.size === 0) {
        handlersRef.current.delete(type);
      }
    };
  }, []);

  const value = useMemo<NotificationState>(
    () => ({
      deviceToken,
      isRegistered,
      lastNotification,
      registerHandler,
    }),
    [deviceToken, isRegistered, lastNotification, registerHandler],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}