import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { tokens } from '../tokens';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps): React.JSX.Element {
  const { colors } = useTheme();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const animRefs = useRef<Map<string, Animated.Value>>(new Map());

  const dismiss = useCallback((id: string) => {
    const anim = animRefs.current.get(id);
    if (anim) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        animRefs.current.delete(id);
        const timer = timerRefs.current.get(id);
        if (timer) {
          clearTimeout(timer);
          timerRefs.current.delete(id);
        }
      });
    } else {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'info', durationMs = 3000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const anim = new Animated.Value(0);
      animRefs.current.set(id, anim);

      setToasts((prev) => [...prev, { id, message, variant }]);

      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      const timer = setTimeout(() => dismiss(id), durationMs);
      timerRefs.current.set(id, timer);
    },
    [dismiss],
  );

  const getVariantColor = (variant: ToastVariant): string => {
    switch (variant) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.danger;
      case 'info':
        return colors.primary;
    }
  };

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => {
          const anim = animRefs.current.get(toast.id);
          const translateY = anim
            ? anim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] })
            : 0;
          const opacity = anim ?? 1;

          const toastStyle: ViewStyle = {
            backgroundColor: colors.surface,
            borderLeftColor: getVariantColor(toast.variant),
            borderLeftWidth: 4,
            ...tokens.shadow.card,
          };

          return (
            <Animated.View
              key={toast.id}
              style={[
                styles.toast,
                toastStyle,
                { transform: [{ translateY }], opacity },
              ]}
            >
              <Pressable
                accessibilityRole="alert"
                accessibilityLabel={toast.message}
                onPress={() => dismiss(toast.id)}
                style={styles.toastContent}
              >
                <Text style={[styles.toastText, { color: colors.text }]}>
                  {toast.message}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60,
    left: tokens.spacing.md,
    right: tokens.spacing.md,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    borderRadius: tokens.radius.md,
    marginBottom: tokens.spacing.sm,
    width: '100%',
  },
  toastContent: {
    padding: tokens.spacing.md,
  },
  toastText: {
    fontSize: 14,
    fontFamily: tokens.font.body.family,
  },
});