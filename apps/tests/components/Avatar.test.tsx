import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Avatar } from '@foodrush/shared/components';

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

describe('Avatar', () => {
  // ── Image rendering ─────────────────────────────────────────────

  it('renders an image when uri is provided', () => {
    render(<Avatar name="Jane Doe" uri="https://example.com/avatar.jpg" />);
    const avatar = screen.getByRole('image');
    expect(avatar).toBeTruthy();
  });

  it('renders an image when source prop is provided', () => {
    const source = { uri: 'https://example.com/avatar.png' };
    render(<Avatar name="John Smith" source={source} />);
    expect(screen.getByRole('image')).toBeTruthy();
  });

  // ── Initials fallback ──────────────────────────────────────────

  it('renders initials when no image is provided', () => {
    render(<Avatar name="Jane Doe" />);
    expect(screen.getByText('JD')).toBeTruthy();
  });

  it('renders single initial for single name', () => {
    render(<Avatar name="Jane" />);
    expect(screen.getByText('J')).toBeTruthy();
  });

  it('renders first two initials for three-part name', () => {
    render(<Avatar name="Mary Jane Watson" />);
    expect(screen.getByText('MJ')).toBeTruthy();
  });

  it('handles empty string gracefully', () => {
    render(<Avatar name="" />);
    expect(screen.getByRole('image')).toBeTruthy();
    expect(screen.getByLabelText('Avatar for ')).toBeTruthy();
  });

  it('falls back to initials when image errors', () => {
    render(<Avatar name="Error User" uri="https://broken.example.com/404.jpg" />);
    const image = screen.getByRole('image');
    // Simulate image load error
    fireEvent(image.findByType?.('Image') ?? image, 'onError');
    // After error, initials should be visible
    // (Component uses state to toggle between image and initials)
  });

  // ── Size variations ─────────────────────────────────────────────

  it('renders small size (32px)', () => {
    render(<Avatar name="Sm" size="sm" />);
    const avatar = screen.getByRole('image');
    const style = Array.isArray(avatar.props.style)
      ? Object.assign({}, ...avatar.props.style.flat())
      : avatar.props.style;
    expect(style?.width).toBe(32);
    expect(style?.height).toBe(32);
  });

  it('renders medium size (48px, default)', () => {
    render(<Avatar name="Md" />);
    const avatar = screen.getByRole('image');
    const style = Array.isArray(avatar.props.style)
      ? Object.assign({}, ...avatar.props.style.flat())
      : avatar.props.style;
    expect(style?.width).toBe(48);
    expect(style?.height).toBe(48);
  });

  it('renders large size (72px)', () => {
    render(<Avatar name="Lg" size="lg" />);
    const avatar = screen.getByRole('image');
    const style = Array.isArray(avatar.props.style)
      ? Object.assign({}, ...avatar.props.style.flat())
      : avatar.props.style;
    expect(style?.width).toBe(72);
    expect(style?.height).toBe(72);
  });

  it('renders circular shape (borderRadius = dimension/2)', () => {
    render(<Avatar name="Circle" size="md" />);
    const avatar = screen.getByRole('image');
    const style = Array.isArray(avatar.props.style)
      ? Object.assign({}, ...avatar.props.style.flat())
      : avatar.props.style;
    expect(style?.borderRadius).toBe(24); // 48/2
  });

  // ── Accessibility ───────────────────────────────────────────────

  it('sets accessibilityRole to image', () => {
    render(<Avatar name="A11y User" />);
    expect(screen.getByRole('image')).toBeTruthy();
  });

  it('sets accessibilityLabel with user name', () => {
    render(<Avatar name="Jane Doe" />);
    expect(screen.getByLabelText('Avatar for Jane Doe')).toBeTruthy();
  });
});
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Avatar } from '@foodrush/shared/components';

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

describe('Avatar', () => {
  // ── Image rendering ─────────────────────────────────────────────

  it('renders image when a valid uri is provided', () => {
    render(<Avatar name="Jane Doe" uri="https://example.com/avatar.png" />);
    const avatar = screen.getByRole('image');
    expect(avatar).toBeTruthy();
  });

  it('renders image when a source prop is provided', () => {
    const source = { uri: 'https://example.com/avatar.png' };
    render(<Avatar name="Jane Doe" source={source} />);
    expect(screen.getByRole('image')).toBeTruthy();
  });

  // ── Initials fallback ───────────────────────────────────────────

  it('renders initials when no image source is given', () => {
    render(<Avatar name="Jane Doe" />);
    expect(screen.getByText('JD')).toBeTruthy();
  });

  it('renders single initial for single-word name', () => {
    render(<Avatar name="Jane" />);
    expect(screen.getByText('J')).toBeTruthy();
  });

  it('renders initials for three-part name (two initials)', () => {
    render(<Avatar name="Alice Bob Charlie" />);
    expect(screen.getByText('AB')).toBeTruthy();
  });

  it('falls back to initials when image fails to load', () => {
    const { getByRole, getByText } = render(
      <Avatar name="Jane Doe" uri="https://example.com/broken.png" />,
    );
    // Simulate image error
    const image = getByRole('image');
    const imageChild = image.findAllByType?.('Image')?.[0];
    // The component uses onError to trigger fallback
    // We test that initials are rendered after error
    fireEvent(image, 'error');
    // After error, initials should show
    expect(getByText('JD')).toBeTruthy();
  });

  // ── Size variations ─────────────────────────────────────────────

  it('renders small size (32px)', () => {
    const { toJSON } = render(<Avatar name="A B" size="sm" />);
    const tree = toJSON();
    const style = Array.isArray(tree?.props?.style)
      ? Object.assign({}, ...tree.props.style.flat())
      : tree?.props?.style;
    expect(style?.width).toBe(32);
    expect(style?.height).toBe(32);
  });

  it('renders medium size (48px, default)', () => {
    const { toJSON } = render(<Avatar name="A B" />);
    const tree = toJSON();
    const style = Array.isArray(tree?.props?.style)
      ? Object.assign({}, ...tree.props.style.flat())
      : tree?.props?.style;
    expect(style?.width).toBe(48);
    expect(style?.height).toBe(48);
  });

  it('renders large size (72px)', () => {
    const { toJSON } = render(<Avatar name="A B" size="lg" />);
    const tree = toJSON();
    const style = Array.isArray(tree?.props?.style)
      ? Object.assign({}, ...tree.props.style.flat())
      : tree?.props?.style;
    expect(style?.width).toBe(72);
    expect(style?.height).toBe(72);
  });

  it('applies circular border radius matching size', () => {
    const { toJSON } = render(<Avatar name="A B" size="lg" />);
    const tree = toJSON();
    const style = Array.isArray(tree?.props?.style)
      ? Object.assign({}, ...tree.props.style.flat())
      : tree?.props?.style;
    expect(style?.borderRadius).toBe(36); // 72 / 2
  });

  // ── Accessibility ───────────────────────────────────────────────

  it('sets accessibilityRole=image', () => {
    render(<Avatar name="Test User" />);
    expect(screen.getByRole('image')).toBeTruthy();
  });

  it('sets accessibilityLabel with user name', () => {
    render(<Avatar name="John Smith" />);
    expect(screen.getByLabelText('Avatar for John Smith')).toBeTruthy();
  });
});
