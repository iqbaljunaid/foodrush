import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

function DiscoveryPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discover Restaurants</Text>
      <Text style={styles.subtitle}>Browse nearby places to eat</Text>
    </View>
  );
}

function RestaurantListPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Restaurants</Text>
    </View>
  );
}

function RestaurantDetailPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Restaurant Detail</Text>
    </View>
  );
}

function SearchPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search</Text>
    </View>
  );
}

export function HomeStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Discovery" component={DiscoveryPlaceholder} />
      <Stack.Screen name="RestaurantList" component={RestaurantListPlaceholder} />
      <Stack.Screen name="RestaurantDetail" component={RestaurantDetailPlaceholder} />
      <Stack.Screen name="Search" component={SearchPlaceholder} />
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
