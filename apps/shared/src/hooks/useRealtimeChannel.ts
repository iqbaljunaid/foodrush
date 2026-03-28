import { useCallback, useEffect, useRef, useState } from 'react';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? 'ws://localhost:3003/ws';
const MAX_BACKOFF_MS = 30_000;
const INITIAL_BACKOFF_MS = 1_000;

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface RealtimeMessage<T = unknown> {
  topic: string;
  type: string;
  payload: T;
  timestamp: string;
}

interface UseRealtimeChannelResult<T> {
  status: ConnectionStatus;
  lastMessage: RealtimeMessage<T> | null;
  send: (data: unknown) => void;
  disconnect: () => void;
}

export function useRealtimeChannel<T = unknown>(
  topic: string,
): UseRealtimeChannelResult<T> {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<RealtimeMessage<T> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const topicRef = useRef(topic);
  topicRef.current = topic;

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    clearReconnectTimer();
    setStatus('connecting');

    const url = `${WS_URL}?topic=${encodeURIComponent(topicRef.current)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) {
        ws.close();
        return;
      }
      retryCountRef.current = 0;
      setStatus('connected');

      // Send subscription message
      ws.send(JSON.stringify({ action: 'subscribe', topic: topicRef.current }));
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(String(event.data)) as RealtimeMessage<T>;
        setLastMessage(data);
      } catch {
        // Ignore unparseable messages
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      scheduleReconnect();
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      ws.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearReconnectTimer]);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;

    setStatus('reconnecting');
    const backoff = Math.min(
      INITIAL_BACKOFF_MS * Math.pow(2, retryCountRef.current),
      MAX_BACKOFF_MS,
    );
    retryCountRef.current += 1;

    reconnectTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, backoff);
  }, [connect]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, [clearReconnectTimer]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [topic, connect, clearReconnectTimer]);

  return { status, lastMessage, send, disconnect };
}

export type { ConnectionStatus, RealtimeMessage, UseRealtimeChannelResult };