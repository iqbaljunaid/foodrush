import { type TextStyle, type ViewStyle } from 'react-native';

export interface ColorScheme {
  primary: string;
  secondary: string;
  surface: string;
  surfaceMid: string;
  accent: string;
  danger: string;
  success: string;
  text: string;
  textMuted: string;
}

export interface FontToken {
  family: string;
  weight: TextStyle['fontWeight'];
}

export const tokens = {
  colors: {
    customer: {
      primary: '#FF6B35',
      secondary: '#1A1A2E',
      surface: '#FFFFFF',
      surfaceMid: '#F7F7F7',
      accent: '#FFD166',
      danger: '#EF233C',
      success: '#06D6A0',
      text: '#0D0D0D',
      textMuted: '#6B7280',
    } satisfies ColorScheme,
    driver: {
      primary: '#00C896',
      secondary: '#0A0A0A',
      surface: '#111111',
      surfaceMid: '#1C1C1C',
      accent: '#FFBE0B',
      danger: '#FF3A5C',
      success: '#00C896',
      text: '#F5F5F5',
      textMuted: '#9CA3AF',
    } satisfies ColorScheme,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 20,
    pill: 999,
  },
  font: {
    display: { family: 'Sora', weight: '700' } satisfies FontToken,
    body: { family: 'DM Sans', weight: '400' } satisfies FontToken,
    mono: { family: 'JetBrains Mono', weight: '400' } satisfies FontToken,
  },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    } satisfies ViewStyle,
    modal: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 10,
    } satisfies ViewStyle,
  },
} as const;

export type AppId = 'customer' | 'driver';
export type SpacingKey = keyof typeof tokens.spacing;
export type RadiusKey = keyof typeof tokens.radius;
export type FontKey = keyof typeof tokens.font;