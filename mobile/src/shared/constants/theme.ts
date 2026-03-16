/**
 * Единая система дизайн-токенов приложения.
 *
 * ВСЕ цвета, отступы, радиусы и тени определяются здесь.
 * Импортируйте `theme` вместо хардкода значений в компонентах.
 */

export const palette = {
  // Основные
  sky400: '#38bdf8',
  sky500: '#0ea5e9',
  sky600: '#0284c7',

  // Успех / активность
  emerald400: '#34d399',
  emerald500: '#10b981',

  // Опасность / стоп
  red400: '#f87171',
  red500: '#ef4444',

  // Нейтральные (Slate)
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',
  slate950: '#020617',

  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const

export const colors = {
  // Фон
  bgPrimary: palette.slate950,
  bgSurface: 'rgba(15,23,42,0.97)',
  bgSurfaceLight: 'rgba(15,23,42,0.9)',
  bgCard: 'rgba(30,41,59,0.8)',
  bgInput: palette.slate800,

  // Границы
  borderDefault: 'rgba(51,65,85,0.5)',
  borderLight: 'rgba(51,65,85,0.6)',
  borderSubtle: 'rgba(148,163,184,0.2)',
  borderInput: palette.slate700,

  // Текст
  textPrimary: palette.white,
  textSecondary: palette.slate300,
  textMuted: palette.slate400,
  textDimmed: palette.slate500,
  textAccent: palette.sky400,
  textDanger: palette.red400,

  // Акцент
  accentPrimary: palette.sky500,
  accentPrimaryLight: palette.sky400,
  accentSuccess: palette.emerald500,
  accentSuccessLight: palette.emerald400,
  accentDanger: palette.red500,

  // Маркеры карты
  markerSelf: palette.sky500,
  markerSelfBorder: palette.sky400,
  markerActive: palette.emerald500,
  markerActiveBorder: palette.emerald400,
  markerInactive: palette.slate600,
  markerInactiveBorder: palette.slate500,

  // Кнопки
  btnShiftStart: palette.emerald500,
  btnShiftStop: palette.red500,
  btnFocusBg: 'rgba(14,165,233,0.1)',
  btnFocusBorder: 'rgba(14,165,233,0.3)',

  // Счётчик
  dotActive: palette.emerald400,
  dotShift: palette.white,
} as const

export const radii = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const

export const spacing = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 16,
  '3xl': 20,
} as const

export const fontSize = {
  xs: 10,
  sm: 11,
  md: 12,
  base: 13,
  lg: 14,
  xl: 15,
  '2xl': 16,
  '3xl': 18,
} as const

export const shadow = {
  sm: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  md: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  lg: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
} as const

const theme = { palette, colors, radii, spacing, fontSize, shadow } as const
export default theme
