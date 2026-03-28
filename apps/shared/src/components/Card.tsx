import React, { type ReactNode } from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { tokens } from '../tokens';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  accessibilityLabel: string;
}

export function Card({
  children,
  onPress,
  style,
  elevated = true,
  accessibilityLabel,
}: CardProps): React.JSX.Element {
  const { colors } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    ...(elevated ? tokens.shadow.card : {}),
  };

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={accessibilityLabel}
      style={[cardStyle, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});