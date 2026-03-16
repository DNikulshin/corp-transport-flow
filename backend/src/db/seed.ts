import { prisma } from '../services/prisma.js'
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🌱 Seeding database...')

  // --- 5 машин ---
  const vehicles = await Promise.all([
    prisma.vehicle.upsert({
      where: { plateNumber: 'А001АА77' },
      update: {},
      create: { name: 'Газель 001', plateNumber: 'А001АА77' },
    }),
    prisma.vehicle.upsert({
      where: { plateNumber: 'В002ВВ77' },
      update: {},
      create: { name: 'Ford Transit 002', plateNumber: 'В002ВВ77' },
    }),
    prisma.vehicle.upsert({
      where: { plateNumber: 'С003СС77' },
      update: {},
      create: { name: 'Sprinter 003', plateNumber: 'С003СС77' },
    }),
    prisma.vehicle.upsert({
      where: { plateNumber: 'Е004ЕЕ77' },
      update: {},
      create: { name: 'Lada Largus 004', plateNumber: 'Е004ЕЕ77' },
    }),
    prisma.vehicle.upsert({
      where: { plateNumber: 'К005КК77' },
      update: {},
      create: { name: 'VW Transporter 005', plateNumber: 'К005КК77' },
    }),
  ])

  // Хешируем пароли один раз (вместо 9 раз)
  const driverHash = await bcrypt.hash('password123', 10)
  const employeeHash = await bcrypt.hash('password123', 10)
  const adminHash = await bcrypt.hash('admin123', 10)

  // --- 5 водителей ---
  const drivers = [
    { username: 'driver1', fullName: 'Иван Петров', vehicleIdx: 0 },
    { username: 'driver2', fullName: 'Алексей Сидоров', vehicleIdx: 1 },
    { username: 'driver3', fullName: 'Сергей Воробьев', vehicleIdx: 2 },
    { username: 'driver4', fullName: 'Дмитрий Кузнецов', vehicleIdx: 3 },
    { username: 'driver5', fullName: 'Михаил Попов', vehicleIdx: 4 },
  ]

  await Promise.all(
    drivers.map((d) =>
      prisma.user.upsert({
        where: { username: d.username },
        update: { vehicleId: vehicles[d.vehicleIdx].id },
        create: {
          username: d.username,
          password: driverHash,
          fullName: d.fullName,
          role: 'DRIVER',
          vehicleId: vehicles[d.vehicleIdx].id,
        },
      }),
    ),
  )

  // --- 3 сотрудника ---
  const employees = [
    { username: 'employee1', fullName: 'Мария Иванова' },
    { username: 'employee2', fullName: 'Елена Смирнова' },
    { username: 'employee3', fullName: 'Ольга Васильева' },
  ]

  await Promise.all(
    employees.map((e) =>
      prisma.user.upsert({
        where: { username: e.username },
        update: {},
        create: {
          username: e.username,
          password: employeeHash,
          fullName: e.fullName,
          role: 'EMPLOYEE',
        },
      }),
    ),
  )

  // --- 1 администратор ---
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminHash,
      fullName: 'Администратор',
      role: 'ADMIN',
    },
  })

  console.log('✅ Seed complete!')
  console.log('👤 Тестовые аккаунты:')
  console.log('   - 1 админ: admin / admin123')
  console.log('   - 5 водителей: driver1..5 / password123')
  console.log('   - 3 сотрудника: employee1..3 / password123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
