import { create } from 'zustand';
import type { OrderStatus } from '@foodrush/shared/api';

export interface CourierLocation {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
}

interface ActiveOrderState {
  orderId: string | null;
  status: OrderStatus | null;
  courierLocation: CourierLocation | null;
  eta: number | null;
  courierName: string | null;
  courierPhone: string | null;
}

interface ActiveOrderActions {
  setOrder: (orderId: string, status: OrderStatus) => void;
  updateStatus: (status: OrderStatus) => void;
  updateCourierLocation: (location: CourierLocation) => void;
  updateEta: (eta: number) => void;
  setCourier: (name: string, phone: string) => void;
  clearActiveOrder: () => void;
}

const initialState: ActiveOrderState = {
  orderId: null,
  status: null,
  courierLocation: null,
  eta: null,
  courierName: null,
  courierPhone: null,
};

export const useActiveOrderStore = create<ActiveOrderState & ActiveOrderActions>(
  (set) => ({
    ...initialState,

    setOrder: (orderId: string, status: OrderStatus) =>
      set({ orderId, status }),

    updateStatus: (status: OrderStatus) =>
      set({ status }),

    updateCourierLocation: (location: CourierLocation) =>
      set({ courierLocation: location }),

    updateEta: (eta: number) =>
      set({ eta }),

    setCourier: (name: string, phone: string) =>
      set({ courierName: name, courierPhone: phone }),

    clearActiveOrder: () =>
      set(initialState),
  }),
);
