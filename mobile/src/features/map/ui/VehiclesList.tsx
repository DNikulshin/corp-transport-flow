import React, { memo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { Bus, Navigation } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Vehicle } from '@/shared/stores/vehicles-store'
import { colors, radii, fontSize, spacing } from '@/shared/constants/theme'

interface VehiclesListProps {
  vehicles: Vehicle[]
  visible: boolean
  onClose: () => void
  onSelect: (vehicleId: string) => void
}

function VehiclesListComponent({ vehicles, visible, onClose, onSelect }: VehiclesListProps) {
  const insets = useSafeAreaInsets()

  if (!visible) return null

  const activeVehicles = vehicles.filter((v) => v.isActive)

  return (
    <>
      {/* Закрытие по тапу вне списка */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View style={[styles.list, { top: insets.top + 56 }]}>
        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {activeVehicles.length === 0 ? (
            <Text style={styles.empty}>Нет активных ТС</Text>
          ) : (
            activeVehicles.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                style={styles.item}
                onPress={() => {
                  onSelect(vehicle.id)
                  onClose()
                }}
                activeOpacity={0.7}
              >
                <Bus size={14} color={colors.accentSuccessLight} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{vehicle.name}</Text>
                  <Text style={styles.itemSub}>
                    {vehicle.plateNumber}
                    {vehicle.driverName ? `  ·  ${vehicle.driverName}` : ''}
                  </Text>
                </View>
                <Navigation size={12} color={colors.textMuted} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </>
  )
}

export const VehiclesList = memo(VehiclesListComponent)

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
  },
  list: {
    position: 'absolute',
    left: spacing['2xl'],
    right: spacing['2xl'],
    maxHeight: 280,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    zIndex: 100,
  },
  empty: {
    color: colors.textDimmed,
    fontSize: fontSize.base,
    textAlign: 'center',
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing['2xl'],
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: '500',
  },
  itemSub: {
    color: colors.textDimmed,
    fontSize: fontSize.md,
    marginTop: 2,
  },
})
