import { PrismaClient } from '@prisma/client'

/**
 * Singleton PrismaClient — один пул соединений на весь процесс.
 *
 * Ранее каждый модуль (auth, tracking, vehicles) создавал
 * свой `new PrismaClient()`, что порождало 3 пула к PostgreSQL.
 */
export const prisma = new PrismaClient()
