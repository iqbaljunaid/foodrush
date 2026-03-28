import { apiClient } from '../client';

export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  avatarUrl: string | null;
  dietaryPreferences: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  phone?: string;
  dietaryPreferences?: string[];
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddAddressInput {
  label: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

export const userApi = {
  login: (input: LoginInput) =>
    apiClient.post<AuthResponse>('/user/auth/login', input).then((r) => r.data),

  register: (input: RegisterInput) =>
    apiClient.post<AuthResponse>('/user/auth/register', input).then((r) => r.data),

  getProfile: () =>
    apiClient.get<User>('/user/profile').then((r) => r.data),

  updateProfile: (input: UpdateProfileInput) =>
    apiClient.put<User>('/user/profile', input).then((r) => r.data),

  getAddresses: () =>
    apiClient.get<Address[]>('/user/addresses').then((r) => r.data),

  addAddress: (input: AddAddressInput) =>
    apiClient.post<Address>('/user/addresses', input).then((r) => r.data),

  deleteAddress: (id: string) =>
    apiClient.delete<void>(`/user/addresses/${encodeURIComponent(id)}`).then((r) => r.data),
};