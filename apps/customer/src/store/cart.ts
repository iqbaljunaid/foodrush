import { create } from 'zustand';

export interface CartItemModifier {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  menuItemId: string;
  restaurantId: string;
  name: string;
  price: number;
  quantity: number;
  size: string | null;
  extras: CartItemModifier[];
  imageUrl: string | null;
}

interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
}

interface CartActions {
  addItem: (item: CartItem) => void;
  removeItem: (menuItemId: string, size: string | null) => void;
  updateQuantity: (menuItemId: string, size: string | null, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
}

function itemKey(menuItemId: string, size: string | null): string {
  return `${menuItemId}::${size ?? 'default'}`;
}

export const useCartStore = create<CartState & CartActions>((set, get) => ({
  items: [],
  restaurantId: null,
  restaurantName: null,

  addItem: (item: CartItem) =>
    set((state) => {
      // If adding from a different restaurant, clear the cart first
      if (state.restaurantId && state.restaurantId !== item.restaurantId) {
        return {
          items: [item],
          restaurantId: item.restaurantId,
          restaurantName: null,
        };
      }

      const key = itemKey(item.menuItemId, item.size);
      const existing = state.items.findIndex(
        (i) => itemKey(i.menuItemId, i.size) === key,
      );

      if (existing >= 0) {
        const updated = [...state.items];
        const current = updated[existing];
        if (current) {
          updated[existing] = {
            ...current,
            quantity: current.quantity + item.quantity,
          };
        }
        return { items: updated, restaurantId: item.restaurantId };
      }

      return { items: [...state.items, item], restaurantId: item.restaurantId };
    }),

  removeItem: (menuItemId: string, size: string | null) =>
    set((state) => {
      const key = itemKey(menuItemId, size);
      const filtered = state.items.filter(
        (i) => itemKey(i.menuItemId, i.size) !== key,
      );
      return {
        items: filtered,
        restaurantId: filtered.length > 0 ? state.restaurantId : null,
        restaurantName: filtered.length > 0 ? state.restaurantName : null,
      };
    }),

  updateQuantity: (menuItemId: string, size: string | null, quantity: number) =>
    set((state) => {
      if (quantity <= 0) {
        const key = itemKey(menuItemId, size);
        const filtered = state.items.filter(
          (i) => itemKey(i.menuItemId, i.size) !== key,
        );
        return {
          items: filtered,
          restaurantId: filtered.length > 0 ? state.restaurantId : null,
          restaurantName: filtered.length > 0 ? state.restaurantName : null,
        };
      }

      const key = itemKey(menuItemId, size);
      return {
        items: state.items.map((i) =>
          itemKey(i.menuItemId, i.size) === key ? { ...i, quantity } : i,
        ),
      };
    }),

  clearCart: () =>
    set({ items: [], restaurantId: null, restaurantName: null }),

  getItemCount: () =>
    get().items.reduce((sum, i) => sum + i.quantity, 0),

  getSubtotal: () =>
    get().items.reduce(
      (sum, i) =>
        sum + (i.price + i.extras.reduce((e, x) => e + x.price, 0)) * i.quantity,
      0,
    ),
}));
