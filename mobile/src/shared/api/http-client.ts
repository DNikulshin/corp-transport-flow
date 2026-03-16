import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000'

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

/** Добавляем access token к каждому запросу. */
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

/**
 * Автоматический refresh при 401.
 * Если refresh тоже невалиден — чистим хранилище.
 */
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    original._retry = true

    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken')
      if (!refreshToken) throw new Error('No refresh token')

      // Используем чистый axios, чтобы не зациклить интерсептор
      const res = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken })
      const { accessToken: newAccessToken } = res.data

      await SecureStore.setItemAsync('accessToken', newAccessToken)
      original.headers.Authorization = `Bearer ${newAccessToken}`
      return api(original)
    } catch {
      // Refresh не прошёл — очищаем всё
      await Promise.all([
        SecureStore.deleteItemAsync('accessToken'),
        SecureStore.deleteItemAsync('refreshToken'),
        SecureStore.deleteItemAsync('vehicleId'),
      ]).catch(() => {})
      return Promise.reject(error)
    }
  },
)

export { BASE_URL }
