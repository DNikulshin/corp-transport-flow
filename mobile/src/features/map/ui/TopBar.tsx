import React, { memo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { ChevronDown, ChevronUp } from 'lucide-react-native'
import { colors, radii, fontSize, spacing } from '@/shared/constants/theme'

interface TopBarProps {
  activeCount: number
  userName: string
  vehiclesOpen: boolean
  onVehiclesPress: () => void
  onProfilePress: () => void
}

function TopBarComponent({
  activeCount,
  userName,
  vehiclesOpen,
  onVehiclesPress,
  onProfilePress,
}: TopBarProps) {
  const initial = userName?.[0]?.toUpperCase() ?? 'U'

  return (
    <View style={styles.container}>
      {/* Кнопка счётчика активных ТС с дропдауном */}
      <TouchableOpacity onPress={onVehiclesPress} style={styles.counter} activeOpacity={0.8}>
        <View style={styles.counterDot} />
        <Text style={styles.counterText}>{activeCount} активных ТС</Text>
        {vehiclesOpen ? (
          <ChevronUp size={14} color={colors.textMuted} />
        ) : (
          <ChevronDown size={14} color={colors.textMuted} />
        )}
      </TouchableOpacity>

      {/* Кнопка профиля */}
      <TouchableOpacity onPress={onProfilePress} style={styles.profileBtn} activeOpacity={0.8}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.profileName} numberOfLines={1}>
          {userName}
        </Text>
        <ChevronDown size={14} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  )
}

export const TopBar = memo(TopBarComponent)

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing['2xl'],
    marginTop: Platform.OS === 'android' ? spacing.xl : spacing.xs,
    gap: spacing.md,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgSurfaceLight,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  counterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dotActive,
  },
  counterText: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    fontWeight: '500',
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgSurfaceLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    maxWidth: 160,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  profileName: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    flex: 1,
  },
})
