import { api } from '@/services/api'
import { formatWhen } from '@/services/approvals'

export type AuditEvent = {
  id: string
  schoolId?: string | null
  schoolName?: string
  actorUserId?: string | null
  actorName: string
  actorRole: string
  actorRoleLabel: string
  action: string
  resourceType: string
  resourceLabel: string
  resourceId?: string | null
  resourceName: string
  changeRequestId?: string | null
  statusBefore?: string | null
  statusAfter?: string | null
  reviewedByUserId?: string | null
  reviewedByName?: string | null
  declineReason?: string | null
  contentAction?: string | null
  supersedesId?: string | null
  createdAt?: string | null
  isSecurity?: boolean
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  changes?: { field: string; key: string; from: unknown; to: unknown }[]
  metadata?: Record<string, unknown>
  timeline?: AuditEvent[]
}

export type AuditPage = {
  items: AuditEvent[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  summary?: AuditSummary
  profile?: {
    userId: string
    name: string
    role: string
    roleLabel: string
    submitted: number
    approved: number
    declined: number
    total: number
  }
}

export type AuditSummary = {
  submitted: number
  approved: number
  declined: number
  published: number
  deleted: number
  total: number
}

export type AuditQuery = {
  action?: string
  resourceType?: string
  resourceId?: string
  userId?: string
  status?: string
  q?: string
  dateFrom?: string
  dateTo?: string
  category?: string
  page?: number
  pageSize?: number
  tenantId?: string
}

export function auditActionLabel(event: AuditEvent) {
  const kind = event.contentAction || (event.metadata?.action as string | undefined)
  const target = kind === 'create' ? 'new content' : kind === 'delete' ? 'deletion' : 'update'
  switch (event.action) {
    case 'CHANGE_SUBMITTED':
      return kind === 'create' ? 'Submitted new content' : kind === 'delete' ? 'Requested deletion' : 'Submitted update'
    case 'CHANGE_RESUBMITTED':
      return 'Resubmitted update'
    case 'CHANGE_APPROVED':
      return kind === 'delete' ? 'Approved deletion' : kind === 'create' ? 'Approved new content' : 'Approved update'
    case 'CHANGE_DECLINED':
      return `Declined ${target}`
    case 'CHANGE_CANCELLED':
      return 'Cancelled request'
    case 'CONTENT_PUBLISHED':
      return 'Published'
    case 'CONTENT_CREATED':
      return 'Created content'
    case 'CONTENT_UPDATED':
      return 'Updated content'
    case 'CONTENT_DELETED':
      return 'Deleted content'
    case 'PRINCIPAL_DIRECT_PUBLISH':
      return kind === 'delete' ? 'Deleted and published' : 'Edited and published'
    case 'LOGIN_SUCCESS':
      return 'Signed in'
    case 'LOGIN_FAILED':
      return 'Failed sign-in'
    case 'USER_CREATED':
      return 'Created user'
    case 'USER_UPDATED':
      return 'Updated user'
    case 'USER_DISABLED':
      return event.statusAfter === 'deleted' ? 'Removed user' : 'Disabled user'
    case 'USER_ENABLED':
      return 'Enabled user'
    case 'USER_ROLE_CHANGED':
      return 'Changed user role'
    case 'USER_PASSWORD_CHANGED':
      return 'Reset password'
    default:
      return event.action.replace(/_/g, ' ').toLowerCase()
  }
}

export function auditStatusLabel(event: AuditEvent) {
  if (event.action === 'CHANGE_SUBMITTED' || event.action === 'CHANGE_RESUBMITTED') return 'Pending principal approval'
  if (event.action === 'CHANGE_APPROVED' || event.action === 'CONTENT_PUBLISHED') return 'Approved & published'
  if (event.action === 'CONTENT_DELETED') return 'Deleted'
  if (event.action === 'CHANGE_DECLINED') return 'Declined'
  if (event.action === 'PRINCIPAL_DIRECT_PUBLISH') return 'Published'
  return event.statusAfter || ''
}

export function formatAuditWhen(value?: string | null) {
  if (!value) return '—'
  return formatWhen(value).replace(', ', ' • ')
}

function toParams(query: AuditQuery) {
  const params = new URLSearchParams()
  if (query.action) params.set('action', query.action)
  if (query.resourceType) params.set('resourceType', query.resourceType)
  if (query.resourceId) params.set('resourceId', query.resourceId)
  if (query.userId) params.set('userId', query.userId)
  if (query.status) params.set('status', query.status)
  if (query.q) params.set('q', query.q)
  if (query.dateFrom) params.set('dateFrom', query.dateFrom)
  if (query.dateTo) params.set('dateTo', query.dateTo)
  if (query.category) params.set('category', query.category)
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))
    if (query.tenantId) params.set('tenantId', query.tenantId)
  const text = params.toString()
  return text ? `?${text}` : ''
}

export const auditApi = {
  list: (query: AuditQuery = {}) => api<AuditPage>(`/admin/audit${toParams(query)}`),
  summary: () => api<AuditSummary>('/admin/audit/summary'),
  get: (id: string) => api<AuditEvent>(`/admin/audit/${id}`),
  resource: (type: string, id: string) => api<AuditPage>(`/admin/audit/resource/${type}/${id}`),
  user: (userId: string, query: AuditQuery = {}) => api<AuditPage>(`/admin/audit/user/${userId}${toParams(query)}`),
}

export const platformAuditApi = {
  list: (query: AuditQuery = {}) => api<AuditPage>(`/platform/audit${toParams(query)}`),
  get: (id: string) => api<AuditEvent>(`/platform/audit/${id}`),
}
