import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AccountStackParamList } from './types';

const Stack = createNativeStackNavigator<AccountStackParamList>();

// ── Placeholder Screens ─────────────────────────────────────────────

function AccountHomePlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.subtitle}>Manage your profile</Text>
    </View>
  );
}

function EditVehiclePlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vehicle Info</Text>
    </View>
  );
}

function DocumentsPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Documents</Text>
    </View>
  );
}

// ── Stack ───────────────────────────────────────────────────────────

export function AccountStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#0A0A0A' },
      }}
    >
      <Stack.Screen name="AccountHome" component={AccountHomePlaceholder} />
      <Stack.Screen name="EditVehicle" component={EditVehiclePlaceholder} />
      <Stack.Screen name="Documents" component={DocumentsPlaceholder} />
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