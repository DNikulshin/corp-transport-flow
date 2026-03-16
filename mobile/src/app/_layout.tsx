import { Stack, useRouter, useSegments } from 'expo-router'
import React, { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import NetInfo from '@react-native-community/netinfo'
import { useLocationStore } from '../shared/stores/location-store'
import { useAuth } from '../shared/hooks/use-auth'
import { ErrorBoundary } from '../shared/ui/ErrorBoundary'
import { colors } from '../shared/constants/theme'
import './global.css'

// Не прятать splash-screen до полной загрузки
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const setOnlineStatus = useLocationStore((s) => s.setOnlineStatus)
  const { isAuthenticated, isLoading, loadTokens } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  // Загрузить токены при старте
  useEffect(() => {
    loadTokens()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Скрыть splash когда загрузка завершена
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync()
    }
  }, [isLoading])

  // Редирект на auth если не авторизован
  useEffect(() => {
    if (isLoading) return
    const inAuthGroup = segments[0] === 'auth'

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth')
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/')
    }
  }, [isAuthenticated, isLoading, segments, router])

  // Слушать статус сети
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const hasInternet = (state.isConnected && state.isInternetReachable) ?? false
      setOnlineStatus(hasInternet)
    })
    return () => unsubscribe()
  }, [setOnlineStatus])

  // Показываем loading screen пока грузятся токены
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accentPrimary} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }} />
      </ErrorBoundary>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
