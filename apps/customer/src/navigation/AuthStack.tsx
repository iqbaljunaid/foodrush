import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

// ── Placeholder Screens ─────────────────────────────────────────────

function LoginScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Login'>): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Create account</Text>
      </TouchableOpacity>
    </View>
  );
}

function RegisterScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Register'>): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <TouchableOpacity onPress={() => navigation.navigate('OTP', { phone: '+1234567890' })}>
        <Text style={styles.link}>Verify phone</Text>
      </TouchableOpacity>
    </View>
  );
}

function OTPScreen({ route }: NativeStackScreenProps<AuthStackParamList, 'OTP'>): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Sent to {route.params.phone}</Text>
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
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
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
    fontSize: 28,
    fontWeight: '700',
    color: '#0D0D0D',
    marginBottom: 16,
  },
  subtitle: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: '#6B7280',
  },
  link: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
});
