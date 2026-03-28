import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Badge } from '@foodrush/shared/components';

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

describe('Badge', () => {
  // ── Variant rendering ───────────────────────────────────────────

  it('renders neutral variant by default', () => {
    render(<Badge label="Default" />);
    expect(screen.getByText('Default')).toBeTruthy();
  });

  it('renders success variant with correct semantic color', () => {
    render(<Badge label="Active" variant="success" />);
    const text = screen.getByText('Active');
    const style = Array.isArray(text.props.style)
      ? Object.assign({}, ...text.props.style.flat())
      : text.props.style;
    expect(style?.color).toBe('#06D6A0');
  });

  it('renders danger variant with correct semantic color', () => {
    render(<Badge label="Cancelled" variant="danger" />);
    const text = screen.getByText('Cancelled');
    const style = Array.isArray(text.props.style)
      ? Object.assign({}, ...text.props.style.flat())
      : text.props.style;
    expect(style?.color).toBe('#EF233C');
  });

  it('renders warning variant with accent color', () => {
    render(<Badge label="Pending" variant="warning" />);
    const text = screen.getByText('Pending');
    const style = Array.isArray(text.props.style)
      ? Object.assign({}, ...text.props.style.flat())
      : text.props.style;
    expect(style?.color).toBe('#FFD166');
  });

  it('renders info variant with primary color', () => {
    render(<Badge label="New" variant="info" />);
    const text = screen.getByText('New');
    const style = Array.isArray(text.props.style)
      ? Object.assign({}, ...text.props.style.flat())
      : text.props.style;
    expect(style?.color).toBe('#FF6B35');
  });

  it('renders neutral variant with textMuted color', () => {
    render(<Badge label="Draft" variant="neutral" />);
    const text = screen.getByText('Draft');
    const style = Array.isArray(text.props.style)
      ? Object.assign({}, ...text.props.style.flat())
      : text.props.style;
    expect(style?.color).toBe('#6B7280');
  });

  // ── Background color variations ─────────────────────────────────

  it('applies translucent background matching variant', () => {
    const { toJSON } = render(<Badge label="BG Test" variant="success" />);
    const tree = toJSON();
    const style = Array.isArray(tree?.props?.style)
      ? Object.assign({}, ...tree.props.style.flat())
      : tree?.props?.style;
    // success bg is `${colors.success}20` = '#06D6A020'
    expect(style?.backgroundColor).toBe('#06D6A020');
  });

  // ── Pill shape ──────────────────────────────────────────────────

  it('has pill border radius (999)', () => {
    const { toJSON } = render(<Badge label="Pill" />);
    const tree = toJSON();
    const style = Array.isArray(tree?.props?.style)
      ? Object.assign({}, ...tree.props.style.flat())
      : tree?.props?.style;
    expect(style?.borderRadius).toBe(999);
  });

  // ── Accessibility ───────────────────────────────────────────────

  it('sets accessibilityRole to text', () => {
    render(<Badge label="A11y Badge" />);
    const badge = screen.getByRole('text');
    expect(badge).toBeTruthy();
  });

  it('sets accessibilityLabel to the label text', () => {
    render(<Badge label="Delivered" />);
    expect(screen.getByLabelText('Delivered')).toBeTruthy();
  });
});
