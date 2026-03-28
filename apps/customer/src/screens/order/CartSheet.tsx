import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@foodrush/shared/components';
import { useCartStore, type CartItem } from '@/store/cart';
import type { OrdersStackParamList } from '@/navigation/types';

const DELIVERY_FEE = 3.99;

type CartNav = NativeStackNavigationProp<OrdersStackParamList, 'Cart'>;

// ── Quantity Stepper ────────────────────────────────────────────────

interface QuantityStepperProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  itemName: string;
}

function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  itemName,
}: QuantityStepperProps): React.JSX.Element {
  return (
    <View style={styles.stepper} accessibilityRole="adjustable" accessibilityLabel={`Quantity for ${itemName}`}>
      <Pressable
        onPress={onDecrement}
        style={styles.stepperButton}
        accessibilityLabel={`Decrease ${itemName} quantity`}
        accessibilityRole="button"
      >
        <Text style={styles.stepperText}>−</Text>
      </Pressable>
      <Text style={styles.quantityText} accessibilityLabel={`${quantity}`}>
        {quantity}
      </Text>
      <Pressable
        onPress={onIncrement}
        style={styles.stepperButton}
        accessibilityLabel={`Increase ${itemName} quantity`}
        accessibilityRole="button"
      >
        <Text style={styles.stepperText}>+</Text>
      </Pressable>
    </View>
  );
}

// ── Cart Item Row ───────────────────────────────────────────────────

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (menuItemId: string, size: string | null, quantity: number) => void;
}

function CartItemRow({ item, onUpdateQuantity }: CartItemRowProps): React.JSX.Element {
  const itemTotal =
    (item.price + item.extras.reduce((sum, e) => sum + e.price, 0)) * item.quantity;

  return (
    <View style={styles.itemRow} accessibilityLabel={`${item.name}, quantity ${item.quantity}, ${formatCurrency(itemTotal)}`}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} accessibilityIgnoresInvertColors />
      ) : (
        <View style={[styles.itemImage, styles.imagePlaceholder]} />
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.size ? (
          <Text style={styles.itemMeta}>{item.size}</Text>
        ) : null}
        {item.extras.length > 0 ? (
          <Text style={styles.itemMeta} numberOfLines={1}>
            {item.extras.map((e) => e.name).join(', ')}
          </Text>
        ) : null}
        <Text style={styles.itemPrice}>{formatCurrency(itemTotal)}</Text>
      </View>
      <QuantityStepper
        quantity={item.quantity}
        itemName={item.name}
        onIncrement={() =>
          onUpdateQuantity(item.menuItemId, item.size, item.quantity + 1)
        }
        onDecrement={() =>
          onUpdateQuantity(item.menuItemId, item.size, item.quantity - 1)
        }
      />
    </View>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// ── Cart Sheet ──────────────────────────────────────────────────────

export interface CartSheetHandle {
  present: () => void;
  dismiss: () => void;
}

export const CartSheet = React.forwardRef<CartSheetHandle>(
  function CartSheet(_props, ref) {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const navigation = useNavigation<CartNav>();

    const items = useCartStore((s) => s.items);
    const updateQuantity = useCartStore((s) => s.updateQuantity);
    const getSubtotal = useCartStore((s) => s.getSubtotal);

    const [promoCode, setPromoCode] = useState('');
    const [promoApplied, setPromoApplied] = useState(false);

    const snapPoints = useMemo(() => ['50%', '90%'], []);

    React.useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.present(),
      dismiss: () => bottomSheetRef.current?.dismiss(),
    }));

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      [],
    );

    const subtotal = getSubtotal();
    const discount = promoApplied ? subtotal * 0.1 : 0;
    const total = subtotal - discount + DELIVERY_FEE;

    const handleApplyPromo = useCallback(() => {
      if (promoCode.trim().length > 0) {
        setPromoApplied(true);
      }
    }, [promoCode]);

    const handleCheckout = useCallback(() => {
      bottomSheetRef.current?.dismiss();
      navigation.navigate('Checkout');
    }, [navigation]);

    const renderItem = useCallback(
      ({ item }: { item: CartItem }) => (
        <CartItemRow item={item} onUpdateQuantity={updateQuantity} />
      ),
      [updateQuantity],
    );

    const keyExtractor = useCallback(
      (item: CartItem) => `${item.menuItemId}::${item.size ?? 'default'}`,
      [],
    );

    if (items.length === 0) {
      return null;
    }

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        accessibilityLabel="Shopping cart"
      >
        <View style={styles.container}>
          <Text style={styles.title}>Your Cart</Text>

          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />

          {/* Promo code */}
          <View style={styles.promoRow}>
            <TextInput
              style={styles.promoInput}
              placeholder="Promo code"
              placeholderTextColor="#9CA3AF"
              value={promoCode}
              onChangeText={setPromoCode}
              autoCapitalize="characters"
              accessibilityLabel="Promo code"
            />
            <Pressable
              onPress={handleApplyPromo}
              style={styles.promoButton}
              accessibilityRole="button"
              accessibilityLabel="Apply promo code"
            >
              <Text style={styles.promoButtonText}>Apply</Text>
            </Pressable>
          </View>
          {promoApplied ? (
            <Text style={styles.promoSuccess} accessibilityLiveRegion="polite">
              10% discount applied!
            </Text>
          ) : null}

          {/* Totals */}
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
            </View>
            {promoApplied ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={[styles.totalValue, styles.discountText]}>
                  -{formatCurrency(discount)}
                </Text>
              </View>
            ) : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Delivery fee</Text>
              <Text style={styles.totalValue}>{formatCurrency(DELIVERY_FEE)}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>

          <Button
            title="Go to Checkout"
            onPress={handleCheckout}
            size="lg"
            accessibilityLabel={`Go to checkout, total ${formatCurrency(total)}`}
          />
        </View>
      </BottomSheetModal>
    );
  },
);

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0D0D0D',
    marginBottom: 12,
  },
  list: {
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
  },
  imagePlaceholder: {
    backgroundColor: '#F3F4F6',
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D0D0D',
  },
  itemMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
    marginTop: 4,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF6B35',
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D0D0D',
    minWidth: 24,
    textAlign: 'center',
  },
  promoRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  promoInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0D0D0D',
  },
  promoButton: {
    height: 44,
    paddingHorizontal: 16,
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  promoSuccess: {
    color: '#06D6A0',
    fontSize: 13,
    marginTop: 4,
  },
  totals: {
    marginTop: 16,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0D0D0D',
  },
  discountText: {
    color: '#06D6A0',
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  grandTotalLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  grandTotalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FF6B35',
  },
});
