const { tokens } = require('../shared/src/tokens');

const driver = tokens.colors.driver;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './src/**/*.{ts,tsx}',
    '../shared/src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: driver.primary,
        secondary: driver.secondary,
        surface: driver.surface,
        'surface-mid': driver.surfaceMid,
        accent: driver.accent,
        danger: driver.danger,
        success: driver.success,
        'app-text': driver.text,
        'text-muted': driver.textMuted,
      },
      fontFamily: {
        display: [tokens.font.display.family],
        body: [tokens.font.body.family],
        mono: [tokens.font.mono.family],
      },
      spacing: {
        xs: `${tokens.spacing.xs}px`,
        sm: `${tokens.spacing.sm}px`,
        md: `${tokens.spacing.md}px`,
        lg: `${tokens.spacing.lg}px`,
        xl: `${tokens.spacing.xl}px`,
        xxl: `${tokens.spacing.xxl}px`,
      },
      borderRadius: {
        sm: `${tokens.radius.sm}px`,
        md: `${tokens.radius.md}px`,
        lg: `${tokens.radius.lg}px`,
        pill: `${tokens.radius.pill}px`,
      },
    },
  },
  plugins: [],
};