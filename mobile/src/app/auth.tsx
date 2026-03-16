import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native'
import { Bus, Eye, EyeOff } from 'lucide-react-native'
import { useAuth } from '@/shared/hooks/use-auth'
import { colors, radii, fontSize, spacing, shadow, palette } from '@/shared/constants/theme'

export default function AuthScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const canSubmit = username.trim().length > 0 && password.trim().length > 0

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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bgPrimary} />

      <View style={styles.content}>
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
                {showPassword ? (
                  <EyeOff size={18} color={colors.textMuted} />
                ) : (
                  <Eye size={18} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Кнопка входа */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={isLoading || !canSubmit}
            style={[
              styles.submitBtn,
              { opacity: isLoading || !canSubmit ? 0.5 : 1 },
            ]}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <Text style={styles.submitText}>Войти</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
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

  // Кнопка
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
})
