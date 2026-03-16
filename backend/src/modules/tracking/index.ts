import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../services/prisma.js'
import {
  getRedis,
  getRedisSubscriber,
  REDIS_KEYS,
  REDIS_CHANNELS,
} from '../../services/redis.js'

/**
 * Валидация координатного пакета от водителя.
 * Ограничения: lat ∈ [-90, 90], lng ∈ [-180, 180], speed ≥ 0, accuracy ≥ 0.
 */
const PositionSchema = z.object({
  vehicleId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).max(500).optional(), // км/ч, max 500 на случай аномалий
  accuracy: z.number().min(0).optional(),
  timestamp: z.number(),
})

type PositionPayload = z.infer<typeof PositionSchema>

const WsMessageSchema = z.object({
  type: z.string(),
  data: PositionSchema.optional(),
})

/**
 * Извлекает JWT-токен из запроса: сначала из заголовка Authorization,
 * затем из query-параметра `token` (fallback для SSE/WS).
 */
function extractToken(req: FastifyRequest): string | null {
  // 1. Заголовок Authorization: Bearer <token>
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  // 2. Query-параметр (fallback для EventSource и WebSocket)
  const queryToken = (req.query as Record<string, string>).token
  return queryToken ?? null
}

export async function trackingRoutes(app: FastifyInstance) {
  // ─── WebSocket — водитель шлёт позиции ───

  app.get('/ws', { websocket: true }, async (socket, req) => {
    const token = extractToken(req)
    if (!token) {
      socket.close(1008, 'No token')
      return
    }

    let userId: string
    let vehicleId: string
    try {
      const decoded = app.jwt.verify(token) as { userId: string; role: string }
      userId = decoded.userId
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user?.vehicleId) {
        socket.close(1008, 'No vehicle assigned')
        return
      }
      vehicleId = user.vehicleId
    } catch {
      socket.close(1008, 'Invalid token')
      return
    }

    // Пометить ТС активным
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { isActive: true },
    })

    const redis = await getRedis()

    socket.on('message', async (raw: any) => {
      try {
        const parsed = WsMessageSchema.safeParse(JSON.parse(raw.toString()))
        if (!parsed.success) return

        const msg = parsed.data

        if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }))
          return
        }

        if (msg.type !== 'position' || !msg.data) return

        const pos = msg.data

        // Проверяем, что vehicleId в payload совпадает с авторизованным
        if (pos.vehicleId !== vehicleId) return

        // Сохранить позицию в Redis (TTL 10 мин)
        await redis.set(
          REDIS_KEYS.vehiclePosition(vehicleId),
          JSON.stringify({ ...pos, vehicleId }),
          { EX: 600 },
        )

        // Записать в БД для истории
        await prisma.positionLog.create({
          data: {
            vehicleId,
            lat: pos.lat,
            lng: pos.lng,
            heading: pos.heading,
            speed: pos.speed,
            accuracy: pos.accuracy,
          },
        })

        // Publish → все SSE-клиенты получат обновление
        await redis.publish(
          REDIS_CHANNELS.positionUpdate,
          JSON.stringify({ type: 'position', data: { ...pos, vehicleId } }),
        )
      } catch {
        // malformed message — ignore
      }
    })

    socket.on('close', async () => {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { isActive: false },
      })
      const redis2 = await getRedis()
      await redis2.publish(
        REDIS_CHANNELS.vehicleOffline,
        JSON.stringify({ type: 'vehicle_offline', vehicleId }),
      )
    })
  })

  // ─── POST /online — водитель явно начинает смену ───
  //
  // Вызывается из мобильного приложения при нажатии «Начать смену».
  // Сразу публикует vehicle_online в SSE, не дожидаясь первого GPS-апдейта.
  // Это необходимо в dev-режиме, где background-задача может не запуститься.

  app.post('/online', { onRequest: [app.authenticate] }, async (req, reply) => {
    const decoded = req.user as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user?.vehicleId) return reply.status(400).send({ error: 'No vehicle assigned' })

    const vehicleId = user.vehicleId

    await prisma.vehicle.update({ where: { id: vehicleId }, data: { isActive: true } })

    const redis = await getRedis()

    // Если мобильное приложение передало начальную позицию — сразу сохраняем в Redis
    // и публикуем position-событие, чтобы маркер появился на карте не дожидаясь GPS-задачи.
    const body = req.body as {
      lat?: number; lng?: number
      heading?: number; speed?: number; timestamp?: number
    } | null

    if (body?.lat != null && body?.lng != null) {
      const posData = {
        vehicleId,
        lat: body.lat,
        lng: body.lng,
        heading: body.heading ?? 0,
        speed: body.speed ?? 0,
        timestamp: body.timestamp ?? Date.now(),
      }
      await redis.set(
        REDIS_KEYS.vehiclePosition(vehicleId),
        JSON.stringify(posData),
        { EX: 600 },
      )
      await redis.publish(
        REDIS_CHANNELS.positionUpdate,
        JSON.stringify({ type: 'position', data: posData }),
      )
    }

    await redis.publish(
      REDIS_CHANNELS.vehicleOnline,
      JSON.stringify({ type: 'vehicle_online', vehicleId }),
    )

    return reply.send({ ok: true })
  })

  // ─── POST /offline — водитель явно завершает смену ───
  //
  // Удаляет позицию из Redis (TTL не ждём) и публикует vehicle_offline.
  // Вызывается при нажатии «Завершить смену» — до или вместо закрытия WS.

  app.post('/offline', { onRequest: [app.authenticate] }, async (req, reply) => {
    const decoded = req.user as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user?.vehicleId) return reply.send({ ok: true })

    const vehicleId = user.vehicleId

    await prisma.vehicle.update({ where: { id: vehicleId }, data: { isActive: false } })

    const redis = await getRedis()
    await redis.del(REDIS_KEYS.vehiclePosition(vehicleId))
    await redis.publish(
      REDIS_CHANNELS.vehicleOffline,
      JSON.stringify({ type: 'vehicle_offline', vehicleId }),
    )

    return reply.send({ ok: true })
  })

  // ─── SSE — клиенты подписываются на поток позиций ───

  app.get('/stream', async (req, reply) => {
    // Поддерживаем оба способа передачи токена:
    // 1. Authorization: Bearer <token>  (предпочтительно)
    // 2. ?token=<token>                 (fallback для браузерного EventSource)
    const token = extractToken(req)

    if (!token) {
      return reply.status(401).send({ error: 'No token provided' })
    }

    try {
      app.jwt.verify(token)
    } catch {
      return reply.status(401).send({ error: 'Invalid token' })
    }

    const corsOrigin =
      process.env.CORS_ORIGIN === 'all'
        ? '*'
        : process.env.FRONTEND_URL ?? 'http://localhost:3000'

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Credentials': 'true',
    })

    const send = (data: object) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    // Keepalive каждые 20 сек
    const keepalive = setInterval(() => {
      reply.raw.write(': keepalive\n\n')
    }, 20_000)

    const sub = await getRedisSubscriber()

    const handler = (message: string) => {
      try {
        const parsed = JSON.parse(message) as object
        send(parsed)
      } catch (e) {
        console.error('Error parsing SSE message', e)
      }
    }

    const channels = [
      REDIS_CHANNELS.positionUpdate,
      REDIS_CHANNELS.vehicleOnline,
      REDIS_CHANNELS.vehicleOffline,
    ]

    await sub.subscribe(channels, handler)

    req.raw.on('close', async () => {
      clearInterval(keepalive)
      await sub.unsubscribe(channels, handler)
    })
  })
}
