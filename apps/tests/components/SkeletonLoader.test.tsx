import React from 'react';
import { Animated } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { SkeletonLoader } from '@foodrush/shared/components';

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

// Spy on Animated.loop to verify animation runs
const loopSpy = jest.spyOn(Animated, 'loop');

afterEach(() => {
  loopSpy.mockClear();
});

describe('SkeletonLoader', () => {
  // ── Rect shape ──────────────────────────────────────────────────

  it('renders rect shape with correct dimensions', () => {
    render(<SkeletonLoader width={200} height={20} shape="rect" />);
    const loader = screen.getByLabelText('Loading content');
    const style = Array.isArray(loader.props.style)
      ? Object.assign({}, ...loader.props.style.flat())
      : loader.props.style;
    expect(style?.width).toBe(200);
    expect(style?.height).toBe(20);
  });

  it('uses rect shape by default', () => {
    const { toJSON } = render(<SkeletonLoader width={100} height={16} />);
    const tree = toJSON();
    // The shimmer (Animated.View) child should have borderRadius=6 (tokens.radius.sm)
    const shimmer = tree?.children?.[0];
    const shimmerStyle = Array.isArray(shimmer?.props?.style)
      ? Object.assign({}, ...shimmer.props.style.flat())
      : shimmer?.props?.style;
    expect(shimmerStyle?.borderRadius).toBe(6);
  });

  // ── Circle shape ────────────────────────────────────────────────

  it('renders circle shape with borderRadius = width/2', () => {
    const { toJSON } = render(
      <SkeletonLoader width={48} height={48} shape="circle" />,
    );
    const tree = toJSON();
    const shimmer = tree?.children?.[0];
    const shimmerStyle = Array.isArray(shimmer?.props?.style)
      ? Object.assign({}, ...shimmer.props.style.flat())
      : shimmer?.props?.style;
    expect(shimmerStyle?.borderRadius).toBe(24); // 48/2
  });

  // ── Animation ───────────────────────────────────────────────────

  it('starts a looping shimmer animation', () => {
    render(<SkeletonLoader width={100} height={16} />);
    expect(loopSpy).toHaveBeenCalledTimes(1);
  });

  it('stops animation on unmount', () => {
    const { unmount } = render(<SkeletonLoader width={100} height={16} />);
    const loopResult = loopSpy.mock.results[0]?.value as
      | Animated.CompositeAnimation
      | undefined;
    const stopSpy = jest.spyOn(loopResult ?? { stop: jest.fn() }, 'stop');
    unmount();
    expect(stopSpy).toHaveBeenCalled();
  });

  // ── Theming ─────────────────────────────────────────────────────

  it('uses surfaceMid color for background', () => {
    const { toJSON } = render(<SkeletonLoader width={100} height={16} />);
    const tree = toJSON();
    const shimmer = tree?.children?.[0];
    const shimmerStyle = Array.isArray(shimmer?.props?.style)
      ? Object.assign({}, ...shimmer.props.style.flat())
      : shimmer?.props?.style;
    expect(shimmerStyle?.backgroundColor).toBe('#F7F7F7');
  });

  // ── Accessibility ───────────────────────────────────────────────

  it('sets accessibilityLabel for screen readers', () => {
    render(<SkeletonLoader width={100} height={16} />);
    expect(screen.getByLabelText('Loading content')).toBeTruthy();
  });

  it('has accessibilityRole=none to avoid reader confusion', () => {
    render(<SkeletonLoader width={100} height={16} />);
    const loader = screen.getByLabelText('Loading content');
    expect(loader.props.accessibilityRole).toBe('none');
  });
});
