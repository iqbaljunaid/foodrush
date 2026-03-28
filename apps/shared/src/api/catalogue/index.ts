import { apiClient } from '../client';

export interface Catalogue {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuItem {
  id: string;
  catalogueId: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  dietaryTags: string[];
  isAvailable: boolean;
  preparationTimeMinutes: number;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListCataloguesParams {
  restaurantId: string;
  limit?: number;
  offset?: number;
}

export interface ListMenuItemsParams {
  catalogueId?: string;
  restaurantId?: string;
  category?: string;
  available?: 'true' | 'false';
  limit?: number;
  offset?: number;
}

export interface SearchMenusParams {
  q: string;
  restaurantId?: string;
  limit?: number;
  offset?: number;
}

export const catalogueApi = {
  getCatalogues: (params: ListCataloguesParams) =>
    apiClient.get<Catalogue[]>('/catalogues', { params }).then((r) => r.data),

  getCatalogue: (id: string) =>
    apiClient.get<Catalogue>(`/catalogues/${encodeURIComponent(id)}`).then((r) => r.data),

  getMenus: (params: ListMenuItemsParams) =>
    apiClient.get<MenuItem[]>('/menus', { params }).then((r) => r.data),

  getMenuItem: (id: string) =>
    apiClient.get<MenuItem>(`/menus/${encodeURIComponent(id)}`).then((r) => r.data),

  searchMenus: (params: SearchMenusParams) =>
    apiClient.get<MenuItem[]>('/menus', { params }).then((r) => r.data),
};