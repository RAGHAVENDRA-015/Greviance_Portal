import { complaintsApi } from './complaints'
import type { Complaint, StatusUpdatePayload } from '@/types'

export const officerApi = {
  getQueue: (): Promise<Complaint[]> => complaintsApi.departmentQueue(),
  getAll: (): Promise<Complaint[]> => complaintsApi.listAll(),
  updateStatus: (id: string, payload: StatusUpdatePayload) =>
    complaintsApi.updateStatus(id, payload),
}
