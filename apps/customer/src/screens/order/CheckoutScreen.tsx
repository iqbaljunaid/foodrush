import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation } from '@tanstack/react-query';
import { Button, Card } from '@foodrush/shared/components';
import { orderApi, type CreateOrderInput } from '@foodrush/shared/api';
import { useCartStore } from '@/store/cart';
import { useActiveOrderStore } from '@/store/activeOrder';
import type { OrdersStackParamList } from '@/navigation/types';

type CheckoutNav = NativeStackNavigationProp<OrdersStackParamList, 'Checkout'>;

const TIP_PRESETS = [10, 15, 20] as const;
const DELIVERY_FEE = 3.99;

type DeliveryTime = 'asap' | 'scheduled';

interface PaymentMethodOption {
  id: string;
  label: string;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 'card', label: 'Credit / Debit Card' },
  { id: 'apple_pay', label: 'Apple Pay' },
  { id: 'google_pay', label: 'Google Pay' },
];

// ── Tip Selector ────────────────────────────────────────────────────

interface TipSelectorProps {
  subtotal: number;
  selectedPercent: number | null;
  customTip: string;
  onSelectPercent: (pct: number) => void;
  onCustomTipChange: (value: string) => void;
}

function TipSelector({
  subtotal,
  selectedPercent,
  customTip,
  onSelectPercent,
  onCustomTipChange,
}: TipSelectorProps): React.JSX.Element {
  return (
    <View accessibilityLabel="Tip selector">
      <Text style={styles.sectionTitle}>Add a Tip</Text>
      <View style={styles.tipRow}>
        {TIP_PRESETS.map((pct) => {
          const active = selectedPercent === pct;
          return (
            <Pressable
              key={pct}
              onPress={() => onSelectPercent(pct)}
              style={[styles.tipChip, active && styles.tipChipActive]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${pct}% tip, ${formatCurrency(subtotal * (pct / 100))}`}
            >
              <Text style={[styles.tipChipText, active && styles.tipChipTextActive]}>
                {pct}%
              </Text>
            </Pressable>
          );
        })}
        <TextInput
          style={styles.tipCustomInput}
          placeholder="Custom"
          placeholderTextColor="#9CA3AF"
          keyboardType="decimal-pad"
          value={customTip}
          onChangeText={onCustomTipChange}
          accessibilityLabel="Custom tip amount"
        />
      </View>
    </View>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// ── Checkout Screen ─────────────────────────────────────────────────

export function CheckoutScreen(): React.JSX.Element {
  const navigation = useNavigation<CheckoutNav>();
  const items = useCartStore((s) => s.items);
  const restaurantId = useCartStore((s) => s.restaurantId);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const clearCart = useCartStore((s) => s.clearCart);
  const setOrder = useActiveOrderStore((s) => s.setOrder);

  const [address, setAddress] = useState('');
  const [deliveryTime, setDeliveryTime] = useState<DeliveryTime>('asap');
  const [selectedPayment, setSelectedPayment] = useState('card');
  const [tipPercent, setTipPercent] = useState<number | null>(15);
  const [customTip, setCustomTip] = useState('');
  const [notes, setNotes] = useState('');

  const subtotal = getSubtotal();

  const tipAmount = useMemo(() => {
    if (customTip.length > 0) {
      const parsed = parseFloat(customTip);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    }
    return tipPercent !== null ? subtotal * (tipPercent / 100) : 0;
  }, [customTip, tipPercent, subtotal]);

  const total = subtotal + DELIVERY_FEE + tipAmount;

  const handleCustomTipChange = useCallback((value: string) => {
    setCustomTip(value);
    setTipPercent(null);
  }, []);

  const handleTipPercentSelect = useCallback((pct: number) => {
    setTipPercent(pct);
    setCustomTip('');
  }, []);

  const placeOrderMutation = useMutation({
    mutationFn: (input: CreateOrderInput) => orderApi.createOrder(input),
    onSuccess: (order) => {
      setOrder(order.id, order.status);
      clearCart();
      navigation.navigate('Confirmation', { orderId: order.id });
    },
    onError: () => {
      Alert.alert('Order Failed', 'Something went wrong. Please try again.');
    },
  });

  const handlePlaceOrder = useCallback(() => {
    if (!restaurantId || items.length === 0 || address.trim().length === 0) {
      Alert.alert('Missing Info', 'Please fill in your delivery address.');
      return;
    }

    placeOrderMutation.mutate({
      customerId: '', // Filled by auth middleware on backend
      restaurantId,
      items: items.map((item) => ({
        itemId: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unitPrice:
          item.price + item.extras.reduce((sum, e) => sum + e.price, 0),
      })),
      deliveryAddress: address,
      notes: notes.trim() || undefined,
    });
  }, [restaurantId, items, address, notes, placeOrderMutation]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Delivery Address */}
      <Card accessibilityLabel="Delivery address section">
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your address"
          placeholderTextColor="#9CA3AF"
          value={address}
          onChangeText={setAddress}
          accessibilityLabel="Delivery address"
        />
      </Card>

      {/* Delivery Time */}
      <Card accessibilityLabel="Delivery time section">
        <Text style={styles.sectionTitle}>Delivery Time</Text>
        <View style={styles.timeRow}>
          {(['asap', 'scheduled'] as const).map((opt) => {
            const active = deliveryTime === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => setDeliveryTime(opt)}
                style={[styles.timeChip, active && styles.timeChipActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={opt === 'asap' ? 'As soon as possible' : 'Schedule for later'}
              >
                <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>
                  {opt === 'asap' ? 'ASAP' : 'Scheduled'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Payment Method */}
      <Card accessibilityLabel="Payment method section">
        <Text style={styles.sectionTitle}>Payment Method</Text>
        {PAYMENT_METHODS.map((pm) => {
          const active = selectedPayment === pm.id;
          return (
            <Pressable
              key={pm.id}
              onPress={() => setSelectedPayment(pm.id)}
              style={styles.paymentRow}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={pm.label}
            >
              <View style={[styles.radio, active && styles.radioActive]} />
              <Text style={styles.paymentLabel}>{pm.label}</Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => navigation.navigate('Payment')}
          accessibilityRole="button"
          accessibilityLabel="Manage payment methods"
        >
          <Text style={styles.manageCards}>Manage cards</Text>
        </Pressable>
      </Card>

      {/* Order Notes */}
      <Card accessibilityLabel="Order notes">
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Special instructions (optional)"
          placeholderTextColor="#9CA3AF"
          value={notes}
          onChangeText={setNotes}
          multiline
          accessibilityLabel="Order notes"
        />
      </Card>

      {/* Tip */}
      <Card accessibilityLabel="Tip section">
        <TipSelector
          subtotal={subtotal}
          selectedPercent={tipPercent}
          customTip={customTip}
          onSelectPercent={handleTipPercentSelect}
          onCustomTipChange={handleCustomTipChange}
        />
      </Card>

      {/* Order Summary */}
      <Card accessibilityLabel="Order summary">
        <Text style={styles.sectionTitle}>Order Summary</Text>
        {items.map((item) => (
          <View key={`${item.menuItemId}::${item.size ?? 'default'}`} style={styles.summaryRow}>
            <Text style={styles.summaryItemText}>
              {item.quantity}× {item.name}
            </Text>
            <Text style={styles.summaryItemPrice}>
              {formatCurrency(
                (item.price + item.extras.reduce((s, e) => s + e.price, 0)) *
                  item.quantity,
              )}
            </Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery fee</Text>
          <Text style={styles.summaryValue}>{formatCurrency(DELIVERY_FEE)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tip</Text>
          <Text style={styles.summaryValue}>{formatCurrency(tipAmount)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.grandTotal]}>
          <Text style={styles.grandTotalLabel}>Total</Text>
          <Text style={styles.grandTotalValue}>{formatCurrency(total)}</Text>
        </View>
      </Card>

      <Button
        title="Place Order"
        onPress={handlePlaceOrder}
        size="lg"
        loading={placeOrderMutation.isPending}
        disabled={placeOrderMutation.isPending}
        accessibilityLabel={`Place order for ${formatCurrency(total)}`}
        style={styles.placeOrderButton}
      />
    </ScrollView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D0D0D',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#0D0D0D',
  },
  notesInput: {
    height: 72,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  timeChipActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FF6B3510',
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  timeChipTextActive: {
    color: '#FF6B35',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
  },
  radioActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FF6B35',
  },
  paymentLabel: {
    fontSize: 15,
    color: '#0D0D0D',
  },
  manageCards: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
    marginTop: 4,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tipChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  tipChipActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FF6B3510',
  },
  tipChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tipChipTextActive: {
    color: '#FF6B35',
  },
  tipCustomInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#0D0D0D',
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryItemText: {
    fontSize: 14,
    color: '#0D0D0D',
  },
  summaryItemPrice: {
    fontSize: 14,
    color: '#0D0D0D',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0D0D0D',
  },
  grandTotal: {
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
  placeOrderButton: {
    marginTop: 4,
  },
});
