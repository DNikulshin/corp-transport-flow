import { createClient } from 'redis'

type RedisClient = ReturnType<typeof createClient>

let _client: RedisClient | null = null
let _subscriber: RedisClient | null = null

/**
 * Redis client для команд (GET, SET, PUBLISH).
 */
export async function getRedis(): Promise<RedisClient> {
  if (_client) return _client

  _client = createClient({
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  })

  _client.on('error', (err) => console.error('Redis Client Error', err))

  await _client.connect()
  return _client
}

/**
 * Отдельный Redis client для подписки (SUBSCRIBE).
 * node-redis требует отдельного клиента для pub/sub.
 */
export async function getRedisSubscriber(): Promise<RedisClient> {
  if (_subscriber) return _subscriber

  const client = await getRedis()
  _subscriber = client.duplicate()

  _subscriber.on('error', (err) => console.error('Redis Subscriber Error', err))

  await _subscriber.connect()
  return _subscriber
}

export const REDIS_KEYS = {
  vehiclePosition: (id: string) => `vehicle:pos:${id}`,
  activeVehicles: () => 'vehicles:active',
}

export const REDIS_CHANNELS = {
  positionUpdate: 'tracking:position',
  vehicleOnline: 'tracking:online',
  vehicleOffline: 'tracking:offline',
}
