import type { FastifyInstance } from 'fastify'
import { prisma } from '../../services/prisma.js'
import { getRedis, REDIS_KEYS } from '../../services/redis.js'

/**
 * Формат ТС для отправки клиенту.
 * Соответствует интерфейсу Vehicle в mobile.
 */
interface VehicleResponse {
  id: string
  name: string
  plateNumber: string
  isActive: boolean
  driverId?: string
  driverName?: string
  position?: object
}

export async function vehiclesRoutes(app: FastifyInstance) {
  // GET /api/vehicles — список всех машин с последней позицией из Redis
  app.get('/', { onRequest: [app.authenticate] }, async (_req, reply) => {
    const vehicles = await prisma.vehicle.findMany({
      include: {
        driver: {
          select: { id: true, fullName: true },
        },
      },
    })

    const redis = await getRedis()

    const result: VehicleResponse[] = await Promise.all(
      vehicles.map(async (v) => {
        const posJson = await redis.get(REDIS_KEYS.vehiclePosition(v.id))
        const position = posJson ? (JSON.parse(posJson) as object) : undefined

        return {
          id: v.id,
          name: v.name,
          plateNumber: v.plateNumber,
          // isActive определяется через Redis: если есть позиция с живым TTL — машина активна.
          // Это избавляет от стухших true в БД после аварийного завершения сессии.
          isActive: !!posJson,
          driverId: v.driver?.id,
          driverName: v.driver?.fullName,
          position,
        }
      }),
    )

    return reply.send(result)
  })

  // Эндпоинты POST /:id/online и POST /:id/offline удалены.
  //
  // Ранее они переключали поле `online` (отдельное от `isActive`),
  // но mobile их никогда не вызывал. Статус ТС управляется через
  // WebSocket: подключение → isActive=true, отключение → isActive=false.
  //
  // Поле `online` рекомендуется удалить из Prisma-схемы в следующей миграции.
}
