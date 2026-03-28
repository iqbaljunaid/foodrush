import { create } from 'zustand';

interface DriverState {
  isOnline: boolean;
  activeDeliveryId: string | null;
  courierId: string | null;
  todayEarnings: number;
  tripCount: number;
  onlineHours: number;
}

interface DriverActions {
  toggleOnline: () => void;
  setActiveDelivery: (deliveryId: string) => void;
  clearActiveDelivery: () => void;
  setCourierId: (id: string) => void;
  updateEarnings: (amount: number) => void;
  incrementTripCount: () => void;
  setOnlineHours: (hours: number) => void;
  resetDailyStats: () => void;
}

export const useDriverStore = create<DriverState & DriverActions>((set) => ({
  isOnline: false,
  activeDeliveryId: null,
  courierId: null,
  todayEarnings: 0,
  tripCount: 0,
  onlineHours: 0,

  toggleOnline: () =>
    set((state) => ({ isOnline: !state.isOnline })),

  setActiveDelivery: (deliveryId: string) =>
    set({ activeDeliveryId: deliveryId }),

  clearActiveDelivery: () =>
    set({ activeDeliveryId: null }),

  setCourierId: (id: string) =>
    set({ courierId: id }),

  updateEarnings: (amount: number) =>
    set((state) => ({ todayEarnings: state.todayEarnings + amount })),

  incrementTripCount: () =>
    set((state) => ({ tripCount: state.tripCount + 1 })),

  setOnlineHours: (hours: number) =>
    set({ onlineHours: hours }),

  resetDailyStats: () =>
    set({ todayEarnings: 0, tripCount: 0, onlineHours: 0 }),
}));