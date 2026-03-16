import React, { memo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Play, Square } from 'lucide-react-native'
import { colors, radii, fontSize, spacing, shadow, palette } from '@/shared/constants/theme'

interface ShiftButtonProps {
  isActive: boolean
  onToggle: () => void
}

function ShiftButtonComponent({ isActive, onToggle }: ShiftButtonProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onToggle}
        style={[
          styles.button,
          {
            backgroundColor: isActive ? colors.btnShiftStop : colors.btnShiftStart,
          },
        ]}
        activeOpacity={0.8}
      >
        {isActive ? (
          <Square size={16} color={palette.white} fill={palette.white} />
        ) : (
          <Play size={16} color={palette.white} fill={palette.white} />
        )}
        <Text style={styles.text}>
          {isActive ? 'Завершить смену' : 'Начать смену'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

export const ShiftButton = memo(ShiftButtonComponent)

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: spacing['3xl'],
    right: spacing['3xl'],
    zIndex: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing['2xl'],
    borderRadius: radii.lg,
    ...shadow.md,
  },
  text: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: fontSize['2xl'],
  },
})
