import { useContext, useEffect } from 'react';
import {
  NotificationContext,
  type NotificationPayload,
  type NotificationState,
} from './NotificationProvider';

export function useNotifications(): NotificationState {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function useNotificationHandler(
  type: string,
  handler: (payload: NotificationPayload) => void,
): void {
  const { registerHandler } = useNotifications();

  useEffect(() => {
    return registerHandler(type, handler);
  }, [type, handler, registerHandler]);
}