import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000'

interface SettingsState {
  useCustomServer: boolean
  customApiUrl: string
  setCustomApiUrl: (url: string) => void
  setUseCustomServer: (value: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      useCustomServer: false,
      customApiUrl: DEFAULT_API_URL,
      setCustomApiUrl: (url) => set({ customApiUrl: url.replace(/\/$/, '') }),
      setUseCustomServer: (value) => set({ useCustomServer: value }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)

/** Читает текущий API URL вне React-контекста (для интерсепторов, фоновых задач). */
export const getApiUrl = () => {
  const { useCustomServer, customApiUrl } = useSettingsStore.getState()
  return useCustomServer ? customApiUrl : DEFAULT_API_URL
}
