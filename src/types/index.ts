export type UserRole = 'citizen' | 'officer' | 'admin'

export type ComplaintStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Rejected'

export type ComplaintCategory =
  | 'Water Supply'
  | 'Roads'
  | 'Electricity'
  | 'Garbage'
  | 'Drainage'
  | 'Public Safety'
  | 'Health'
  | 'Corruption'
  | 'Other'

export type ComplaintPriority = 'Low' | 'Medium' | 'High'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface User {
  id: string
  firebase_uid: string
  name: string
  email: string
  phone?: string | null
  address?: string | null
  profile_image?: string | null
  department?: string | null
  role: UserRole
  is_active: boolean
  is_verified: boolean
  created_at: string
}

export interface UserUpdatePayload {
  name?: string
  phone?: string
  address?: string
  profile_image?: string
}

export interface ImageReference {
  url: string
  public_id: string
}

export interface ComplaintLocation {
  latitude: number
  longitude: number
}

export interface Complaint {
  id: string
  title: string
  description: string
  citizen_id: string
  category?: ComplaintCategory | null
  priority?: ComplaintPriority | null
  department?: string | null
  status: ComplaintStatus
  location?: ComplaintLocation | null
  images: ImageReference[]
  ai_summary?: string | null
  ai_confidence?: number | null
  assigned_officer?: string | null
  resolution_notes?: string | null
  created_at: string
  updated_at: string
}

export interface StatusUpdatePayload {
  status: ComplaintStatus
  resolution_notes?: string
}

export interface AssignOfficerPayload {
  officer_id: string
  department?: string
}

export interface ComplaintUpdatePayload {
  title?: string
  description?: string
  status?: ComplaintStatus
  department?: string
  assigned_officer?: string
  resolution_notes?: string
  priority?: ComplaintPriority
  category?: ComplaintCategory
}

export interface DashboardStats {
  total_complaints: number
  pending: number
  in_progress: number
  resolved: number
  rejected: number
  by_department: Record<string, number>
  total_users: number
  total_officers: number
  recent_complaints?: Complaint[]
}

export interface CreateComplaintForm {
  title: string
  description: string
  category?: ComplaintCategory
  priority?: ComplaintPriority
  latitude?: number
  longitude?: number
  images?: File[]
}

export interface ApiError {
  detail?: string | { msg: string }[]
  message?: string
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: string
}
