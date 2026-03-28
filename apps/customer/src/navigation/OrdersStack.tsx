import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OrdersStackParamList } from './types';

const Stack = createNativeStackNavigator<OrdersStackParamList>();

function OrdersListPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Orders</Text>
      <Text style={styles.subtitle}>Track active and past orders</Text>
    </View>
  );
}

function OrderDetailPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Detail</Text>
    </View>
  );
}

function OrderTrackingPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Tracking</Text>
    </View>
  );
}

function CartPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cart</Text>
    </View>
  );
}

function CheckoutPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Checkout</Text>
    </View>
  );
}

export function OrdersStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="OrdersList" component={OrdersListPlaceholder} />
      <Stack.Screen name="OrderDetail" component={OrderDetailPlaceholder} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingPlaceholder} />
      <Stack.Screen name="Cart" component={CartPlaceholder} />
      <Stack.Screen name="Checkout" component={CheckoutPlaceholder} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontFamily: 'Sora',
    fontSize: 24,
    fontWeight: '700',
    color: '#0D0D0D',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: '#6B7280',
  },
});
