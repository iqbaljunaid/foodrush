import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '@foodrush/shared/components';

// Mock useTheme to return customer colors
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
    shadow: { card: {}, modal: {} },
    appId: 'customer' as const,
  }),
}));

describe('Button', () => {
  // ── Variant rendering ───────────────────────────────────────────

  it('renders primary variant with correct text', () => {
    render(<Button title="Order Now" variant="primary" />);
    expect(screen.getByText('Order Now')).toBeTruthy();
  });

  it('renders secondary variant', () => {
    render(<Button title="Cancel" variant="secondary" />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('renders ghost variant', () => {
    render(<Button title="Skip" variant="ghost" />);
    expect(screen.getByText('Skip')).toBeTruthy();
  });

  it('renders danger variant', () => {
    render(<Button title="Delete" variant="danger" />);
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  // ── Size variations ─────────────────────────────────────────────

  it('renders small size', () => {
    render(<Button title="Sm" size="sm" />);
    expect(screen.getByText('Sm')).toBeTruthy();
  });

  it('renders medium size (default)', () => {
    render(<Button title="Md" />);
    expect(screen.getByText('Md')).toBeTruthy();
  });

  it('renders large size', () => {
    render(<Button title="Lg" size="lg" />);
    expect(screen.getByText('Lg')).toBeTruthy();
  });

  // ── Loading state ───────────────────────────────────────────────

  it('shows ActivityIndicator when loading', () => {
    render(<Button title="Submit" loading />);
    expect(screen.queryByText('Submit')).toBeNull();
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('is disabled when loading', () => {
    const onPress = jest.fn();
    render(<Button title="Submit" loading onPress={onPress} />);
    const button = screen.getByRole('button');
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  // ── Disabled state ──────────────────────────────────────────────

  it('does not fire onPress when disabled', () => {
    const onPress = jest.fn();
    render(<Button title="Disabled" disabled onPress={onPress} />);
    const button = screen.getByRole('button');
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('sets opacity to 0.5 when disabled', () => {
    render(<Button title="Disabled" disabled />);
    const button = screen.getByRole('button');
    const flatStyle = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style.flat())
      : button.props.style;
    expect(flatStyle.opacity).toBe(0.5);
  });

  // ── Press handler ───────────────────────────────────────────────

  it('fires onPress when pressed', () => {
    const onPress = jest.fn();
    render(<Button title="Tap me" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // ── Accessibility ───────────────────────────────────────────────

  it('sets accessibilityRole to button', () => {
    render(<Button title="A11y" />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('sets accessibilityLabel to the title', () => {
    render(<Button title="Place Order" />);
    expect(screen.getByLabelText('Place Order')).toBeTruthy();
  });

  it('sets accessibilityState.disabled when disabled', () => {
    render(<Button title="No" disabled />);
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('sets accessibilityState.busy when loading', () => {
    render(<Button title="Loading" loading />);
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState).toMatchObject({ busy: true });
  });
});
