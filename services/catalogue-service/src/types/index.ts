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

export interface CreateCatalogueInput {
  restaurantId: string;
  name: string;
  description: string;
  category: string;
}

export interface UpdateCatalogueInput {
  name?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
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

export interface CreateMenuItemInput {
  catalogueId: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  dietaryTags?: string[];
  preparationTimeMinutes: number;
}

export interface UpdateMenuItemInput {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: string;
  dietaryTags?: string[];
  isAvailable?: boolean;
  preparationTimeMinutes?: number;
}

export interface ImageUploadResult {
  objectName: string;
  url: string;
  contentType: string;
  size: number;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}
