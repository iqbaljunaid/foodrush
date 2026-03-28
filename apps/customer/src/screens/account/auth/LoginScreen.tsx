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

import { userApi } from '@foodrush/shared/api';
import { Button } from '@foodrush/shared/components';
import { useTheme, type Theme } from '@foodrush/shared/hooks/useTheme';
import type { AuthStackParamList } from '@/navigation/types';

// ── Types ────────────────────────────────────────────────────────────
interface CountryCode {
  code: string;
  dial: string;
  flag: string;
}

type LoginNavProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

// ── Constants ────────────────────────────────────────────────────────
const COUNTRY_CODES: readonly CountryCode[] = [
  { code: 'US', dial: '+1', flag: '🇺🇸' },
  { code: 'GB', dial: '+44', flag: '🇬🇧' },
  { code: 'CA', dial: '+1', flag: '🇨🇦' },
  { code: 'AU', dial: '+61', flag: '🇦🇺' },
  { code: 'IN', dial: '+91', flag: '🇮🇳' },
  { code: 'PK', dial: '+92', flag: '🇵🇰' },
  { code: 'AE', dial: '+971', flag: '🇦🇪' },
] as const;

const PHONE_REGEX = /^\d{7,15}$/;

// ── Component ────────────────────────────────────────────────────────
export function LoginScreen(): React.JSX.Element {
  const navigation = useNavigation<LoginNavProp>();
  const { colors, spacing, radius } = useTheme();

  const [phone, setPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPhoneValid = PHONE_REGEX.test(phone);

  const handleContinue = useCallback(async () => {
    if (!isPhoneValid) {
      setError('Please enter a valid phone number');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fullPhone = `${selectedCountry.dial}${phone}`;
      navigation.navigate('OTP', { phone: fullPhone });
    } finally {
      setIsLoading(false);
    }
  }, [isPhoneValid, phone, selectedCountry.dial, navigation]);

  const handleSocialLogin = useCallback(
    (provider: 'apple' | 'google') => {
      // Social login will be handled by native modules
      setError(`${provider} login coming soon`);
    },
    [],
  );

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
        <View style={styles.header}>
          <Text
            style={[styles.title, { color: colors.text, fontFamily: 'Sora' }]}
            accessibilityRole="header"
          >
            Welcome to FoodRush
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: 'DM Sans' }]}>
            Enter your phone number to continue
          </Text>
        </View>

        {/* Phone input */}
        <View style={styles.phoneRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Country code ${selectedCountry.dial}`}
            accessibilityHint="Opens country code picker"
            onPress={() => setShowCountryPicker(!showCountryPicker)}
            style={[
              styles.countryPicker,
              {
                backgroundColor: colors.surfaceMid,
                borderRadius: radius.md,
              },
            ]}
          >
            <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
            <Text style={[styles.countryDial, { color: colors.text, fontFamily: 'DM Sans' }]}>
              {selectedCountry.dial}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>

          <TextInput
            accessibilityLabel="Phone number"
            accessibilityHint="Enter your phone number"
            style={[
              styles.phoneInput,
              {
                backgroundColor: colors.surfaceMid,
                borderRadius: radius.md,
                color: colors.text,
                fontFamily: 'DM Sans',
              },
            ]}
            value={phone}
            onChangeText={(text) => {
              setPhone(text.replace(/[^\d]/g, ''));
              setError(null);
            }}
            placeholder="Phone number"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            maxLength={15}
          />
        </View>

        {/* Country code dropdown */}
        {showCountryPicker && (
          <View
            style={[
              styles.countryDropdown,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceMid,
                borderRadius: radius.md,
              },
            ]}
          >
            {COUNTRY_CODES.map((country) => (
              <Pressable
                key={country.code}
                accessibilityRole="button"
                accessibilityLabel={`Select ${country.code} ${country.dial}`}
                onPress={() => {
                  setSelectedCountry(country);
                  setShowCountryPicker(false);
                }}
                style={[
                  styles.countryOption,
                  selectedCountry.code === country.code && {
                    backgroundColor: `${colors.primary}15`,
                  },
                ]}
              >
                <Text style={styles.countryFlag}>{country.flag}</Text>
                <Text style={[styles.countryOptionText, { color: colors.text }]}>
                  {country.code}
                </Text>
                <Text style={[styles.countryOptionDial, { color: colors.textMuted }]}>
                  {country.dial}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Error */}
        {error && (
          <Text
            accessibilityRole="alert"
            style={[styles.errorText, { color: colors.danger }]}
          >
            {error}
          </Text>
        )}

        {/* Continue button */}
        <Button
          title="Continue"
          onPress={handleContinue}
          loading={isLoading}
          disabled={!isPhoneValid}
          style={{ marginTop: spacing.lg }}
        />

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.surfaceMid }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted, fontFamily: 'DM Sans' }]}>
            or continue with
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.surfaceMid }]} />
        </View>

        {/* Social login */}
        <View style={styles.socialRow}>
          {Platform.OS === 'ios' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in with Apple"
              onPress={() => handleSocialLogin('apple')}
              style={[
                styles.socialButton,
                {
                  backgroundColor: '#000000',
                  borderRadius: radius.md,
                },
              ]}
            >
              <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
              <Text style={[styles.socialText, { color: '#FFFFFF' }]}>Apple</Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in with Google"
            onPress={() => handleSocialLogin('google')}
            style={[
              styles.socialButton,
              {
                backgroundColor: colors.surfaceMid,
                borderRadius: radius.md,
              },
            ]}
          >
            <Ionicons name="logo-google" size={22} color="#DB4437" />
            <Text style={[styles.socialText, { color: colors.text }]}>Google</Text>
          </Pressable>
        </View>

        {/* Register link */}
        <View style={styles.registerRow}>
          <Text style={[styles.registerText, { color: colors.textMuted, fontFamily: 'DM Sans' }]}>
            Don&apos;t have an account?{' '}
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Create an account"
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={[styles.registerLink, { color: colors.primary, fontFamily: 'DM Sans' }]}>
              Sign up
            </Text>
          </Pressable>
        </View>
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
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 12,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
  },
  countryFlag: {
    fontSize: 20,
  },
  countryDial: {
    fontSize: 16,
    fontWeight: '500',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  countryDropdown: {
    marginTop: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  countryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  countryOptionText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  countryOptionDial: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    marginTop: 8,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  socialText: {
    fontSize: 16,
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
