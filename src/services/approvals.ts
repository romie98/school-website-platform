import { api, canPublishDirectly, isPrincipal } from '@/services/api'

export type ChangeAction = 'create' | 'update' | 'delete'
export type ChangeStatus = 'pending' | 'approved' | 'declined' | 'cancelled'

export type ContentChange = {
  id: string
  resourceType: string
  resourceLabel: string
  resourceId?: string | null
  action: ChangeAction
  title: string
  status: ChangeStatus
  submittedBy?: string | null
  submittedByName: string
  submittedAt?: string | null
  reviewedBy?: string | null
  reviewedByName?: string
  reviewedAt?: string | null
  declineReason?: string
  supersedesId?: string | null
  createdAt?: string | null
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  changes?: { field: string; key: string; from: unknown; to: unknown }[]
}

export type ChangeStats = {
  pending: number
  approved: number
  declined: number
  approvedThisMonth: number
  declinedThisMonth: number
}

export type AppNotice = {
  id: string
  title: string
  body: string
  href: string
  kind: string
  changeRequestId?: string | null
  readAt?: string | null
  createdAt?: string | null
}

export function submitLabel() {
  return canPublishDirectly() ? 'Publish' : 'Submit for Approval'
}

export function deleteConfirmCopy() {
  if (canPublishDirectly()) {
    return {
      title: 'Delete this content?',
      body: 'This content will be removed from the public website.',
      confirmLabel: 'Delete',
    }
  }
  return {
    title: 'Request deletion?',
    body: 'This content will remain publicly visible until the principal approves the deletion.',
    confirmLabel: 'Submit Deletion Request',
  }
}

export function formatWhen(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-JM', { dateStyle: 'medium', timeStyle: 'short' })
}

export const approvalApi = {
  stats: () => api<ChangeStats>('/admin/changes/stats'),
  list: (status?: string) => api<ContentChange[]>(`/admin/changes${status ? `?status=${status}` : ''}`),
  get: (id: string) => api<ContentChange>(`/admin/changes/${id}`),
  approve: (id: string) => api<ContentChange>(`/admin/changes/${id}/approve`, { method: 'POST' }),
  decline: (id: string, reason: string) =>
    api<ContentChange>(`/admin/changes/${id}/decline`, { method: 'POST', body: JSON.stringify({ reason }) }),
  cancel: (id: string) => api<ContentChange>(`/admin/changes/${id}/cancel`, { method: 'POST' }),
  resubmit: (id: string, newData?: Record<string, unknown>) =>
    api<ContentChange>(`/admin/changes/${id}/resubmit`, { method: 'POST', body: JSON.stringify({ newData }) }),
  notifications: () => api<{ unread: number; items: AppNotice[] }>('/admin/notifications'),
  readNotification: (id: string) => api<AppNotice>(`/admin/notifications/${id}/read`, { method: 'POST' }),
}

export { canPublishDirectly, isPrincipal }
