import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

function ProfileHomePlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Manage your account</Text>
    </View>
  );
}

function EditProfilePlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>
    </View>
  );
}

function AddressBookPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Address Book</Text>
    </View>
  );
}

function AddressEditorPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Address</Text>
    </View>
  );
}

function OrderHistoryPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order History</Text>
    </View>
  );
}

function SettingsPlaceholder(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
    </View>
  );
}

export function ProfileStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ProfileHome" component={ProfileHomePlaceholder} />
      <Stack.Screen name="EditProfile" component={EditProfilePlaceholder} />
      <Stack.Screen name="AddressBook" component={AddressBookPlaceholder} />
      <Stack.Screen name="AddressEditor" component={AddressEditorPlaceholder} />
      <Stack.Screen name="OrderHistory" component={OrderHistoryPlaceholder} />
      <Stack.Screen name="Settings" component={SettingsPlaceholder} />
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
