import React, { memo, useRef, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Marker } from 'react-native-maps'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { captureRef } from 'react-native-view-shot'
import type { Vehicle } from '@/shared/stores/vehicles-store'
import { colors, fontSize, palette } from '@/shared/constants/theme'

// ---------------------------------------------------------------------------
// Цвета маркера по статусу
// ---------------------------------------------------------------------------
function getMarkerColors(isOwn: boolean, isActive: boolean) {
  // Неактивная машина всегда серая — включая свою, когда смена не начата
  if (!isActive) {
    return { bg: colors.markerInactive, border: colors.markerInactiveBorder, plate: colors.textMuted }
  }
  if (isOwn) {
    return { bg: colors.markerSelf, border: colors.markerSelfBorder, plate: colors.textAccent }
  }
  return { bg: colors.markerActive, border: colors.markerActiveBorder, plate: colors.textSecondary }
}

// ---------------------------------------------------------------------------
// MarkerDesignCapture
//
// Рендерится ВНЕ MapView (в скрытом контейнере MapScreen).
// Захватывает себя как PNG через captureRef и отдаёт URI наверх.
// Здесь работают все стили — borderRadius, тени и т.д.
// ---------------------------------------------------------------------------
interface MarkerDesignCaptureProps {
  vehicle: Vehicle
  isOwn: boolean
  onCapture: (uri: string) => void
}

export function MarkerDesignCapture({
  vehicle,
  isOwn,
  onCapture,
}: MarkerDesignCaptureProps) {
  const ref = useRef<View>(null)
  const { bg, border, plate } = getMarkerColors(isOwn, vehicle.isActive)

  useEffect(() => {
    // Даём нативному слою один кадр на layout, затем делаем снимок
    const timer = setTimeout(async () => {
      if (!ref.current) return
      try {
        const uri = await captureRef(ref, { format: 'png', quality: 1 })
        onCapture(uri)
      } catch {}
    }, 80)
    return () => clearTimeout(timer)
    // Перезахватываем при смене цвета или номера
  }, [bg, vehicle.plateNumber])

  return (
    <View ref={ref} collapsable={false} style={designStyles.wrapper}>
      {/* Круг с иконкой — borderRadius работает, т.к. не внутри Marker */}
      <View style={[designStyles.circle, { backgroundColor: bg, borderColor: border }]}>
        <MaterialCommunityIcons name="bus" size={18} color={palette.white} />
      </View>

      {/* Подпись с номером ТС */}
      <View style={designStyles.label}>
        <Text style={[designStyles.plate, { color: plate }]}>
          {vehicle.plateNumber}
        </Text>
      </View>
    </View>
  )
}

// ---------------------------------------------------------------------------
// VehicleMarker
//
// Принимает готовый imageUri (PNG из MarkerDesignCapture) и передаёт его
// в Marker через проп image — обходит сломанный bitmap-capture на Android.
// ---------------------------------------------------------------------------
interface VehicleMarkerProps {
  vehicle: Vehicle
  isOwn: boolean
  isSelected: boolean
  onPress: (vehicleId: string) => void
  imageUri?: string
}

function VehicleMarkerComponent({
  vehicle,
  isOwn,
  isSelected,
  onPress,
  imageUri,
}: VehicleMarkerProps) {
  if (!vehicle.position || !imageUri) return null

  return (
    <Marker
      coordinate={{
        latitude: vehicle.position.lat,
        longitude: vehicle.position.lng,
      }}
      image={{ uri: imageUri }}
      anchor={{ x: 0.5, y: 1 }}
      tracksViewChanges={false}
      onPress={() => onPress(isSelected ? '' : vehicle.id)}
    />
  )
}

export const VehicleMarker = memo(VehicleMarkerComponent)

// ---------------------------------------------------------------------------
// Стили дизайна маркера (используются в MarkerDesignCapture)
// ---------------------------------------------------------------------------
const designStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 4,
    // padding нужен, чтобы тень круга не обрезалась при capture
    padding: 4,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    backgroundColor: 'rgba(15,23,42,0.9)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  plate: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
})
