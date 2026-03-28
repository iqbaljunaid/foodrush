import React, { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { AppProviders } from './src/providers/AppProviders';
import { RootNavigator } from './src/navigation/RootNavigator';

SplashScreen.preventAutoHideAsync();

const DriverDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#00C896',
    background: '#0A0A0A',
    card: '#111111',
    text: '#F5F5F5',
    border: '#2A2A2A',
    notification: '#FFBE0B',
  },
};

export default function App(): React.JSX.Element {
  const onReady = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void SplashScreen.hideAsync();
    }, 3000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <AppProviders>
      <NavigationContainer theme={DriverDarkTheme} onReady={onReady}>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </AppProviders>
  );
}