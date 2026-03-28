import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getStoredTokens } from '../api/client';
import { userApi, type User } from '../api/user';
import {
  authClient,
  type AuthTokens,
  exchangeCodeForTokens,
  logout as authLogout,
  refreshAccessToken,
} from './authClient';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<{ url: string; codeVerifier: string }>;
  handleCallback: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    name: string;
    phone: string;
  }) => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback((expiresIn: number) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    // Refresh 60 seconds before expiry
    const refreshMs = Math.max((expiresIn - 60) * 1000, 10_000);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const tokens = await refreshAccessToken();
        scheduleRefresh(tokens.expiresIn);
      } catch {
        setUser(null);
      }
    }, refreshMs);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const tokens = await getStoredTokens();
        if (tokens?.accessToken) {
          const profile = await userApi.getProfile();
          setUser(profile);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    void init();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const login = useCallback(async () => {
    return authClient.getAuthorizationUrl();
  }, []);

  const handleCallback = useCallback(
    async (code: string) => {
      setIsLoading(true);
      try {
        const tokens = await exchangeCodeForTokens(code);
        const profile = await userApi.getProfile();
        setUser(profile);
        scheduleRefresh(tokens.expiresIn);
      } finally {
        setIsLoading(false);
      }
    },
    [scheduleRefresh],
  );

  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; name: string; phone: string }) => {
      setIsLoading(true);
      try {
        const response = await userApi.register(input);
        setUser(response.user);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const refreshTokenFn = useCallback(async () => {
    const tokens = await refreshAccessToken();
    const profile = await userApi.getProfile();
    setUser(profile);
    scheduleRefresh(tokens.expiresIn);
  }, [scheduleRefresh]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      handleCallback,
      logout,
      register,
      refreshToken: refreshTokenFn,
    }),
    [user, isLoading, login, handleCallback, logout, register, refreshTokenFn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}