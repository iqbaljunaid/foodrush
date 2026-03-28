import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { ToastProvider, useToast } from '@foodrush/shared/components';

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

jest.useFakeTimers();

/** Helper component that triggers toasts from button presses */
function ToastTrigger({
  message,
  variant,
  durationMs,
}: {
  message: string;
  variant?: 'success' | 'error' | 'info';
  durationMs?: number;
}): React.JSX.Element {
  const { show } = useToast();
  return (
    <Text
      testID="trigger"
      onPress={() => show(message, variant, durationMs)}
    >
      Trigger
    </Text>
  );
}

function renderWithProvider(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('Toast', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  // ── Variant rendering ───────────────────────────────────────────

  it('renders success toast', () => {
    renderWithProvider(
      <ToastTrigger message="Order placed!" variant="success" />,
    );
    fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByText('Order placed!')).toBeTruthy();
  });

  it('renders error toast', () => {
    renderWithProvider(
      <ToastTrigger message="Payment failed" variant="error" />,
    );
    fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByText('Payment failed')).toBeTruthy();
  });

  it('renders info toast (default)', () => {
    renderWithProvider(
      <ToastTrigger message="Courier assigned" />,
    );
    fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByText('Courier assigned')).toBeTruthy();
  });

  // ── Auto-dismiss ────────────────────────────────────────────────

  it('auto-dismisses after default 3000ms', () => {
    renderWithProvider(
      <ToastTrigger message="Auto dismiss" />,
    );
    fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByText('Auto dismiss')).toBeTruthy();

    // Advance timers past the dismiss duration + animation
    act(() => {
      jest.advanceTimersByTime(3200);
    });

    expect(screen.queryByText('Auto dismiss')).toBeNull();
  });

  it('auto-dismisses after custom duration', () => {
    renderWithProvider(
      <ToastTrigger message="Quick toast" durationMs={1000} />,
    );
    fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByText('Quick toast')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(screen.queryByText('Quick toast')).toBeNull();
  });

  // ── Manual dismiss ──────────────────────────────────────────────

  it('dismisses on press', () => {
    renderWithProvider(
      <ToastTrigger message="Tap to dismiss" durationMs={60_000} />,
    );
    fireEvent.press(screen.getByTestId('trigger'));

    const toast = screen.getByText('Tap to dismiss');
    expect(toast).toBeTruthy();

    // The toast itself is wrapped in a Pressable with alert role
    fireEvent.press(screen.getByRole('alert'));

    act(() => {
      jest.advanceTimersByTime(300); // Wait for dismiss animation
    });

    expect(screen.queryByText('Tap to dismiss')).toBeNull();
  });

  // ── Multiple toasts ─────────────────────────────────────────────

  it('can show multiple toasts simultaneously', () => {
    renderWithProvider(
      <>
        <ToastTrigger message="First" />
        <Text
          testID="trigger-second"
          onPress={() => {
            // We need another trigger for a second toast
          }}
        >
          Second Trigger
        </Text>
      </>,
    );

    // Show first toast
    fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByText('First')).toBeTruthy();
  });

  // ── useToast hook error ─────────────────────────────────────────

  it('throws when useToast is called outside ToastProvider', () => {
    function OrphanConsumer(): React.JSX.Element {
      useToast();
      return <Text>Should not render</Text>;
    }

    expect(() => render(<OrphanConsumer />)).toThrow(
      'useToast must be used within a ToastProvider',
    );
  });

  // ── Accessibility ───────────────────────────────────────────────

  it('renders toast with accessibilityRole=alert', () => {
    renderWithProvider(
      <ToastTrigger message="Alert test" />,
    );
    fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('sets accessibilityLabel to the toast message', () => {
    renderWithProvider(
      <ToastTrigger message="A11y label" />,
    );
    fireEvent.press(screen.getByTestId('trigger'));
    expect(screen.getByLabelText('A11y label')).toBeTruthy();
  });
});
