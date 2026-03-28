import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

// ── Placeholder Screens ─────────────────────────────────────────────

function LoginScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Login'>): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FoodRush Driver</Text>
      <Text style={styles.subtitle}>Sign in to start delivering</Text>
      <TextInput
        style={styles.input}
        placeholder="Phone number"
        placeholderTextColor="#6B7280"
        keyboardType="phone-pad"
        accessibilityLabel="Phone number input"
      />
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('OTP', { phone: '+1234567890' })}
        accessibilityRole="button"
        accessibilityLabel="Continue to verification"
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

function OTPScreen({ route }: NativeStackScreenProps<AuthStackParamList, 'OTP'>): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Code sent to {route.params.phone}</Text>
      <TextInput
        style={styles.input}
        placeholder="6-digit code"
        placeholderTextColor="#6B7280"
        keyboardType="number-pad"
        maxLength={6}
        accessibilityLabel="OTP code input"
      />
    </View>
  );
}

// ── Stack ───────────────────────────────────────────────────────────

export function AuthStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#0A0A0A' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 32,
  },
  title: {
    fontFamily: 'Sora',
    fontSize: 28,
    fontWeight: '700',
    color: '#F5F5F5',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: '#1C1C1C',
    paddingHorizontal: 16,
    fontSize: 18,
    color: '#F5F5F5',
    marginBottom: 16,
    minHeight: 48,
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: '#00C896',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  buttonText: {
    fontFamily: 'Sora',
    fontSize: 18,
    fontWeight: '700',
    color: '#0A0A0A',
  },
});