import React, { memo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Marker } from 'react-native-maps'
import Svg, { Circle, Path, G } from 'react-native-svg'
import type { Vehicle } from '@/shared/stores/vehicles-store'
import { colors, fontSize, palette } from '@/shared/constants/theme'

// Material Design bus icon (24×24 viewBox) — одна строка, идентично web-версии
const BUS_PATH =
  'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z'

const SVG_SIZE = 52
const CIRCLE_R = 21
const ICON_SCALE = 20 / 24          // icon 20px from 24px viewBox
const ICON_OFFSET = (SVG_SIZE - 20) / 2  // center icon in SVG canvas = 16

interface VehicleMarkerProps {
  vehicle: Vehicle
  isOwn: boolean
  isSelected: boolean
  onPress: (vehicleId: string) => void
}

function VehicleMarkerComponent({
  vehicle,
  isOwn,
  isSelected,
  onPress,
}: VehicleMarkerProps) {
  if (!vehicle.position) return null

  const bgColor = isOwn
    ? colors.markerSelf        // sky-500   — своя машина
    : vehicle.isActive
      ? colors.markerActive    // emerald-500 — в смене
      : colors.markerInactive  // slate-600   — не в смене

  const borderColor = isOwn
    ? colors.markerSelfBorder
    : vehicle.isActive
      ? colors.markerActiveBorder
      : colors.markerInactiveBorder

  const labelColor = isOwn ? colors.textAccent : colors.textSecondary

  return (
    <Marker
      coordinate={{
        latitude: vehicle.position.lat,
        longitude: vehicle.position.lng,
      }}
      onPress={() => onPress(isSelected ? '' : vehicle.id)}
      anchor={{ x: 0.5, y: 1 }}
      // tracksViewChanges={true} — единственный надёжный способ на Android:
      // - SVG рендерится через hardware canvas, bitmap-capture его не видит
      // - цвета и подпись всегда актуальны без таймеров/стейта
      // - для ≤10 маркеров производительность не проблема
      tracksViewChanges
    >
      {/*
        collapsable={false} — запрещает Android схлопывать View-иерархию,
        что могло бы привести к потере children при bitmap-захвате
      */}
      <View style={styles.wrapper} collapsable={false}>
        {/* Круг + иконка — целиком SVG, без RN borderRadius (нет Android clipping) */}
        <Svg
          width={SVG_SIZE}
          height={SVG_SIZE}
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        >
          <Circle
            cx={SVG_SIZE / 2}
            cy={SVG_SIZE / 2}
            r={CIRCLE_R}
            fill={bgColor}
            stroke={borderColor}
            strokeWidth={2.5}
          />
          <G transform={`translate(${ICON_OFFSET}, ${ICON_OFFSET}) scale(${ICON_SCALE})`}>
            <Path d={BUS_PATH} fill={palette.white} />
          </G>
        </Svg>

        {/* Хвостик-указатель на координату */}
        <View style={[styles.pin, { borderTopColor: bgColor }]} />

        {/* Номерной знак — без borderRadius, чтобы не было Android clipping */}
        <View style={styles.label} collapsable={false}>
          <Text style={[styles.labelText, { color: labelColor }]}>
            {vehicle.plateNumber}
          </Text>
        </View>
      </View>
    </Marker>
  )
}

export const VehicleMarker = memo(VehicleMarkerComponent)

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingHorizontal: 4, // буфер от edge-clipping
  },
  pin: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  label: {
    backgroundColor: 'rgba(15,23,42,0.92)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 3,
    // borderRadius убран — RN borderRadius внутри MapView Marker клипается на Android
  },
  labelText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
})
