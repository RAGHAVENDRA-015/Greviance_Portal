import { api } from './client'
import type { User, UserRole, UserUpdatePayload } from '@/types'

export const usersApi = {
  me: async () => {
    const { data } = await api.get<User>('/users/me')
    return data
  },

  updateMe: async (payload: UserUpdatePayload) => {
    const { data } = await api.put<User>('/users/me', payload)
    return data
  },

  list: async () => {
    const { data } = await api.get<User[]>('/users/')
    return data
  },

  getById: async (userId: string) => {
    const { data } = await api.get<User>(`/users/${userId}`)
    return data
  },

  updateRole: async (userId: string, role: UserRole) => {
    const { data } = await api.put<User>(`/users/${userId}/role`, { role })
    return data
  },

  deactivate: async (userId: string) => {
    const { data } = await api.delete<{ message: string }>(`/users/${userId}`)
    return data
  },
}
