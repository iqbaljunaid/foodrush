import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card } from '@foodrush/shared/components';
import { paymentApi, type Card as SavedCard } from '@foodrush/shared/api';

// ── Saved Card Row ──────────────────────────────────────────────────

interface SavedCardRowProps {
  card: SavedCard;
  selected: boolean;
  onSelect: (id: string) => void;
}

function SavedCardRow({ card, selected, onSelect }: SavedCardRowProps): React.JSX.Element {
  return (
    <Pressable
      style={styles.savedCardRow}
      onPress={() => onSelect(card.id)}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${card.brand} ending in ${card.last4}, expires ${card.expiryMonth}/${card.expiryYear}`}
    >
      <View style={[styles.radio, selected && styles.radioSelected]} />
      <View style={styles.savedCardInfo}>
        <Text style={styles.savedCardBrand}>{card.brand}</Text>
        <Text style={styles.savedCardLast4}>•••• {card.last4}</Text>
      </View>
      <Text style={styles.savedCardExpiry}>
        {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear}
      </Text>
    </Pressable>
  );
}

// ── Payment Screen ──────────────────────────────────────────────────

export function PaymentScreen(): React.JSX.Element {
  const queryClient = useQueryClient();

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const cardsQuery = useQuery({
    queryKey: ['payment-cards'],
    queryFn: () => paymentApi.getCards(),
  });

  const addCardMutation = useMutation({
    mutationFn: (paymentMethodId: string) =>
      paymentApi.addCard({ paymentMethodId, setDefault: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-cards'] });
      setCardNumber('');
      setExpiry('');
      setCvc('');
      Alert.alert('Card Saved', 'Your card has been added successfully.');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save card. Please check your details.');
    },
  });

  const formatCardNumber = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    const groups = digits.match(/.{1,4}/g);
    return groups ? groups.join(' ') : digits;
  }, []);

  const formatExpiry = useCallback((value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  }, []);

  const handleSaveCard = useCallback(() => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      Alert.alert('Invalid Card', 'Please enter a valid card number.');
      return;
    }
    if (expiry.length < 5) {
      Alert.alert('Invalid Expiry', 'Please enter a valid expiry date (MM/YY).');
      return;
    }
    if (cvc.length < 3) {
      Alert.alert('Invalid CVC', 'Please enter a valid CVC.');
      return;
    }

    // In production, tokenize via Stripe SDK — never send raw card data
    // This ID would come from Stripe.createPaymentMethod()
    addCardMutation.mutate(`pm_${Date.now()}`);
  }, [cardNumber, expiry, cvc, addCardMutation]);

  const handleApplePay = useCallback(() => {
    Alert.alert('Apple Pay', 'Apple Pay integration would launch the native payment sheet.');
  }, []);

  const handleGooglePay = useCallback(() => {
    Alert.alert('Google Pay', 'Google Pay integration would launch the native payment sheet.');
  }, []);

  const savedCards = cardsQuery.data ?? [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Saved Cards */}
      {savedCards.length > 0 ? (
        <Card accessibilityLabel="Saved cards">
          <Text style={styles.sectionTitle}>Saved Cards</Text>
          {savedCards.map((card) => (
            <SavedCardRow
              key={card.id}
              card={card}
              selected={selectedCardId === card.id}
              onSelect={setSelectedCardId}
            />
          ))}
        </Card>
      ) : null}

      {/* Add New Card */}
      <Card accessibilityLabel="Add a new card">
        <Text style={styles.sectionTitle}>Add New Card</Text>

        <Text style={styles.fieldLabel}>Card Number</Text>
        <TextInput
          style={styles.input}
          placeholder="1234 5678 9012 3456"
          placeholderTextColor="#9CA3AF"
          value={cardNumber}
          onChangeText={(v) => setCardNumber(formatCardNumber(v))}
          keyboardType="number-pad"
          maxLength={19}
          accessibilityLabel="Card number"
        />

        <View style={styles.row}>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>Expiry</Text>
            <TextInput
              style={styles.input}
              placeholder="MM/YY"
              placeholderTextColor="#9CA3AF"
              value={expiry}
              onChangeText={(v) => setExpiry(formatExpiry(v))}
              keyboardType="number-pad"
              maxLength={5}
              accessibilityLabel="Expiry date"
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.fieldLabel}>CVC</Text>
            <TextInput
              style={styles.input}
              placeholder="123"
              placeholderTextColor="#9CA3AF"
              value={cvc}
              onChangeText={(v) => setCvc(v.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              accessibilityLabel="CVC code"
            />
          </View>
        </View>

        <Button
          title="Save Card"
          onPress={handleSaveCard}
          loading={addCardMutation.isPending}
          disabled={addCardMutation.isPending}
          accessibilityLabel="Save card"
          style={styles.saveButton}
        />
      </Card>

      {/* Digital Wallets */}
      <Card accessibilityLabel="Digital wallet options">
        <Text style={styles.sectionTitle}>Digital Wallets</Text>

        <Pressable
          style={[styles.walletButton, styles.applePayButton]}
          onPress={handleApplePay}
          accessibilityRole="button"
          accessibilityLabel="Pay with Apple Pay"
        >
          <Text style={styles.walletButtonText}> Pay</Text>
        </Pressable>

        <Pressable
          style={[styles.walletButton, styles.googlePayButton]}
          onPress={handleGooglePay}
          accessibilityRole="button"
          accessibilityLabel="Pay with Google Pay"
        >
          <Text style={[styles.walletButtonText, styles.googlePayText]}>G Pay</Text>
        </Pressable>
      </Card>
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
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#0D0D0D',
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  saveButton: {
    marginTop: 16,
  },
  savedCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
  },
  radioSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FF6B35',
  },
  savedCardInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  savedCardBrand: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D0D0D',
  },
  savedCardLast4: {
    fontSize: 14,
    color: '#6B7280',
  },
  savedCardExpiry: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  walletButton: {
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  applePayButton: {
    backgroundColor: '#000000',
  },
  googlePayButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  walletButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  googlePayText: {
    color: '#0D0D0D',
  },
});
