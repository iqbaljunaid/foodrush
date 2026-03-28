import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
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
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button, Card } from '@foodrush/shared/components';
import { orderApi, type RateOrderInput } from '@foodrush/shared/api';
import type { OrdersStackParamList } from '@/navigation/types';

type ConfirmationRoute = RouteProp<OrdersStackParamList, 'Confirmation'>;
type ConfirmationNav = NativeStackNavigationProp<OrdersStackParamList, 'Confirmation'>;

const AUTO_SHOW_RATING_MS = 30_000;

// ── Checkmark Animation ────────────────────────────────────────────

function CheckmarkAnimation(): React.JSX.Element {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  return (
    <Animated.View
      style={[
        styles.checkmarkContainer,
        { opacity, transform: [{ scale }] },
      ]}
      accessibilityLabel="Order confirmed"
    >
      <View style={styles.checkmarkCircle}>
        <Text style={styles.checkmarkText}>✓</Text>
      </View>
    </Animated.View>
  );
}

// ── Star Rating ─────────────────────────────────────────────────────

interface StarRatingProps {
  rating: number;
  onRate: (value: number) => void;
  label: string;
}

function StarRating({ rating, onRate, label }: StarRatingProps): React.JSX.Element {
  return (
    <View accessibilityLabel={label} style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onRate(star)}
          accessibilityRole="button"
          accessibilityLabel={`${star} star${star !== 1 ? 's' : ''}`}
          accessibilityState={{ selected: star <= rating }}
          style={styles.starButton}
        >
          <Text style={[styles.starText, star <= rating && styles.starFilled]}>
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── Tip Slider ──────────────────────────────────────────────────────

interface TipSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const TIP_OPTIONS = [0, 1, 2, 3, 5, 10] as const;

function TipSlider({ value, onChange }: TipSliderProps): React.JSX.Element {
  return (
    <View style={styles.tipSliderRow} accessibilityLabel="Additional tip">
      {TIP_OPTIONS.map((amount) => {
        const active = value === amount;
        return (
          <Pressable
            key={amount}
            onPress={() => onChange(amount)}
            style={[styles.tipOption, active && styles.tipOptionActive]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={amount === 0 ? 'No tip' : `$${amount} tip`}
          >
            <Text style={[styles.tipOptionText, active && styles.tipOptionTextActive]}>
              {amount === 0 ? 'None' : `$${amount}`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Confirmation Screen ─────────────────────────────────────────────

export function ConfirmationScreen(): React.JSX.Element {
  const route = useRoute<ConfirmationRoute>();
  const navigation = useNavigation<ConfirmationNav>();
  const { orderId } = route.params;

  const ratingSheetRef = useRef<BottomSheetModal>(null);
  const autoShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [foodRating, setFoodRating] = useState(0);
  const [courierRating, setCourierRating] = useState(0);
  const [comment, setComment] = useState('');
  const [tip, setTip] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderApi.getOrder(orderId),
  });

  const rateMutation = useMutation({
    mutationFn: (input: RateOrderInput) => orderApi.rateOrder(orderId, input),
    onSuccess: () => {
      setRatingSubmitted(true);
      ratingSheetRef.current?.dismiss();
    },
  });

  // Auto-show rating sheet after 30 seconds
  useEffect(() => {
    autoShowTimerRef.current = setTimeout(() => {
      if (!ratingSubmitted) {
        ratingSheetRef.current?.present();
      }
    }, AUTO_SHOW_RATING_MS);

    return () => {
      if (autoShowTimerRef.current) {
        clearTimeout(autoShowTimerRef.current);
      }
    };
  }, [ratingSubmitted]);

  const handleSubmitRating = useCallback(() => {
    if (foodRating === 0 || courierRating === 0) return;

    rateMutation.mutate({
      foodRating,
      courierRating,
      comment: comment.trim() || undefined,
      tip: tip > 0 ? tip : undefined,
    });
  }, [foodRating, courierRating, comment, tip, rateMutation]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  const order = orderQuery.data;

  const handleTrackOrder = useCallback(() => {
    navigation.navigate('OrderTracking', { orderId });
  }, [navigation, orderId]);

  const handleBackToHome = useCallback(() => {
    navigation.getParent()?.navigate('HomeTab', { screen: 'Discovery' });
  }, [navigation]);

  // Pulsing dot animation for the success state
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Checkmark */}
        <CheckmarkAnimation />

        <Text style={styles.heading}>Order Confirmed!</Text>
        <Text style={styles.subheading}>
          Your order #{orderId.slice(0, 8)} has been placed.
        </Text>

        {/* Order Summary */}
        {order ? (
          <Card accessibilityLabel="Order summary" style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            {order.items.map((item) => (
              <View key={item.itemId} style={styles.summaryRow}>
                <Text style={styles.summaryItemText}>
                  {item.quantity}× {item.name}
                </Text>
                <Text style={styles.summaryItemPrice}>
                  ${(item.unitPrice * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                ${order.totalAmount.toFixed(2)}
              </Text>
            </View>
            <Text style={styles.deliveryAddress}>
              Delivering to: {order.deliveryAddress}
            </Text>
          </Card>
        ) : null}

        <Button
          title="Track Your Order"
          onPress={handleTrackOrder}
          size="lg"
          accessibilityLabel="Track your order"
          style={styles.trackButton}
        />

        <Pressable
          onPress={handleBackToHome}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
          style={styles.homeLink}
        >
          <Text style={styles.homeLinkText}>Back to Home</Text>
        </Pressable>

        {ratingSubmitted ? (
          <Text
            style={styles.ratingThanks}
            accessibilityLiveRegion="polite"
          >
            Thanks for your feedback!
          </Text>
        ) : (
          <Pressable
            onPress={() => ratingSheetRef.current?.present()}
            accessibilityRole="button"
            accessibilityLabel="Rate your order"
            style={styles.rateLink}
          >
            <Text style={styles.rateLinkText}>Rate your experience</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Rating Bottom Sheet */}
      <BottomSheetModal
        ref={ratingSheetRef}
        snapPoints={['65%']}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        accessibilityLabel="Rate your order"
      >
        <View style={styles.ratingSheet}>
          <Text style={styles.ratingTitle}>How was your order?</Text>

          <Text style={styles.ratingCategoryLabel}>Food Quality</Text>
          <StarRating
            rating={foodRating}
            onRate={setFoodRating}
            label="Rate food quality"
          />

          <Text style={styles.ratingCategoryLabel}>Courier Service</Text>
          <StarRating
            rating={courierRating}
            onRate={setCourierRating}
            label="Rate courier service"
          />

          <Text style={styles.ratingCategoryLabel}>Comments</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Tell us more (optional)"
            placeholderTextColor="#9CA3AF"
            value={comment}
            onChangeText={setComment}
            multiline
            accessibilityLabel="Rating comment"
          />

          <Text style={styles.ratingCategoryLabel}>Leave an extra tip</Text>
          <TipSlider value={tip} onChange={setTip} />

          <Button
            title="Submit Rating"
            onPress={handleSubmitRating}
            size="lg"
            loading={rateMutation.isPending}
            disabled={foodRating === 0 || courierRating === 0 || rateMutation.isPending}
            accessibilityLabel="Submit rating"
            style={styles.submitButton}
          />
        </View>
      </BottomSheetModal>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  content: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  checkmarkContainer: {
    marginBottom: 20,
  },
  checkmarkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#06D6A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 40,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0D0D0D',
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  summaryCard: {
    width: '100%',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D0D0D',
    marginBottom: 10,
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
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B35',
  },
  deliveryAddress: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  trackButton: {
    width: '100%',
    marginBottom: 12,
  },
  homeLink: {
    paddingVertical: 8,
  },
  homeLinkText: {
    fontSize: 15,
    color: '#FF6B35',
    fontWeight: '600',
  },
  ratingThanks: {
    fontSize: 15,
    color: '#06D6A0',
    fontWeight: '600',
    marginTop: 16,
  },
  rateLink: {
    marginTop: 16,
    paddingVertical: 8,
  },
  rateLinkText: {
    fontSize: 15,
    color: '#FF6B35',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  ratingSheet: {
    padding: 20,
    paddingBottom: 32,
  },
  ratingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0D0D0D',
    marginBottom: 16,
    textAlign: 'center',
  },
  ratingCategoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D0D0D',
    marginTop: 12,
    marginBottom: 6,
  },
  starRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  starText: {
    fontSize: 32,
    color: '#D1D5DB',
  },
  starFilled: {
    color: '#FFD166',
  },
  commentInput: {
    height: 64,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    fontSize: 14,
    color: '#0D0D0D',
    textAlignVertical: 'top',
  },
  tipSliderRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tipOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tipOptionActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FF6B3510',
  },
  tipOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tipOptionTextActive: {
    color: '#FF6B35',
  },
  submitButton: {
    marginTop: 20,
  },
});
