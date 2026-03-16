import React, { memo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { X, Crosshair } from 'lucide-react-native'
import type { Vehicle } from '@/shared/stores/vehicles-store'
import { colors, radii, fontSize, shadow, spacing } from '@/shared/constants/theme'

interface VehiclePopupProps {
  vehicle: Vehicle
  onClose: () => void
  onFocus: (lat: number, lng: number) => void
}

function StatCell({
  label,
  value,
  color = colors.textSecondary,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  )
}

function VehiclePopupComponent({ vehicle, onClose, onFocus }: VehiclePopupProps) {
  return (
    <View style={styles.container}>
      {/* Заголовок */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{vehicle.name}</Text>
          <Text style={styles.plate}>{vehicle.plateNumber}</Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <X size={16} color={colors.textDimmed} />
        </TouchableOpacity>
      </View>

      {/* Статистика */}
      <View style={styles.stats}>
        <StatCell
          label="Статус"
          value={vehicle.isActive ? 'В рейсе' : 'Неактивен'}
          color={vehicle.isActive ? colors.accentSuccessLight : colors.textMuted}
        />
        {vehicle.position?.speed != null && (
          <StatCell
            label="Скорость"
            value={`${vehicle.position.speed} км/ч`}
          />
        )}
        {vehicle.driverName && (
          <StatCell label="Водитель" value={vehicle.driverName} />
        )}
      </View>

      {/* Кнопка фокуса */}
      {vehicle.position && (
        <TouchableOpacity
          style={styles.focusBtn}
          onPress={() => onFocus(vehicle.position!.lat, vehicle.position!.lng)}
        >
          <Crosshair size={14} color={colors.textAccent} />
          <Text style={styles.focusText}>Центрировать</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export const VehiclePopup = memo(VehiclePopupComponent)

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: spacing['2xl'],
    right: spacing['2xl'],
    backgroundColor: colors.bgSurface,
    borderRadius: radii.xl,
    padding: spacing['2xl'],
    borderWidth: 1,
    borderColor: colors.borderLight,
    zIndex: 20,
    ...shadow.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  headerInfo: { flex: 1 },
  name: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: fontSize.xl,
  },
  plate: {
    color: colors.textDimmed,
    fontSize: fontSize.md,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  closeBtn: { padding: spacing.xs },
  stats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCell: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statLabel: {
    color: colors.textDimmed,
    fontSize: fontSize.sm,
    marginBottom: 2,
  },
  statValue: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  focusBtn: {
    flexDirection: 'row',
    backgroundColor: colors.btnFocusBg,
    borderWidth: 1,
    borderColor: colors.btnFocusBorder,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  focusText: {
    color: colors.textAccent,
    fontSize: fontSize.base,
    fontWeight: '500',
  },
})
