import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../stores/auth-store'
import { useVehiclesStore } from '../stores/vehicles-store'
import { api, BASE_URL } from '../api'
import type { VehiclePosition } from '../stores/vehicles-store'
import { NativeEventSource } from '../lib/native-event-source'

type SseEvent =
  | { type: 'position'; data: VehiclePosition }
  | { type: 'vehicle_offline'; vehicleId: string }
  | { type: 'vehicle_online'; vehicleId: string }

/** Максимальное кол-во попыток реконнекта перед паузой. */
const MAX_RETRIES = 5
const RETRY_DELAY_MS = 5_000

export function useVehiclesSse() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const setVehicles = useVehiclesStore((s) => s.setVehicles)
  const updatePosition = useVehiclesStore((s) => s.updatePosition)
  const setVehicleOffline = useVehiclesStore((s) => s.setVehicleOffline)
  const setVehicleOnline = useVehiclesStore((s) => s.setVehicleOnline)
  const esRef = useRef<NativeEventSource | null>(null)
  const retriesRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Загрузить список ТС при старте
  useEffect(() => {
    if (!accessToken) return
    api
      .get('/vehicles')
      .then((res) => setVehicles(res.data))
      .catch(console.error)
  }, [accessToken, setVehicles])

  const handleMessage = useCallback(
    (e: { data: string }) => {
      try {
        const event = JSON.parse(e.data) as SseEvent
        switch (event.type) {
          case 'position':
            updatePosition(event.data)
            break
          case 'vehicle_offline':
            setVehicleOffline(event.vehicleId)
            break
          case 'vehicle_online':
            setVehicleOnline(event.vehicleId)
            break
        }
      } catch {
        // Некорректный JSON — игнорируем
      }
    },
    [updatePosition, setVehicleOffline, setVehicleOnline],
  )

  // SSE-подписка
  useEffect(() => {
    if (!accessToken) return

    const connect = () => {
      const url = `${BASE_URL}/api/tracking/stream`

      // NativeEventSource — лёгкая реализация SSE поверх XMLHttpRequest,
      // работает в React Native (Hermes/JSC) без Node.js-глобалов.
      const es = new NativeEventSource(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      esRef.current = es

      es.onopen = () => {
        retriesRef.current = 0
      }

      es.onmessage = handleMessage

      es.onerror = () => {
        retriesRef.current += 1
        if (retriesRef.current < MAX_RETRIES) {
          // Автоматический реконнект с нарастающей задержкой
          const delay = RETRY_DELAY_MS * retriesRef.current
          retryTimerRef.current = setTimeout(() => {
            if (esRef.current) {
              esRef.current.close()
            }
            connect()
          }, delay)
        } else {
          // Слишком много ошибок — ждём изменения accessToken
          es.close()
          esRef.current = null
        }
      }
    }

    connect()

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [accessToken, handleMessage])
}
