import { api } from './client'
import type { User } from '@/types'

export const authApi = {
  me: async () => {
    const { data } = await api.get<User>('/auth/me')
    return data
  },
}
