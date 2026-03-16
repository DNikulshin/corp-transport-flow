import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { AlertTriangle, RotateCcw } from 'lucide-react-native'
import { colors, radii, fontSize, spacing, shadow, palette } from '@/shared/constants/theme'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Ловит ошибки рендера дочерних компонентов.
 * Показывает fallback-экран с возможностью перезапуска.
 *
 * Использование:
 * ```tsx
 * <ErrorBoundary>
 *   <Stack screenOptions={{ headerShown: false }} />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // В продакшене здесь можно отправить ошибку в Sentry/Crashlytics
    console.error('[ErrorBoundary]', error, errorInfo.componentStack)
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.iconWrapper}>
            <AlertTriangle size={32} color={palette.red400} />
          </View>

          <Text style={styles.title}>Что-то пошло не так</Text>
          <Text style={styles.message}>
            Произошла непредвиденная ошибка. Попробуйте перезапустить экран.
          </Text>

          {__DEV__ && this.state.error && (
            <View style={styles.debugBox}>
              <Text style={styles.debugText} numberOfLines={5}>
                {this.state.error.message}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.restartBtn}
            onPress={this.handleRestart}
            activeOpacity={0.8}
          >
            <RotateCcw size={16} color={palette.white} />
            <Text style={styles.restartText}>Перезапустить</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  debugBox: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.xl,
    width: '100%',
    marginBottom: 24,
  },
  debugText: {
    color: colors.textDanger,
    fontSize: fontSize.md,
    fontFamily: 'monospace',
  },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.accentPrimary,
    borderRadius: radii.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: 24,
    width: '100%',
    ...shadow.md,
  },
  restartText: {
    color: palette.white,
    fontSize: fontSize['2xl'],
    fontWeight: '600',
  },
})
