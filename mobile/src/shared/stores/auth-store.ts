import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import type { User } from '@/domain/user-domain'

const KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  vehicleId: 'vehicleId',
  user: 'cachedUser',
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
        SecureStore.setItemAsync(KEYS.user, JSON.stringify(user)),
        user.vehicleId
          ? SecureStore.setItemAsync(KEYS.vehicleId, user.vehicleId)
          : Promise.resolve(),
      ])
      set({ user, accessToken, refreshToken, isAuthenticated: true })
    },

    logout: async () => {
      set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      await Promise.all([
        SecureStore.deleteItemAsync(KEYS.accessToken),
        SecureStore.deleteItemAsync(KEYS.refreshToken),
        SecureStore.deleteItemAsync(KEYS.vehicleId),
        SecureStore.deleteItemAsync(KEYS.user),
      ]).catch(() => {})
    },

    loadTokens: async () => {
      try {
        const [accessToken, refreshToken, userJson] = await Promise.all([
          SecureStore.getItemAsync(KEYS.accessToken),
          SecureStore.getItemAsync(KEYS.refreshToken),
          SecureStore.getItemAsync(KEYS.user),
        ])

        if (!accessToken || !refreshToken || !userJson) {
          set({ isLoading: false })
          return
        }

        const cachedUser: User = JSON.parse(userJson)

        // Немедленно восстанавливаем сессию из кеша — приложение открывается без задержки
        set({ user: cachedUser, accessToken, refreshToken, isAuthenticated: true, isLoading: false })

        // Фоновая проверка токена: обновляем user и обрабатываем только явный 401
        try {
          const { api } = await import('../api/http-client')
          const res = await api.get('/auth/me')
          set({ user: res.data })
        } catch (bgErr: unknown) {
          const status = (bgErr as { response?: { status?: number } })?.response?.status
          if (status === 401) {
            // Токен отозван — разлогиниваем
            await get().actions.logout()
          }
          // Сетевая ошибка — оставляем сессию активной
        }
      } catch {
        set({ isLoading: false })
      }
    },
  },
}))
