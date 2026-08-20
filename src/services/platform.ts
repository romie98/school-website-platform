import { api } from '@/services/api'

export interface PlatformPlan {
  id: string
  name: string
  slug: string
  maxAdmins: number
  maxStorageMb: number
}

export interface PlatformDomain {
  id: string
  schoolId?: string
  domain: string
  isPrimary: boolean
  verified: boolean
  schoolName?: string | null
  schoolSlug?: string | null
  schoolStatus?: string | null
}

export interface PlatformUser {
  id: string
  name: string
  email: string
  role: string
  schoolId: string | null
  schoolName?: string | null
  isActive: boolean
}

export interface PlatformSchool {
  id: string
  name: string
  slug: string
  status: string
  domain: string | null
  customDomain: string | null
  theme: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  motto?: string | null
  plan: PlatformPlan | null
  subscriptionStatus: string
  features: Record<string, boolean>
  storageBytes: number
  adminCount: number
  domains?: PlatformDomain[]
  users?: PlatformUser[]
  counts?: Record<string, number>
}

export interface PlatformStats {
  schools: number
  schoolsByStatus: Record<string, number>
  users: number
  schoolAdmins: number
  news: number
  events: number
  media: number
  storageBytes: number
  activeSchools: number
}

export interface BackupRecord {
  id: string
  status: string
  startedAt?: string | null
  completedAt?: string | null
  sizeBytes?: number
  errorMessage?: string | null
}

export interface SystemHealth {
  ok: boolean
  environment: string
  platformDomain: string
  storageProvider: string
  schools: number
  checkedAt: string
  status: string
  services: {
    frontend: string
    api: string
    database: string
    storage: string
    backup: string
  }
  backup: {
    status: string
    lastSuccess?: BackupRecord | null
    lastAttempt?: BackupRecord | null
  }
  counts: {
    errorsToday: number
    failedUploadsToday: number
    criticalToday: number
    unresolved: number
  }
}

export interface SystemError {
  id: string
  eventType: string
  severity: string
  category: string
  tenantId?: string | null
  tenantName?: string | null
  message: string
  requestId?: string | null
  route?: string | null
  createdAt?: string | null
  resolvedAt?: string | null
}

export function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export const platformApi = {
  stats: () => api<PlatformStats>('/platform/stats'),
  system: () => api<SystemHealth>('/platform/system'),
  systemHealth: () => api<SystemHealth>('/platform/system'),
  systemEvents: (query: { category?: string; severity?: string; unresolved?: boolean; limit?: number } = {}) => {
    const params = new URLSearchParams()
    if (query.category) params.set('category', query.category)
    if (query.severity) params.set('severity', query.severity)
    if (query.unresolved) params.set('unresolved', 'true')
    if (query.limit) params.set('limit', String(query.limit))
    const suffix = params.toString() ? `?${params}` : ''
    return api<{ items: SystemError[] }>(`/platform/system/events${suffix}`)
  },
  plans: () => api<PlatformPlan[]>('/platform/plans'),
  themes: () => api<{ id: string; label: string; description: string; primaryColor?: string; secondaryColor?: string; accentColor?: string }[]>('/platform/themes'),
  features: () => api<{ id: string; enabled: boolean }[]>('/platform/features'),
  schools: () => api<PlatformSchool[]>('/platform/schools'),
  school: (id: string) => api<PlatformSchool>(`/platform/schools/${id}`),
  createSchool: (body: Record<string, unknown>) => api<PlatformSchool>('/platform/schools', { method: 'POST', body: JSON.stringify(body) }),
  updateSchool: (id: string, body: Record<string, unknown>) => api<PlatformSchool>(`/platform/schools/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  addDomain: (id: string, body: Record<string, unknown>) => api<PlatformDomain>(`/platform/schools/${id}/domains`, { method: 'POST', body: JSON.stringify(body) }),
  updateDomain: (id: string, domainId: string, body: Record<string, unknown>) => api<PlatformDomain>(`/platform/schools/${id}/domains/${domainId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteDomain: (id: string, domainId: string) => api<{ ok: boolean }>(`/platform/schools/${id}/domains/${domainId}`, { method: 'DELETE' }),
  addAdmin: (id: string, body: Record<string, unknown>) => api<PlatformUser>(`/platform/schools/${id}/admins`, { method: 'POST', body: JSON.stringify(body) }),
  domains: () => api<PlatformDomain[]>('/platform/domains'),
  users: () => api<PlatformUser[]>('/platform/users'),
  updateUser: (id: string, body: Record<string, unknown>) => api<PlatformUser>(`/platform/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
}
