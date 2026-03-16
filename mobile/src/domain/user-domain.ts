export type UserRole = 'driver' | 'employee' | 'admin'

export interface User {
  id: string
  username: string
  fullName: string
  role: UserRole
  vehicleId?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}
