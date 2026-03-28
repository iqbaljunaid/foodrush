import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { tokens } from '../tokens';

type SkeletonShape = 'rect' | 'circle';

interface SkeletonLoaderProps {
  width: number;
  height: number;
  shape?: SkeletonShape;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonLoader({
  width,
  height,
  shape = 'rect',
  style,
}: SkeletonLoaderProps): React.JSX.Element {
  const { colors } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const borderRadius = shape === 'circle' ? width / 2 : tokens.radius.sm;

  return (
    <View
      accessibilityRole="none"
      accessibilityLabel="Loading content"
      style={[{ width, height }, style]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            width,
            height,
            borderRadius,
            backgroundColor: colors.surfaceMid,
            opacity,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shimmer: {
    position: 'absolute',
  },
});