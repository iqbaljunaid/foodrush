import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { DeliveriesStackParamList } from './types';
import { OnlineToggle } from '../screens/home/OnlineToggle';

const Stack = createNativeStackNavigator<DeliveriesStackParamList>();

// ── Placeholder Screens ─────────────────────────────────────────────

function DeliveryQueuePlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Delivery Queue</Text>
      <Text style={styles.subtitle}>Waiting for orders…</Text>
    </View>
  );
}

function OrderOfferPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Offer</Text>
    </View>
  );
}

function ActiveDeliveryPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Delivery</Text>
    </View>
  );
}

function NavigationPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Navigation</Text>
    </View>
  );
}

function PickupPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pickup Confirmation</Text>
    </View>
  );
}

function DropoffPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dropoff Confirmation</Text>
    </View>
  );
}

// ── Stack ───────────────────────────────────────────────────────────

export function DeliveriesStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#0A0A0A' },
      }}
    >
      <Stack.Screen name="OnlineToggle" component={OnlineToggle} />
      <Stack.Screen name="DeliveryQueue" component={DeliveryQueuePlaceholder} />
      <Stack.Screen
        name="OrderOffer"
        component={OrderOfferPlaceholder}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="ActiveDelivery" component={ActiveDeliveryPlaceholder} />
      <Stack.Screen
        name="Navigation"
        component={NavigationPlaceholder}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="Pickup" component={PickupPlaceholder} />
      <Stack.Screen name="Dropoff" component={DropoffPlaceholder} />
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