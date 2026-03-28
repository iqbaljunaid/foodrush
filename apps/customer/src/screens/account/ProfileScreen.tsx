import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  type ImageSourcePropType,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { userApi, type UpdateProfileInput } from '@foodrush/shared/api';
import { Avatar, Button } from '@foodrush/shared/components';
import { useAuth } from '@foodrush/shared/auth';
import { useTheme } from '@foodrush/shared/hooks/useTheme';
import type { ProfileStackParamList } from '@/navigation/types';

// ── Types ────────────────────────────────────────────────────────────
type ProfileNavProp = NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>;

interface DietaryOption {
  key: string;
  label: string;
}

// ── Constants ────────────────────────────────────────────────────────
const DIETARY_OPTIONS: readonly DietaryOption[] = [
  { key: 'vegan', label: 'Vegan' },
  { key: 'halal', label: 'Halal' },
  { key: 'gluten-free', label: 'Gluten-free' },
  { key: 'dairy-free', label: 'Dairy-free' },
  { key: 'nut-free', label: 'Nut-free' },
] as const;

// ── Component ────────────────────────────────────────────────────────
export function ProfileScreen(): React.JSX.Element {
  const navigation = useNavigation<ProfileNavProp>();
  const { user, logout } = useAuth();
  const { colors, spacing, radius } = useTheme();
  const queryClient = useQueryClient();

  const [editingField, setEditingField] = useState<'name' | 'email' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedDietary, setSelectedDietary] = useState<Set<string>>(
    new Set(user?.dietaryPreferences ?? []),
  );

  const updateProfileMutation = useMutation({
    mutationFn: (input: UpdateProfileInput) => userApi.updateProfile(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      setEditingField(null);
    },
  });

  const handleAvatarPress = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo library access to change your avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      // Upload would happen here via a dedicated avatar upload endpoint
    }
  }, []);

  const handleFieldEdit = useCallback(
    (field: 'name' | 'email') => {
      setEditingField(field);
      setEditValue(field === 'name' ? (user?.name ?? '') : (user?.email ?? ''));
    },
    [user],
  );

  const handleFieldSave = useCallback(() => {
    if (!editingField || !editValue.trim()) return;
    updateProfileMutation.mutate({ [editingField]: editValue.trim() });
  }, [editingField, editValue, updateProfileMutation]);

  const toggleDietary = useCallback(
    (key: string) => {
      setSelectedDietary((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        updateProfileMutation.mutate({ dietaryPreferences: Array.from(next) });
        return next;
      });
    },
    [updateProfileMutation],
  );

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => void logout(),
      },
    ]);
  }, [logout]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.surface }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Avatar section */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change profile picture"
        accessibilityHint="Opens photo picker"
        onPress={handleAvatarPress}
        style={styles.avatarSection}
      >
        <Avatar
          uri={user?.avatarUrl}
          name={user?.name ?? 'User'}
          size="lg"
        />
        <View
          style={[
            styles.avatarBadge,
            { backgroundColor: colors.primary, borderColor: colors.surface },
          ]}
        >
          <Ionicons name="camera" size={14} color="#FFFFFF" />
        </View>
      </Pressable>

      {/* Name field */}
      <View style={styles.fieldRow}>
        <View style={styles.fieldIcon}>
          <Ionicons name="person-outline" size={20} color={colors.textMuted} />
        </View>
        {editingField === 'name' ? (
          <View style={styles.editRow}>
            <TextInput
              accessibilityLabel="Edit full name"
              style={[
                styles.editInput,
                {
                  backgroundColor: colors.surfaceMid,
                  borderRadius: radius.sm,
                  color: colors.text,
                  fontFamily: 'DM Sans',
                },
              ]}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              autoCapitalize="words"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save name"
              onPress={handleFieldSave}
            >
              <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel editing"
              onPress={() => setEditingField(null)}
            >
              <Ionicons name="close-circle" size={28} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit name"
            onPress={() => handleFieldEdit('name')}
            style={styles.fieldContent}
          >
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textMuted, fontFamily: 'DM Sans' }]}>
                Name
              </Text>
              <Text style={[styles.fieldValue, { color: colors.text, fontFamily: 'DM Sans' }]}>
                {user?.name ?? '—'}
              </Text>
            </View>
            <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Email field */}
      <View style={styles.fieldRow}>
        <View style={styles.fieldIcon}>
          <Ionicons name="mail-outline" size={20} color={colors.textMuted} />
        </View>
        {editingField === 'email' ? (
          <View style={styles.editRow}>
            <TextInput
              accessibilityLabel="Edit email address"
              style={[
                styles.editInput,
                {
                  backgroundColor: colors.surfaceMid,
                  borderRadius: radius.sm,
                  color: colors.text,
                  fontFamily: 'DM Sans',
                },
              ]}
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save email"
              onPress={handleFieldSave}
            >
              <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel editing"
              onPress={() => setEditingField(null)}
            >
              <Ionicons name="close-circle" size={28} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit email"
            onPress={() => handleFieldEdit('email')}
            style={styles.fieldContent}
          >
            <View>
              <Text style={[styles.fieldLabel, { color: colors.textMuted, fontFamily: 'DM Sans' }]}>
                Email
              </Text>
              <Text style={[styles.fieldValue, { color: colors.text, fontFamily: 'DM Sans' }]}>
                {user?.email ?? '—'}
              </Text>
            </View>
            <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Dietary preferences */}
      <View style={styles.section}>
        <Text
          style={[styles.sectionTitle, { color: colors.text, fontFamily: 'Sora' }]}
          accessibilityRole="header"
        >
          Dietary preferences
        </Text>
        <View style={styles.chipGrid}>
          {DIETARY_OPTIONS.map((option) => {
            const isSelected = selectedDietary.has(option.key);
            return (
              <Pressable
                key={option.key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={option.label}
                onPress={() => toggleDietary(option.key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? `${colors.primary}15` : colors.surfaceMid,
                    borderColor: isSelected ? colors.primary : 'transparent',
                    borderRadius: radius.pill,
                  },
                ]}
              >
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                )}
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? colors.primary : colors.text,
                      fontFamily: 'DM Sans',
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Navigation links */}
      <View style={[styles.section, { marginTop: spacing.lg }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Address book"
          onPress={() => navigation.navigate('AddressBook')}
          style={[styles.menuItem, { borderBottomColor: colors.surfaceMid }]}
        >
          <Ionicons name="location-outline" size={22} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text, fontFamily: 'DM Sans' }]}>
            Address book
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Order history"
          onPress={() => navigation.navigate('OrderHistory')}
          style={[styles.menuItem, { borderBottomColor: colors.surfaceMid }]}
        >
          <Ionicons name="receipt-outline" size={22} color={colors.text} />
          <Text style={[styles.menuText, { color: colors.text, fontFamily: 'DM Sans' }]}>
            Order history
          </Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          onPress={handleSignOut}
          style={styles.menuItem}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          <Text style={[styles.menuText, { color: colors.danger, fontFamily: 'DM Sans' }]}>
            Sign out
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  avatarSection: {
    alignSelf: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  fieldIcon: {
    width: 32,
    alignItems: 'center',
  },
  fieldContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});
