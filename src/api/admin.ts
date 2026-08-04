import { api } from './client'
import type { DashboardStats, User, UserRole } from '@/types'

export const adminApi = {
  dashboard: async () => {
    const { data } = await api.get<DashboardStats>('/admin/dashboard')
    return data
  },

  officers: async () => {
    const { data } = await api.get<User[]>('/admin/officers')
    return data
  },

  usersByRole: async (role: UserRole) => {
    const { data } = await api.get<User[]>('/admin/users/by-role', { params: { role } })
    return data
  },
}
