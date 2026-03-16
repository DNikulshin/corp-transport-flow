import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import * as SecureStore from 'expo-secure-store'
import NetInfo from '@react-native-community/netinfo'
import { useLocationStore } from '../shared/stores/location-store'

export const LOCATION_TASK_NAME = 'background-location-task'

// --- WebSocket singleton для фоновой задачи ---

let ws: WebSocket | null = null
let wsConnected = false

function getWsUrl(token: string): string {
  // Бэкенд регистрирует WS на /api/tracking/ws (prefix + route).
  // Получаем ws:// URL из EXPO_PUBLIC_API_URL (http://...).
  const httpBase = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(
    /\/$/,
    '',
  )
  const wsBase = httpBase.replace(/^http/, 'ws')
  return `${wsBase}/api/tracking/ws?token=${encodeURIComponent(token)}`
}

function ensureWs(token: string): WebSocket {
  if (ws && wsConnected) return ws

  ws = new WebSocket(getWsUrl(token))

  ws.onopen = () => {
    wsConnected = true

    // Отправить накопленные оффлайн-точки
    const queue = useLocationStore.getState().drainQueue()
    for (const loc of queue) {
      ws?.send(JSON.stringify({ type: 'position', data: loc }))
    }
  }

  ws.onclose = () => {
    wsConnected = false
    ws = null
  }

  ws.onerror = () => {
    wsConnected = false
    try {
      ws?.close()
    } catch {}
    ws = null
  }

  return ws
}

/** Явное закрытие WS при завершении смены водителем. */
export function closeTrackingWs() {
  if (ws) {
    try { ws.close() } catch {}
    ws = null
    wsConnected = false
  }
}

// --- Фоновая задача ---

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error || !data) return

  const { locations } = data as { locations: Location.LocationObject[] }
  if (locations.length === 0) return

  const [accessToken, vehicleId] = await Promise.all([
    SecureStore.getItemAsync('accessToken'),
    SecureStore.getItemAsync('vehicleId'),
  ])

  if (!accessToken || !vehicleId) return

  const loc = locations[0]
  const payload = {
    vehicleId,
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    heading: loc.coords.heading ?? 0,
    speed: loc.coords.speed ? Math.round(loc.coords.speed * 3.6) : 0,
    accuracy: loc.coords.accuracy ?? 0,
    timestamp: loc.timestamp,
  }

  const netState = await NetInfo.fetch()
  const hasInternet = (netState.isConnected && netState.isInternetReachable) ?? false
  const { addLocationToQueue } = useLocationStore.getState()

  if (!hasInternet) {
    addLocationToQueue(payload)
    return
  }

  const socket = ensureWs(accessToken)
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'position', data: payload }))
  } else {
    // Сокет ещё подключается — сохраняем в очередь
    addLocationToQueue(payload)
  }
})
