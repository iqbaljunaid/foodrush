import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useCartStore, type CartItem } from '../../store/cart';
import { orderApi, type CreateOrderInput } from '@foodrush/shared/api';

// ── Constants ───────────────────────────────────────────────────────

const CART_STORAGE_KEY = '@foodrush/cart';
const QUEUED_ORDERS_KEY = '@foodrush/queued_orders';

// ── Queued order shape ──────────────────────────────────────────────

interface QueuedOrder {
  id: string;
  input: CreateOrderInput;
  queuedAt: string;
}

// ── Cart persistence ────────────────────────────────────────────────

interface PersistedCart {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
}

async function persistCart(cart: PersistedCart): Promise<void> {
  await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

async function loadPersistedCart(): Promise<PersistedCart | null> {
  const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as PersistedCart;
}

async function clearPersistedCart(): Promise<void> {
  await AsyncStorage.removeItem(CART_STORAGE_KEY);
}

// ── Queued order persistence ────────────────────────────────────────

async function loadQueuedOrders(): Promise<QueuedOrder[]> {
  const raw = await AsyncStorage.getItem(QUEUED_ORDERS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as QueuedOrder[];
}

async function saveQueuedOrders(orders: QueuedOrder[]): Promise<void> {
  await AsyncStorage.setItem(QUEUED_ORDERS_KEY, JSON.stringify(orders));
}

// ── Hook: useOfflineCart ────────────────────────────────────────────

export function useOfflineCart(): {
  isHydrated: boolean;
  queuedCount: number;
} {
  const [isHydrated, setIsHydrated] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  const items = useCartStore((s) => s.items);
  const restaurantId = useCartStore((s) => s.restaurantId);
  const restaurantName = useCartStore((s) => s.restaurantName);

  // Hydrate cart from AsyncStorage on mount
  useEffect(() => {
    let cancelled = false;
    void loadPersistedCart().then((persisted) => {
      if (cancelled || !persisted || persisted.items.length === 0) {
        setIsHydrated(true);
        return;
      }
      const store = useCartStore.getState();
      if (store.items.length === 0) {
        for (const item of persisted.items) {
          store.addItem(item);
        }
      }
      setIsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist cart on every change
  useEffect(() => {
    if (!isHydrated) return;
    void persistCart({ items, restaurantId, restaurantName });
  }, [items, restaurantId, restaurantName, isHydrated]);

  // Track queued order count
  useEffect(() => {
    void loadQueuedOrders().then((q) => setQueuedCount(q.length));
  }, []);

  return { isHydrated, queuedCount };
}

// ── Hook: useQueuedOrderSubmission ──────────────────────────────────

export function useQueuedOrderSubmission(): {
  queueOrder: (input: CreateOrderInput) => Promise<void>;
  flushQueue: () => Promise<number>;
  isFlushing: boolean;
} {
  const [isFlushing, setIsFlushing] = useState(false);

  const queueOrder = useCallback(async (input: CreateOrderInput) => {
    const queued = await loadQueuedOrders();
    const entry: QueuedOrder = {
      id: `queued_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      input,
      queuedAt: new Date().toISOString(),
    };
    queued.push(entry);
    await saveQueuedOrders(queued);
  }, []);

  const flushQueue = useCallback(async (): Promise<number> => {
    const queued = await loadQueuedOrders();
    if (queued.length === 0) return 0;

    setIsFlushing(true);
    let submitted = 0;
    const remaining: QueuedOrder[] = [];

    for (const order of queued) {
      try {
        await orderApi.create(order.input);
        submitted++;
      } catch {
        remaining.push(order);
      }
    }

    await saveQueuedOrders(remaining);
    if (submitted > 0) {
      await clearPersistedCart();
      useCartStore.getState().clearCart();
    }
    setIsFlushing(false);
    return submitted;
  }, []);

  return { queueOrder, flushQueue, isFlushing };
}

// ── Hook: useNetworkSync ────────────────────────────────────────────

export function useNetworkSync(): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true);
  const { flushQueue } = useQueuedOrderSubmission();
  const hasFlushRef = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(online);

      if (online && !hasFlushRef.current) {
        hasFlushRef.current = true;
        void flushQueue().finally(() => {
          hasFlushRef.current = false;
        });
      }
    });
    return () => unsubscribe();
  }, [flushQueue]);

  return { isOnline };
}

// ── Error Boundary ──────────────────────────────────────────────────

interface OrderErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface OrderErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class OrderErrorBoundary extends React.Component<
  OrderErrorBoundaryProps,
  OrderErrorBoundaryState
> {
  constructor(props: OrderErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): OrderErrorBoundaryState {
    return { hasError: true, error };
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message ?? 'An unexpected error occurred in the order flow.'}
          </Text>
          <Text style={styles.errorRetry} onPress={this.resetError}>
            Tap to retry
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Offline Banner Component ────────────────────────────────────────

export function OfflineBanner({ isOnline }: { isOnline: boolean }): React.JSX.Element | null {
  if (isOnline) return null;

  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineBannerText}>
        You&apos;re offline. Changes will sync when you reconnect.
      </Text>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontFamily: 'Sora',
    fontSize: 20,
    fontWeight: '700',
    color: '#0D0D0D',
    marginBottom: 8,
  },
  errorMessage: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorRetry: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
  offlineBanner: {
    backgroundColor: '#FFBE0B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineBannerText: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    fontWeight: '600',
    color: '#0D0D0D',
  },
});
