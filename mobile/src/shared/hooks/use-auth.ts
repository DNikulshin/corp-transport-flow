import { useCallback } from 'react'
import { useShallow } from 'zustand/shallow'
import { useAuthStore } from '../stores/auth-store'
import { api } from '../api'

export const useAuth = () => {
  const { user, accessToken, isAuthenticated, isLoading, actions } = useAuthStore(
    useShallow((s) => ({
      user: s.user,
      accessToken: s.accessToken,
      isAuthenticated: s.isAuthenticated,
      isLoading: s.isLoading,
      actions: s.actions,
    })),
  )

  const login = useCallback(
    async (username: string, password: string) => {
      const response = await api.post('/auth/login', { username, password })
      const { user: userData, tokens } = response.data
      await actions.setAuth(userData, tokens.accessToken, tokens.refreshToken)
      return userData
    },
    [actions],
  )

  const logout = useCallback(async () => {
    try {
      const rt = useAuthStore.getState().refreshToken
      if (rt) {
        await api.post('/auth/logout', { refreshToken: rt }).catch(() => {})
      }
    } finally {
      await actions.logout()
    }
  }, [actions])

  return {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    login,
    logout,
    loadTokens: actions.loadTokens,
  }
}
