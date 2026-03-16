import React, { memo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useLocationStore } from '@/shared/stores/location-store'
import { colors, radii, fontSize, spacing } from '@/shared/constants/theme'

function OfflineBannerComponent() {
  const isOnline = useLocationStore((s) => s.isOnline)

  if (isOnline) return null

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Нет подключения к интернету</Text>
    </View>
  )
}

export const OfflineBanner = memo(OfflineBannerComponent)

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: spacing['2xl'],
    right: spacing['2xl'],
    backgroundColor: 'rgba(239,68,68,0.9)',
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    zIndex: 50,
  },
  text: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: '500',
  },
})
