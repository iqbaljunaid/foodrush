import React, { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { AppProviders } from './src/providers/AppProviders';
import { RootNavigator } from './src/navigation/RootNavigator';

SplashScreen.preventAutoHideAsync();

export default function App(): React.JSX.Element {
  const onReady = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    // Ensure splash screen hides even if navigation takes time
    const timeout = setTimeout(() => {
      void SplashScreen.hideAsync();
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <AppProviders>
      <NavigationContainer onReady={onReady}>
        <StatusBar style="dark" />
        <RootNavigator />
      </NavigationContainer>
    </AppProviders>
  );
}
