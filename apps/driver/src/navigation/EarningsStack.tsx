import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { EarningsStackParamList } from './types';

const Stack = createNativeStackNavigator<EarningsStackParamList>();

// ── Placeholder Screens ─────────────────────────────────────────────

function EarningsTodayPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today's Earnings</Text>
      <Text style={styles.subtitle}>Your daily summary</Text>
    </View>
  );
}

function EarningsHistoryPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Earnings History</Text>
    </View>
  );
}

function PayoutPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payouts</Text>
    </View>
  );
}

// ── Stack ───────────────────────────────────────────────────────────

export function EarningsStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#0A0A0A' },
      }}
    >
      <Stack.Screen name="EarningsToday" component={EarningsTodayPlaceholder} />
      <Stack.Screen name="EarningsHistory" component={EarningsHistoryPlaceholder} />
      <Stack.Screen name="Payout" component={PayoutPlaceholder} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  title: {
    fontFamily: 'Sora',
    fontSize: 22,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: '#9CA3AF',
  },
});