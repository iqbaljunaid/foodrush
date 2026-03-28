import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@foodrush/shared/auth';
import { Button } from '@foodrush/shared/components';
import { useTheme } from '@foodrush/shared/hooks/useTheme';
import type { RootStackParamList } from '@/navigation/types';

// ── Types ────────────────────────────────────────────────────────────
type RegisterNavProp = NativeStackNavigationProp<RootStackParamList>;

interface FormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  termsAccepted: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  terms?: string;
}

// ── Validation ───────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?\d{7,15}$/;

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = 'Name is required';
  if (!EMAIL_REGEX.test(form.email)) errors.email = 'Enter a valid email';
  if (!PHONE_REGEX.test(form.phone)) errors.phone = 'Enter a valid phone number';
  if (form.password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (!form.termsAccepted) errors.terms = 'You must accept the terms';
  return errors;
}

// ── Component ────────────────────────────────────────────────────────
export function RegisterScreen(): React.JSX.Element {
  const navigation = useNavigation<RegisterNavProp>();
  const { register } = useAuth();
  const { colors, spacing, radius } = useTheme();

  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    password: '',
    termsAccepted: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setApiError(null);
  }, []);

  const handleRegister = useCallback(async () => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setApiError(null);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      });
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setApiError(message);
    } finally {
      setIsLoading(false);
    }
  }, [form, register, navigation]);

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.surfaceMid,
      borderRadius: radius.md,
      color: colors.text,
      fontFamily: 'DM Sans',
    },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text
          style={[styles.title, { color: colors.text, fontFamily: 'Sora' }]}
          accessibilityRole="header"
        >
          Create your account
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: 'DM Sans' }]}>
          Join FoodRush and start ordering
        </Text>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text, fontFamily: 'DM Sans' }]}>
            Full name
          </Text>
          <TextInput
            accessibilityLabel="Full name"
            style={inputStyle}
            value={form.name}
            onChangeText={(v) => updateField('name', v)}
            placeholder="John Doe"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
          />
          {errors.name && (
            <Text accessibilityRole="alert" style={[styles.fieldError, { color: colors.danger }]}>
              {errors.name}
            </Text>
          )}
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text, fontFamily: 'DM Sans' }]}>Email</Text>
          <TextInput
            accessibilityLabel="Email address"
            style={inputStyle}
            value={form.email}
            onChangeText={(v) => updateField('email', v)}
            placeholder="john@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            autoComplete="email"
          />
          {errors.email && (
            <Text accessibilityRole="alert" style={[styles.fieldError, { color: colors.danger }]}>
              {errors.email}
            </Text>
          )}
        </View>

        {/* Phone */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text, fontFamily: 'DM Sans' }]}>Phone</Text>
          <TextInput
            accessibilityLabel="Phone number"
            style={inputStyle}
            value={form.phone}
            onChangeText={(v) => updateField('phone', v.replace(/[^\d+]/g, ''))}
            placeholder="+1234567890"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
          />
          {errors.phone && (
            <Text accessibilityRole="alert" style={[styles.fieldError, { color: colors.danger }]}>
              {errors.phone}
            </Text>
          )}
        </View>

        {/* Password */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.text, fontFamily: 'DM Sans' }]}>
            Password
          </Text>
          <View style={styles.passwordRow}>
            <TextInput
              accessibilityLabel="Password"
              style={[...inputStyle, styles.passwordInput]}
              value={form.password}
              onChangeText={(v) => updateField('password', v)}
              placeholder="Minimum 8 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              autoComplete="password-new"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              onPress={() => setShowPassword((p) => !p)}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
          {errors.password && (
            <Text accessibilityRole="alert" style={[styles.fieldError, { color: colors.danger }]}>
              {errors.password}
            </Text>
          )}
        </View>

        {/* Terms */}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: form.termsAccepted }}
          accessibilityLabel="Accept terms and conditions"
          onPress={() => updateField('termsAccepted', !form.termsAccepted)}
          style={styles.termsRow}
        >
          <Ionicons
            name={form.termsAccepted ? 'checkbox' : 'square-outline'}
            size={24}
            color={form.termsAccepted ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.termsText, { color: colors.textMuted, fontFamily: 'DM Sans' }]}>
            I agree to the{' '}
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Privacy Policy</Text>
          </Text>
        </Pressable>
        {errors.terms && (
          <Text accessibilityRole="alert" style={[styles.fieldError, { color: colors.danger }]}>
            {errors.terms}
          </Text>
        )}

        {/* API Error */}
        {apiError && (
          <Text
            accessibilityRole="alert"
            style={[styles.apiError, { color: colors.danger }]}
          >
            {apiError}
          </Text>
        )}

        {/* Submit */}
        <Button
          title="Create account"
          onPress={handleRegister}
          loading={isLoading}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  fieldError: {
    fontSize: 13,
    marginTop: 4,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 4,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  apiError: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});
