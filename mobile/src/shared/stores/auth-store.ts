import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import type { User } from '@/domain/user-domain'

const KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  vehicleId: 'vehicleId',
} as const

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  actions: {
    setAuth: (user: User, accessToken: string, refreshToken: string) => Promise<void>
    logout: () => Promise<void>
    loadTokens: () => Promise<void>
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  actions: {
    setAuth: async (user, accessToken, refreshToken) => {
      await Promise.all([
        SecureStore.setItemAsync(KEYS.accessToken, accessToken),
        SecureStore.setItemAsync(KEYS.refreshToken, refreshToken),
        user.vehicleId
          ? SecureStore.setItemAsync(KEYS.vehicleId, user.vehicleId)
          : Promise.resolve(),
      ])
      set({ user, accessToken, refreshToken, isAuthenticated: true })
    },

    logout: async () => {
      // Сначала сбрасываем стейт, потом чистим хранилище —
      // так UI мгновенно реагирует, не дожидаясь I/O.
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      })
      await Promise.all([
        SecureStore.deleteItemAsync(KEYS.accessToken),
        SecureStore.deleteItemAsync(KEYS.refreshToken),
        SecureStore.deleteItemAsync(KEYS.vehicleId),
      ]).catch(() => {})
    },

    loadTokens: async () => {
      try {
        const [accessToken, refreshToken] = await Promise.all([
          SecureStore.getItemAsync(KEYS.accessToken),
          SecureStore.getItemAsync(KEYS.refreshToken),
        ])

        if (!accessToken || !refreshToken) {
          set({ isLoading: false })
          return
        }

        // Проверяем валидность токена, загружая профиль
        const { api } = await import('../api/http-client')
        const res = await api.get('/auth/me')

        set({
          user: res.data,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        })
      } catch {
        // Токены невалидны — чистим
        await get().actions.logout()
        set({ isLoading: false })
      }
    },
  },
}))
