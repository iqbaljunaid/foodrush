import axios from 'axios';
import * as Keychain from 'react-native-keychain';
import { storeTokens, clearTokens, getStoredTokens } from '../api/client';

const IDCS_BASE_URL = process.env.EXPO_PUBLIC_IDCS_BASE_URL ?? '';
const IDCS_CLIENT_ID = process.env.EXPO_PUBLIC_IDCS_CLIENT_ID ?? '';
const REDIRECT_URI = process.env.EXPO_PUBLIC_REDIRECT_URI ?? 'foodrush://auth/callback';
const VERIFIER_SERVICE = 'foodrush_pkce_verifier';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

function generateRandomBytes(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = new Uint8Array(length);
  // Use Math.random as fallback for environments without crypto
  for (let i = 0; i < length; i++) {
    values[i] = Math.floor(Math.random() * 256);
  }
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[values[i]! % chars.length];
  }
  return result;
}

function base64UrlEncode(str: string): string {
  // Simple base64url encoding for the challenge
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  let binary = '';
  for (let i = 0; i < hashArray.length; i++) {
    binary += String.fromCharCode(hashArray[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateCodeVerifier(): string {
  return generateRandomBytes(64);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  return sha256(verifier);
}

export async function getAuthorizationUrl(): Promise<{
  url: string;
  codeVerifier: string;
}> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Persist verifier for the callback
  await Keychain.setGenericPassword('pkce', codeVerifier, {
    service: VERIFIER_SERVICE,
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: IDCS_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile email',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: generateRandomBytes(16),
  });

  return {
    url: `${IDCS_BASE_URL}/oauth2/v1/authorize?${params.toString()}`,
    codeVerifier,
  };
}

export async function exchangeCodeForTokens(code: string): Promise<AuthTokens> {
  const credentials = await Keychain.getGenericPassword({ service: VERIFIER_SERVICE });
  if (!credentials) {
    throw new Error('No PKCE code verifier found');
  }
  const codeVerifier = credentials.password;

  const response = await axios.post<TokenResponse>(
    `${IDCS_BASE_URL}/oauth2/v1/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: IDCS_CLIENT_ID,
      code_verifier: codeVerifier,
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );

  const tokens: AuthTokens = {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    idToken: response.data.id_token,
    expiresIn: response.data.expires_in,
  };

  await storeTokens({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });

  // Clean up verifier
  await Keychain.resetGenericPassword({ service: VERIFIER_SERVICE });

  return tokens;
}

export async function refreshAccessToken(): Promise<AuthTokens> {
  const stored = await getStoredTokens();
  if (!stored?.refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await axios.post<TokenResponse>(
    `${IDCS_BASE_URL}/oauth2/v1/token`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: stored.refreshToken,
      client_id: IDCS_CLIENT_ID,
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );

  const tokens: AuthTokens = {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    idToken: response.data.id_token,
    expiresIn: response.data.expires_in,
  };

  await storeTokens({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });

  return tokens;
}

export async function logout(): Promise<void> {
  await clearTokens();
  await Keychain.resetGenericPassword({ service: VERIFIER_SERVICE });
}

export const authClient = {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  logout,
  generateCodeVerifier,
  generateCodeChallenge,
};