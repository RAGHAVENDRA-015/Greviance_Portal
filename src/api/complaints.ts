import { api } from './client'
import type {
  AssignOfficerPayload,
  Complaint,
  ComplaintUpdatePayload,
  CreateComplaintForm,
  StatusUpdatePayload,
} from '@/types'
export const complaintsApi = {
  validateImage: async (file: File, category?: string, description?: string) => {
    const body = new FormData()
    body.append('image', file)
    if (category) body.append('category', category)
    if (description) body.append('description', description)

    const { data } = await api.post<{ relevant: boolean; reason: string }>(
      '/complaints/validate-image',
      body,
    )
    return data
  },

  create: async (form: CreateComplaintForm) => {
    const body = new FormData()
    body.append('title', form.title)
    body.append('description', form.description)
    if (form.category) body.append('category', form.category)
    if (form.priority) body.append('priority', form.priority)
    if (form.latitude != null) body.append('latitude', String(form.latitude))
    if (form.longitude != null) body.append('longitude', String(form.longitude))
    form.images?.forEach((file) => body.append('images', file))

    // Let the browser add the multipart boundary. Supplying Content-Type
    // manually can produce a boundary-less request that FastAPI cannot parse.
    const { data } = await api.post<Complaint>('/complaints/', body)
    return data
  },

  myComplaints: async () => {
    const { data } = await api.get<Complaint[]>('/complaints/my')
    return data
  },

  departmentQueue: async () => {
    const { data } = await api.get<Complaint[]>('/complaints/department')
    return data
  },

  listAll: async () => {
    const { data } = await api.get<Complaint[]>('/complaints/')
    return data
  },

  getById: async (id: string) => {
    const { data } = await api.get<Complaint>(`/complaints/${id}`)
    return data
  },

  updateStatus: async (id: string, payload: StatusUpdatePayload) => {
    const { data } = await api.patch<Complaint>(`/complaints/${id}/status`, payload)
    return data
  },

  assignOfficer: async (id: string, payload: AssignOfficerPayload) => {
    const { data } = await api.patch<Complaint>(`/complaints/${id}/assign`, payload)
    return data
  },

  update: async (id: string, payload: ComplaintUpdatePayload) => {
    const { data } = await api.patch<Complaint>(`/complaints/${id}`, payload)
    return data
  },

  remove: async (id: string) => {
    const { data } = await api.delete<{ message: string }>(`/complaints/${id}`)
    return data
  },
}
