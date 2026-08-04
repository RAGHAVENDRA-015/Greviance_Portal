import { adminApi } from './admin'
import type { DashboardStats } from '@/types'

export const dashboardApi = {
  getAdminStats: async (): Promise<DashboardStats> => adminApi.dashboard(),
}
