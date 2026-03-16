import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** Максимальное кол-во точек в оффлайн-очереди. Старые удаляются первыми. */
const MAX_QUEUE_SIZE = 500

export interface LocationPayload {
  vehicleId: string
  lat: number
  lng: number
  heading: number
  speed: number
  accuracy: number
  timestamp: number
}

interface LocationState {
  isOnline: boolean
  locationQueue: LocationPayload[]
  setOnlineStatus: (isOnline: boolean) => void
  addLocationToQueue: (location: LocationPayload) => void
  drainQueue: () => LocationPayload[]
  clearQueue: () => void
  queueSize: () => number
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      isOnline: true,
      locationQueue: [],

      setOnlineStatus: (isOnline) => set({ isOnline }),

      addLocationToQueue: (location) =>
        set((state) => {
          const queue = [...state.locationQueue, location]
          // Обрезаем очередь с начала, если превышен лимит
          if (queue.length > MAX_QUEUE_SIZE) {
            return { locationQueue: queue.slice(queue.length - MAX_QUEUE_SIZE) }
          }
          return { locationQueue: queue }
        }),

      /** Забрать все точки из очереди и очистить её (атомарная операция). */
      drainQueue: () => {
        const queue = get().locationQueue
        if (queue.length === 0) return []
        set({ locationQueue: [] })
        return queue
      },

      clearQueue: () => set({ locationQueue: [] }),

      queueSize: () => get().locationQueue.length,
    }),
    {
      name: 'location-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Не персистим isOnline — он вычисляется при старте
      partialize: (state) => ({ locationQueue: state.locationQueue }),
    },
  ),
)
