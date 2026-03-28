import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Card } from '@foodrush/shared/components';

jest.mock('@foodrush/shared/hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#FF6B35',
      secondary: '#1A1A2E',
      surface: '#FFFFFF',
      surfaceMid: '#F7F7F7',
      accent: '#FFD166',
      danger: '#EF233C',
      success: '#06D6A0',
      text: '#0D0D0D',
      textMuted: '#6B7280',
    },
    spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
    radius: { sm: 6, md: 12, lg: 20, pill: 999 },
    font: {
      display: { family: 'Sora', weight: '700' },
      body: { family: 'DM Sans', weight: '400' },
      mono: { family: 'JetBrains Mono', weight: '400' },
    },
    shadow: {
      card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
      modal: {},
    },
    appId: 'customer' as const,
  }),
}));

describe('Card', () => {
  // ── Basic rendering ─────────────────────────────────────────────

  it('renders children correctly', () => {
    render(
      <Card accessibilityLabel="Test card">
        <Text>Card content</Text>
      </Card>,
    );
    expect(screen.getByText('Card content')).toBeTruthy();
  });

  // ── Pressable behavior ──────────────────────────────────────────

  it('renders as Pressable when onPress is provided', () => {
    const onPress = jest.fn();
    render(
      <Card accessibilityLabel="Pressable card" onPress={onPress}>
        <Text>Tap me</Text>
      </Card>,
    );
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('fires onPress callback when tapped', () => {
    const onPress = jest.fn();
    render(
      <Card accessibilityLabel="Pressable card" onPress={onPress}>
        <Text>Tap</Text>
      </Card>,
    );
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders as View (non-pressable) when no onPress', () => {
    render(
      <Card accessibilityLabel="Static card">
        <Text>Static</Text>
      </Card>,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Static')).toBeTruthy();
  });

  // ── Shadow / elevation ──────────────────────────────────────────

  it('applies shadow styles when elevated=true (default)', () => {
    const { toJSON } = render(
      <Card accessibilityLabel="Elevated card">
        <Text>Elevated</Text>
      </Card>,
    );
    const tree = toJSON();
    expect(tree).toBeTruthy();
    // Elevated cards should have elevation style
    const style = Array.isArray(tree?.props?.style)
      ? Object.assign({}, ...tree.props.style.flat())
      : tree?.props?.style;
    expect(style?.elevation).toBe(3);
  });

  it('does not apply shadow when elevated=false', () => {
    const { toJSON } = render(
      <Card accessibilityLabel="Flat card" elevated={false}>
        <Text>Flat</Text>
      </Card>,
    );
    const tree = toJSON();
    const style = Array.isArray(tree?.props?.style)
      ? Object.assign({}, ...tree.props.style.flat())
      : tree?.props?.style;
    expect(style?.elevation).toBeUndefined();
  });

  // ── Accessibility ───────────────────────────────────────────────

  it('sets accessibilityLabel', () => {
    render(
      <Card accessibilityLabel="Restaurant card">
        <Text>Label test</Text>
      </Card>,
    );
    expect(screen.getByLabelText('Restaurant card')).toBeTruthy();
  });

  it('has accessibilityRole=button when pressable', () => {
    render(
      <Card accessibilityLabel="Button card" onPress={jest.fn()}>
        <Text>Role test</Text>
      </Card>,
    );
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('has accessibilityRole=summary when non-pressable', () => {
    render(
      <Card accessibilityLabel="Summary card">
        <Text>Summary test</Text>
      </Card>,
    );
    expect(screen.getByRole('summary')).toBeTruthy();
  });
});
