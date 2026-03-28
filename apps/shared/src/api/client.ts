import axios, {
  type AxiosInstance,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import * as Keychain from 'react-native-keychain';

const TOKEN_SERVICE = 'foodrush_auth_tokens';

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

async function getStoredTokens(): Promise<StoredTokens | null> {
  const credentials = await Keychain.getGenericPassword({ service: TOKEN_SERVICE });
  if (!credentials) return null;
  return JSON.parse(credentials.password) as StoredTokens;
}

async function storeTokens(tokens: StoredTokens): Promise<void> {
  await Keychain.setGenericPassword('tokens', JSON.stringify(tokens), {
    service: TOKEN_SERVICE,
  });
}

async function clearTokens(): Promise<void> {
  await Keychain.resetGenericPassword({ service: TOKEN_SERVICE });
}

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void): void {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const tokens = await getStoredTokens();
  if (tokens?.accessToken) {
    config.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const retryFlag = '_retry' as keyof typeof originalRequest;
    if ((originalRequest as Record<string, unknown>)[retryFlag]) {
      await clearTokens();
      return Promise.reject(error);
    }
    (originalRequest as Record<string, unknown>)[retryFlag] = true;

    if (isRefreshing) {
      return new Promise<ReturnType<typeof apiClient.request>>((resolve) => {
        subscribeTokenRefresh((token: string) => {
          originalRequest.headers.set('Authorization', `Bearer ${token}`);
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;
    const tokens = await getStoredTokens();

    if (!tokens?.refreshToken) {
      isRefreshing = false;
      await clearTokens();
      return Promise.reject(error);
    }

    try {
      const refreshUrl = `${process.env.EXPO_PUBLIC_IDCS_BASE_URL ?? ''}/oauth2/v1/token`;
      const response = await axios.post<{ access_token: string; refresh_token: string }>(
        refreshUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: tokens.refreshToken,
          client_id: process.env.EXPO_PUBLIC_IDCS_CLIENT_ID ?? '',
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      const newTokens: StoredTokens = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
      };
      await storeTokens(newTokens);
      onTokenRefreshed(newTokens.accessToken);

      originalRequest.headers.set('Authorization', `Bearer ${newTokens.accessToken}`);
      return apiClient(originalRequest);
    } catch {
      await clearTokens();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

export { apiClient, getStoredTokens, storeTokens, clearTokens };
export type { StoredTokens };