import { useMemo } from 'react';
import { tokens, type AppId, type ColorScheme } from '../tokens';

function getAppId(): AppId {
  const id = process.env.EXPO_PUBLIC_APP_ID ?? process.env.APP_ID ?? 'customer';
  if (id === 'driver') return 'driver';
  return 'customer';
}

export interface Theme {
  colors: ColorScheme;
  spacing: typeof tokens.spacing;
  radius: typeof tokens.radius;
  font: typeof tokens.font;
  shadow: typeof tokens.shadow;
  appId: AppId;
}

export function useTheme(): Theme {
  const appId = getAppId();

  return useMemo(
    () => ({
      colors: tokens.colors[appId],
      spacing: tokens.spacing,
      radius: tokens.radius,
      font: tokens.font,
      shadow: tokens.shadow,
      appId,
    }),
    [appId],
  );
}