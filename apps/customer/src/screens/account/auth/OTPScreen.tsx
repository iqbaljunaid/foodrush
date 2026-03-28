import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from '@foodrush/shared/components';
import { useAuth } from '@foodrush/shared/auth';
import { useTheme } from '@foodrush/shared/hooks/useTheme';
import type { AuthStackParamList, RootStackParamList } from '@/navigation/types';

// ── Types ────────────────────────────────────────────────────────────
type OTPRouteProp = RouteProp<AuthStackParamList, 'OTP'>;
type OTPNavProp = NativeStackNavigationProp<RootStackParamList>;

const OTP_LENGTH = 6;
const RESEND_INTERVAL_SECONDS = 60;

// ── Component ────────────────────────────────────────────────────────
export function OTPScreen(): React.JSX.Element {
  const route = useRoute<OTPRouteProp>();
  const navigation = useNavigation<OTPNavProp>();
  const { handleCallback } = useAuth();
  const { colors, spacing, radius } = useTheme();

  const { phone } = route.params;

  const [digits, setDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(RESEND_INTERVAL_SECONDS);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      const sanitized = value.replace(/[^\d]/g, '');
      if (sanitized.length > 1) {
        // Paste support: distribute digits across cells
        const pasted = sanitized.slice(0, OTP_LENGTH).split('');
        const newDigits = [...digits];
        pasted.forEach((d, i) => {
          if (index + i < OTP_LENGTH) {
            newDigits[index + i] = d;
          }
        });
        setDigits(newDigits);
        const nextIndex = Math.min(index + pasted.length, OTP_LENGTH - 1);
        inputRefs.current[nextIndex]?.focus();
        return;
      }

      const newDigits = [...digits];
      newDigits[index] = sanitized;
      setDigits(newDigits);
      setError(null);

      if (sanitized && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits],
  );

  const handleKeyPress = useCallback(
    (index: number, key: string) => {
      if (key === 'Backspace' && !digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    },
    [digits],
  );

  const handleVerify = useCallback(async () => {
    const code = digits.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);
    setError(null);
    try {
      await handleCallback(code);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch {
      setError('Invalid code. Please try again.');
      setDigits(Array.from({ length: OTP_LENGTH }, () => ''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  }, [digits, handleCallback, navigation]);

  const handleResend = useCallback(() => {
    if (!canResend) return;
    setCanResend(false);
    setResendTimer(RESEND_INTERVAL_SECONDS);
    setDigits(Array.from({ length: OTP_LENGTH }, () => ''));
    inputRefs.current[0]?.focus();
  }, [canResend]);

  const code = digits.join('');
  const isComplete = code.length === OTP_LENGTH;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Header */}
        <Text
          style={[styles.title, { color: colors.text, fontFamily: 'Sora' }]}
          accessibilityRole="header"
        >
          Verify your number
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted, fontFamily: 'DM Sans' }]}>
          We sent a 6-digit code to {phone}
        </Text>

        {/* OTP Cells */}
        <View style={styles.otpRow} accessibilityLabel="One-time password input">
          {digits.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              accessibilityLabel={`Digit ${index + 1} of ${OTP_LENGTH}`}
              style={[
                styles.otpCell,
                {
                  backgroundColor: colors.surfaceMid,
                  borderRadius: radius.md,
                  color: colors.text,
                  fontFamily: 'Sora',
                  borderColor: digit ? colors.primary : 'transparent',
                  borderWidth: 2,
                },
              ]}
              value={digit}
              onChangeText={(val) => handleDigitChange(index, val)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={OTP_LENGTH}
              selectTextOnFocus
              autoFocus={index === 0}
            />
          ))}
        </View>

        {/* Error */}
        {error && (
          <Text
            accessibilityRole="alert"
            style={[styles.errorText, { color: colors.danger }]}
          >
            {error}
          </Text>
        )}

        {/* Verify button */}
        <Button
          title="Verify"
          onPress={handleVerify}
          loading={isVerifying}
          disabled={!isComplete}
          style={{ marginTop: spacing.lg }}
        />

        {/* Resend */}
        <View style={styles.resendRow}>
          {canResend ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Resend verification code"
              onPress={handleResend}
            >
              <Text style={[styles.resendLink, { color: colors.primary, fontFamily: 'DM Sans' }]}>
                Resend code
              </Text>
            </Pressable>
          ) : (
            <Text style={[styles.resendText, { color: colors.textMuted, fontFamily: 'DM Sans' }]}>
              Resend code in {resendTimer}s
            </Text>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
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
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  otpCell: {
    width: 48,
    height: 56,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 24,
  },
  resendText: {
    fontSize: 14,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
