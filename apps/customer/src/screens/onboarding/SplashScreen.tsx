import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

const ONBOARDING_KEY = 'foodrush_onboarding_seen';

export function SplashScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);

  const navigateAway = React.useCallback(async () => {
    try {
      const seen = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (seen === 'true') {
        navigation.replace('Main');
      } else {
        navigation.replace('Onboarding');
      }
    } catch {
      navigation.replace('Onboarding');
    }
  }, [navigation]);

  useEffect(() => {
    // Animate logo in
    logoOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    scale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });

    // Fade out after delay, then navigate
    opacity.value = withDelay(
      1800,
      withTiming(0, { duration: 400, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(navigateAway)();
        }
      }),
    );
  }, [logoOpacity, scale, opacity, navigateAway]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.View style={[styles.logoWrapper, logoStyle]}>
        <View style={styles.brandMark}>
          <Text style={styles.brandIcon}>🍔</Text>
        </View>
        <Text style={styles.brandName}>FoodRush</Text>
        <Text style={styles.tagline}>Delicious, delivered fast</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
  },
  brandMark: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  brandIcon: {
    fontSize: 48,
  },
  brandName: {
    fontFamily: 'Sora',
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 8,
  },
});
