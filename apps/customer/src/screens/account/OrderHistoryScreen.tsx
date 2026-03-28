import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  type ListRenderItemInfo,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { orderApi, type Order, type OrderStatus, type OrderItem } from '@foodrush/shared/api';
import { Badge, Button, Card, SkeletonLoader } from '@foodrush/shared/components';
import { useAuth } from '@foodrush/shared/auth';
import { useTheme } from '@foodrush/shared/hooks/useTheme';
import { useCartStore } from '@/store/cart';

// ── Types ────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const PAGE_SIZE = 10;
const SCREEN_HEIGHT = Dimensions.get('window').height;

// ── Helpers ──────────────────────────────────────────────────────────
function statusBadgeVariant(status: OrderStatus): BadgeVariant {
  switch (status) {
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'danger';
    case 'placed':
    case 'accepted':
      return 'info';
    case 'preparing':
    case 'ready':
      return 'warning';
    case 'picked_up':
      return 'info';
  }
}

function statusLabel(status: OrderStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// ── Order Detail Bottom Sheet ────────────────────────────────────────
function OrderDetailSheet({
  order,
  onClose,
  onReorder,
  onDownloadReceipt,
  colors,
  radius,
}: {
  order: Order;
  onClose: () => void;
  onReorder: (order: Order) => void;
  onDownloadReceipt: (orderId: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  radius: ReturnType<typeof useTheme>['radius'];
}): React.JSX.Element {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [slideAnim]);

  const handleClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [slideAnim, onClose]);

  return (
    <View style={styles.sheetOverlay}>
      <Pressable
        style={styles.sheetBackdrop}
        onPress={handleClose}
        accessibilityRole="button"
        accessibilityLabel="Close order details"
      />
      <Animated.View
        style={[
          styles.sheetContent,
          {
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.sheetHandle}>
          <View style={[styles.handleBar, { backgroundColor: colors.surfaceMid }]} />
        </View>

        {/* Header */}
        <View style={styles.sheetHeader}>
          <View>
            <Text style={[styles.sheetTitle, { color: colors.text, fontFamily: 'Sora' }]}>
              Order #{order.id.slice(-6)}
            </Text>
            <Text style={[styles.sheetDate, { color: colors.textMuted, fontFamily: 'DM Sans' }]}>
              {formatDate(order.createdAt)}
            </Text>
          </View>
          <Badge label={statusLabel(order.status)} variant={statusBadgeVariant(order.status)} />
        </View>

        {/* Items */}
        <View style={styles.sheetItems}>
          {order.items.map((item) => (
            <View key={item.itemId} style={styles.sheetItemRow}>
              <Text style={[styles.sheetItemQty, { color: colors.primary, fontFamily: 'DM Sans' }]}>
                {item.quantity}×
              </Text>
              <Text
                style={[styles.sheetItemName, { color: colors.text, fontFamily: 'DM Sans' }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text style={[styles.sheetItemPrice, { color: colors.text, fontFamily: 'DM Sans' }]}>
                {formatCurrency(item.unitPrice * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={[styles.sheetTotalRow, { borderTopColor: colors.surfaceMid }]}>
          <Text style={[styles.sheetTotalLabel, { color: colors.text, fontFamily: 'Sora' }]}>
            Total
          </Text>
          <Text style={[styles.sheetTotalValue, { color: colors.text, fontFamily: 'Sora' }]}>
            {formatCurrency(order.totalAmount)}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.sheetActions}>
          <Button
            title="Reorder"
            onPress={() => onReorder(order)}
            style={{ flex: 1 }}
          />
          <Button
            title="Download receipt"
            variant="ghost"
            onPress={() => onDownloadReceipt(order.id)}
            style={{ flex: 1 }}
          />
        </View>
      </Animated.View>
    </View>
  );
}

// ── Component ────────────────────────────────────────────────────────
export function OrderHistoryScreen(): React.JSX.Element {
  const { user } = useAuth();
  const { colors, spacing, radius } = useTheme();
  const addItem = useCartStore((s) => s.addItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const ordersQuery = useInfiniteQuery({
    queryKey: ['orderHistory', user?.id],
    queryFn: ({ pageParam = 0 }) =>
      orderApi.getOrders({
        customerId: user?.id ?? '',
        limit: PAGE_SIZE,
        offset: pageParam as number,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    enabled: !!user?.id,
  });

  const allOrders = ordersQuery.data?.pages.flat() ?? [];

  const handleReorder = useCallback(
    (order: Order) => {
      clearCart();
      for (const item of order.items) {
        addItem({
          menuItemId: item.itemId,
          restaurantId: order.restaurantId,
          name: item.name,
          price: item.unitPrice,
          quantity: item.quantity,
          size: null,
          extras: [],
          imageUrl: null,
        });
      }
      setSelectedOrder(null);
    },
    [clearCart, addItem],
  );

  const handleDownloadReceipt = useCallback((orderId: string) => {
    // Receipt download would be handled by a dedicated endpoint
    setSelectedOrder(null);
  }, []);

  const renderOrder = useCallback(
    ({ item }: ListRenderItemInfo<Order>) => {
      const itemCount = item.items.reduce((sum, i) => sum + i.quantity, 0);

      return (
        <Card
          accessibilityLabel={`Order from ${formatDate(item.createdAt)}, ${formatCurrency(item.totalAmount)}, ${statusLabel(item.status)}`}
          onPress={() => setSelectedOrder(item)}
          style={styles.orderCard}
        >
          <View style={styles.orderHeader}>
            <View style={styles.orderInfo}>
              <Text
                style={[styles.restaurantName, { color: colors.text, fontFamily: 'Sora' }]}
                numberOfLines={1}
              >
                Order #{item.id.slice(-6)}
              </Text>
              <Text
                style={[styles.orderDate, { color: colors.textMuted, fontFamily: 'DM Sans' }]}
              >
                {formatDate(item.createdAt)}
              </Text>
            </View>
            <Badge
              label={statusLabel(item.status)}
              variant={statusBadgeVariant(item.status)}
            />
          </View>

          <View style={[styles.orderFooter, { borderTopColor: colors.surfaceMid }]}>
            <Text style={[styles.itemCount, { color: colors.textMuted, fontFamily: 'DM Sans' }]}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Text>
            <Text style={[styles.orderTotal, { color: colors.text, fontFamily: 'Sora' }]}>
              {formatCurrency(item.totalAmount)}
            </Text>
          </View>
        </Card>
      );
    },
    [colors],
  );

  if (ordersQuery.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, padding: spacing.lg }]}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLoader key={i} width={Dimensions.get('window').width - 48} height={100} />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <FlatList
        data={allOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        onEndReached={() => {
          if (ordersQuery.hasNextPage && !ordersQuery.isFetchingNextPage) {
            void ordersQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted, fontFamily: 'DM Sans' }]}>
              No orders yet
            </Text>
            <Text
              style={[styles.emptySubtext, { color: colors.textMuted, fontFamily: 'DM Sans' }]}
            >
              Your order history will appear here
            </Text>
          </View>
        }
        ListFooterComponent={
          ordersQuery.isFetchingNextPage ? (
            <View style={styles.loadingMore}>
              <SkeletonLoader width={Dimensions.get('window').width - 48} height={100} />
            </View>
          ) : null
        }
      />

      {/* Bottom sheet */}
      {selectedOrder && (
        <OrderDetailSheet
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onReorder={handleReorder}
          onDownloadReceipt={handleDownloadReceipt}
          colors={colors}
          radius={radius}
        />
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 24,
    gap: 12,
    paddingBottom: 24,
  },
  orderCard: {
    marginBottom: 0,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderInfo: {
    flex: 1,
    marginRight: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 13,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  itemCount: {
    fontSize: 13,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  // Bottom sheet
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContent: {
    maxHeight: SCREEN_HEIGHT * 0.7,
    paddingBottom: 40,
  },
  sheetHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  sheetDate: {
    fontSize: 14,
    marginTop: 2,
  },
  sheetItems: {
    paddingHorizontal: 24,
    gap: 10,
  },
  sheetItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetItemQty: {
    fontSize: 14,
    fontWeight: '600',
    width: 28,
  },
  sheetItemName: {
    flex: 1,
    fontSize: 15,
  },
  sheetItemPrice: {
    fontSize: 15,
    fontWeight: '500',
  },
  sheetTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  sheetTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetTotalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginTop: 20,
  },
});
