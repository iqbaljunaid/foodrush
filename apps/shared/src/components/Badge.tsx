import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { tokens } from '../tokens';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

export function Badge({
  label,
  variant = 'neutral',
  style,
}: BadgeProps): React.JSX.Element {
  const { colors } = useTheme();

  const getColors = (): { bg: string; fg: string } => {
    switch (variant) {
      case 'success':
        return { bg: `${colors.success}20`, fg: colors.success };
      case 'danger':
        return { bg: `${colors.danger}20`, fg: colors.danger };
      case 'warning':
        return { bg: `${colors.accent}30`, fg: colors.accent };
      case 'info':
        return { bg: `${colors.primary}20`, fg: colors.primary };
      case 'neutral':
        return { bg: `${colors.textMuted}20`, fg: colors.textMuted };
    }
  };

  const { bg, fg } = getColors();

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[styles.container, { backgroundColor: bg }, style]}
    >
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: tokens.radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontFamily: tokens.font.body.family,
    fontWeight: '600',
  },
});