import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AMBER = '#FFBE0B';

export function NetworkBanner(): React.JSX.Element | null {
  const [isOffline, setIsOffline] = useState(false);
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-60);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected ?? true);
      setIsOffline(offline);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    translateY.value = withTiming(isOffline ? 0 : -60, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, [isOffline, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: insets.top + 4 },
        animatedStyle,
      ]}
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLabel="No internet connection"
    >
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: AMBER,
    paddingBottom: 6,
    alignItems: 'center',
  },
  text: {
    fontFamily: 'Sora',
    fontSize: 13,
    fontWeight: '700',
    color: '#0A0A0A',
    letterSpacing: 0.5,
  },
});