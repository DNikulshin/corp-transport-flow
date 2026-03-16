import { create } from "zustand";

export interface VehiclePosition {
  vehicleId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface Vehicle {
  id: string;
  name: string;
  plateNumber: string;
  driverId?: string;
  driverName?: string;
  isActive: boolean;
  position?: VehiclePosition;
}

interface VehiclesState {
  /** Map для быстрого поиска по id */
  _map: Map<string, Vehicle>;
  /**
   * Кешированный массив — обновляется ТОЛЬКО при мутации _map.
   * Селекторы читают отсюда → стабильная ссылка между рендерами.
   *
   * React 19 + Zustand v5: если selector возвращает новый объект
   * при каждом вызове (как Array.from()), useSyncExternalStore
   * уходит в бесконечный цикл. Поэтому массив — часть стейта.
   */
  vehiclesList: Vehicle[];

  setVehicles: (vehicles: Vehicle[]) => void;
  updatePosition: (pos: VehiclePosition) => void;
  setVehicleOffline: (vehicleId: string) => void;
  setVehicleOnline: (vehicleId: string) => void;
  getById: (id: string) => Vehicle | undefined;
}

export const useVehiclesStore = create<VehiclesState>((set, get) => ({
  _map: new Map(),
  vehiclesList: [],

  setVehicles: (vehicles) => {
    const map = new Map(vehicles.map((v) => [v.id, v]));
    set({ _map: map, vehiclesList: vehicles });
  },

  updatePosition: (pos) => {
    set((state) => {
      const existing = state._map.get(pos.vehicleId);
      if (!existing) return state;

      const updated = { ...existing, position: pos, isActive: true };
      const map = new Map(state._map);
      map.set(pos.vehicleId, updated);

      return {
        _map: map,
        vehiclesList: Array.from(map.values()),
      };
    });
  },

  setVehicleOffline: (vehicleId) => {
    set((state) => {
      const existing = state._map.get(vehicleId);
      if (!existing) return state;

      const updated = { ...existing, isActive: false };
      const map = new Map(state._map);
      map.set(vehicleId, updated);

      return {
        _map: map,
        vehiclesList: Array.from(map.values()),
      };
    });
  },

  setVehicleOnline: (vehicleId) => {
    set((state) => {
      const existing = state._map.get(vehicleId);
      if (!existing) return state;

      const updated = { ...existing, isActive: true };
      const map = new Map(state._map);
      map.set(vehicleId, updated);

      return {
        _map: map,
        vehiclesList: Array.from(map.values()),
      };
    });
  },

  getById: (id) => get()._map.get(id),
}));
