import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
  Switch,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Bus, Eye, EyeOff } from 'lucide-react-native'
import { useAuth } from '@/shared/hooks/use-auth'
import { useSettingsStore } from '@/shared/stores/settings-store'
import { colors, radii, fontSize, spacing, shadow, palette } from '@/shared/constants/theme'

export default function AuthScreen() {
  const { login } = useAuth()

  const useCustomServer = useSettingsStore((s) => s.useCustomServer)
  const customApiUrl = useSettingsStore((s) => s.customApiUrl)
  const setUseCustomServer = useSettingsStore((s) => s.setUseCustomServer)
  const setCustomApiUrl = useSettingsStore((s) => s.setCustomApiUrl)

  const [serverInput, setServerInput] = useState(customApiUrl)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [serverStatus, setServerStatus] = useState<'unknown' | 'checking' | 'online' | 'offline'>('unknown')
  const checkAbortRef = useRef<AbortController | null>(null)

  const canSubmit = username.trim().length > 0 && password.trim().length > 0

  const checkServer = useCallback(async (url?: string) => {
    checkAbortRef.current?.abort()
    checkAbortRef.current = new AbortController()
    const target = (url ?? customApiUrl).replace(/\/$/, '')
    setServerStatus('checking')
    try {
      const res = await fetch(`${target}/health`, { signal: AbortSignal.timeout(5000) })
      setServerStatus(res.ok ? 'online' : 'offline')
    } catch {
      setServerStatus('offline')
    }
  }, [customApiUrl])

  useEffect(() => {
    checkServer()
  }, [checkServer])

  const handleToggleServer = useCallback((value: boolean) => {
    setUseCustomServer(value)
    if (value) setServerInput(customApiUrl)
  }, [setUseCustomServer, customApiUrl])

  const handleServerBlur = useCallback(() => {
    const trimmed = serverInput.trim().replace(/\/$/, '')
    if (trimmed) {
      setCustomApiUrl(trimmed)
      checkServer(trimmed)
    }
  }, [serverInput, setCustomApiUrl, checkServer])

  const handleLogin = useCallback(async () => {
    if (!canSubmit) {
      Alert.alert('Ошибка', 'Введите логин и пароль')
      return
    }
    setIsLoading(true)
    try {
      await login(username.trim(), password)
    } catch {
      Alert.alert('Ошибка входа', 'Неверный логин или пароль')
    } finally {
      setIsLoading(false)
    }
  }, [canSubmit, login, username, password])

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Логотип */}
          <View style={styles.logoSection}>
            <View style={styles.logoIcon}>
              <Bus size={28} color={palette.white} strokeWidth={2} />
            </View>
            <Text style={styles.title}>КорпТранспорт</Text>
            <Text style={styles.subtitle}>Войдите для доступа к системе</Text>
          </View>

          {/* Форма */}
          <View style={styles.form}>
            {/* Логин */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>ЛОГИН</Text>
              <TextInput
                style={styles.input}
                placeholder="Введите логин"
                placeholderTextColor={colors.textDimmed}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                editable={!isLoading}
              />
            </View>

            {/* Пароль */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>ПАРОЛЬ</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Введите пароль"
                  placeholderTextColor={colors.textDimmed}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {showPassword
                    ? <EyeOff size={18} color={colors.textMuted} />
                    : <Eye size={18} color={colors.textMuted} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Кнопка входа */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading || !canSubmit}
              style={[styles.submitBtn, { opacity: isLoading || !canSubmit ? 0.5 : 1 }]}
              activeOpacity={0.8}
            >
              {isLoading
                ? <ActivityIndicator color={palette.white} />
                : <Text style={styles.submitText}>Войти</Text>}
            </TouchableOpacity>

            {/* Переключатель сервера */}
            <View style={styles.serverSection}>
              <View style={styles.serverToggleRow}>
                {/* Индикатор доступности — тап = проверить */}
                <TouchableOpacity onPress={() => checkServer()} hitSlop={8} style={styles.statusDotBtn}>
                  {serverStatus === 'checking'
                    ? <ActivityIndicator size={12} color={colors.textMuted} />
                    : (
                      <View style={[
                        styles.statusDot,
                        serverStatus === 'online' && styles.statusOnline,
                        serverStatus === 'offline' && styles.statusOffline,
                      ]} />
                    )}
                </TouchableOpacity>

                <Text style={styles.serverToggleLabel}>Сервер</Text>

                {!useCustomServer && (
                  <Text style={styles.serverHostname} numberOfLines={1} ellipsizeMode="middle">
                    {(() => { try { return new URL(customApiUrl).hostname } catch { return customApiUrl } })()}
                  </Text>
                )}

                <View style={styles.serverToggleSpacer} />

                <Switch
                  value={useCustomServer}
                  onValueChange={handleToggleServer}
                  trackColor={{ false: colors.borderInput, true: colors.accentPrimary }}
                  thumbColor={palette.white}
                />
              </View>

              {useCustomServer && (
                <View style={styles.serverInputGroup}>
                  <TextInput
                    style={styles.input}
                    placeholder="http://1.2.3.4:4000"
                    placeholderTextColor={colors.textDimmed}
                    value={serverInput}
                    onChangeText={setServerInput}
                    onBlur={handleServerBlur}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    editable={!isLoading}
                  />
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  // Логотип
  logoSection: {
    marginBottom: 40,
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
    ...shadow.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
    marginTop: spacing.xs,
  },

  // Форма
  form: {
    gap: spacing['2xl'],
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    fontWeight: '600',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radii.md,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: fontSize.lg,
  },
  passwordWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 14,
    padding: 2,
  },

  // Кнопка входа
  submitBtn: {
    backgroundColor: colors.accentPrimary,
    borderRadius: radii.md,
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    marginTop: spacing.md,
    ...shadow.md,
  },
  submitText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: fontSize['2xl'],
  },

  // Блок сервера
  serverSection: {
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    paddingTop: spacing['2xl'],
    gap: spacing['2xl'],
  },
  serverToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  statusDotBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.textDimmed,
  },
  statusOnline: {
    backgroundColor: colors.accentSuccess,
  },
  statusOffline: {
    backgroundColor: colors.accentDanger,
  },
  serverToggleLabel: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
    marginRight: spacing.md,
  },
  serverHostname: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  serverToggleSpacer: {
    flex: 1,
  },
  serverInputGroup: {
    gap: spacing.md,
  },
})
