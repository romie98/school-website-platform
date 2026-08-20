import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AdminEmpty, AdminHeader, AdminPager, AdminSearch, StatusBadge, adminInput } from '@/components/admin/AdminChrome'
import { useToast } from '@/components/admin/Toast'
import { canManageUsers, isPrincipal } from '@/services/api'
import {
  auditActionLabel,
  auditApi,
  auditStatusLabel,
  formatAuditWhen,
  type AuditEvent,
  type AuditPage,
  type AuditQuery,
} from '@/services/audit'

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
  { value: 'published', label: 'Published' },
  { value: 'deleted', label: 'Deleted' },
  { value: 'login', label: 'Sign-in' },
  { value: 'users', label: 'User management' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'All content types' },
  { value: 'news', label: 'News' },
  { value: 'event', label: 'Events' },
  { value: 'staff', label: 'Staff' },
  { value: 'page', label: 'Pages' },
  { value: 'document', label: 'Documents' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'homepage', label: 'Homepage' },
  { value: 'principal_message', label: "Principal's message" },
  { value: 'contact', label: 'Contact' },
  { value: 'user', label: 'Users' },
  { value: 'auth', label: 'Sign-in' },
]

function pretty(value: unknown) {
  if (value == null || value === '') return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function ChangeDiff({ event }: { event: AuditEvent }) {
  const changes = event.changes || []
  if (event.action === 'USER_PASSWORD_CHANGED') {
    return <p className="mt-2 text-sm text-muted">Password changed. The new password is not stored in the log.</p>
  }
  if (!changes.length) return null
  return (
    <dl className="mt-3 space-y-2">
      {changes.map((change) => (
        <div key={change.key}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{change.field}</dt>
          <dd className="text-sm text-brand">
            <span className="text-muted">{pretty(change.from)}</span>
            <span className="px-2 text-muted">→</span>
            <span>{pretty(change.to)}</span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function AuditCard({
  event,
  showSchool = false,
  onViewDetails,
}: {
  event: AuditEvent
  showSchool?: boolean
  onViewDetails?: (event: AuditEvent) => void
}) {
  const submittedByName =
    typeof event.metadata?.submittedByName === 'string'
      ? event.metadata.submittedByName
      : null

  return (
    <article className="rounded-lg bg-white p-4 shadow-[var(--shadow-card)]">
      <p className="text-xs text-muted">{formatAuditWhen(event.createdAt)}</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-brand">{event.actorName || 'Unknown user'}</p>
          <p className="text-xs text-muted">{event.actorRoleLabel || event.actorRole}</p>
        </div>
        <StatusBadge status={event.action.replace(/_/g, ' ')} />
      </div>
      <p className="mt-3 font-display text-lg font-semibold text-brand">{auditActionLabel(event)}</p>
      <p className="mt-1 text-sm text-muted">{event.resourceLabel}</p>
      {event.resourceName && <p className="text-sm font-medium text-brand">{event.resourceName}</p>}
      {showSchool && event.schoolName && <p className="mt-1 text-xs text-muted">{event.schoolName}</p>}
      {submittedByName &&
        submittedByName.trim() !== '' &&
        event.action !== 'CHANGE_SUBMITTED' && (
          <p className="mt-2 text-sm text-muted">
            {submittedByName} submitted the change.
          </p>
        )}
      <ChangeDiff event={event} />
      {event.declineReason && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          Reason: {event.declineReason}
        </p>
      )}
      {auditStatusLabel(event) && <p className="mt-3 text-sm text-muted">Status: {auditStatusLabel(event)}</p>}
      {onViewDetails && (
        <button type="button" className="mt-3 text-sm font-medium text-brand hover:underline" onClick={() => onViewDetails(event)}>
          View details
        </button>
      )}
    </article>
  )
}

function Timeline({ events }: { events: AuditEvent[] }) {
  return (
    <ol className="space-y-4 border-l-2 border-brand/15 pl-4">
      {events.map((item) => (
        <li key={item.id}>
          <AuditCard event={item} />
        </li>
      ))}
    </ol>
  )
}

export function ActivityDetailsPanel({
  event,
  loading,
  error,
  onClose,
}: {
  event: AuditEvent | null
  loading: boolean
  error: string
  onClose: () => void
}) {
  const timeline = event?.timeline?.length ? event.timeline : event ? [event] : []
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <button type="button" className="fixed inset-0 bg-brand-dark/70" aria-label="Close details" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="activity-details-title" className="relative z-10 my-4 w-full max-w-2xl rounded-lg bg-cream p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">{event?.resourceLabel || 'Activity'}</p>
            <h2 id="activity-details-title" className="font-display text-2xl font-bold text-brand">
              {event?.resourceName || 'Activity details'}
            </h2>
          </div>
          <button type="button" className="rounded-md border border-brand/20 bg-white px-3 py-1.5 text-sm" onClick={onClose}>Close</button>
        </div>
        {loading ? (
          <p className="text-sm text-muted">Loading activity…</p>
        ) : error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        ) : (
          <Timeline events={timeline} />
        )}
      </div>
    </div>
  )
}

export function useActivityDetails(loader: (id: string) => Promise<AuditEvent> = auditApi.get) {
  const toast = useToast()
  const [event, setEvent] = useState<AuditEvent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  const view = async (id: string) => {
    setOpen(true)
    setLoading(true)
    setError('')
    try {
      setEvent(await loader(id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load activity history. Please try again.'
      setError(message)
      toast.push(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return {
    open,
    event,
    loading,
    error,
    view,
    close: () => {
      setOpen(false)
      setEvent(null)
      setError('')
    },
  }
}

function useAuditList(extra: AuditQuery = {}) {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState<AuditPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const query = useMemo<AuditQuery>(() => ({
    q: params.get('q') || extra.q || '',
    action: params.get('action') || extra.action || '',
    resourceType: params.get('resourceType') || extra.resourceType || '',
    resourceId: params.get('resourceId') || extra.resourceId || '',
    userId: params.get('userId') || extra.userId || '',
    dateFrom: params.get('dateFrom') || '',
    dateTo: params.get('dateTo') || '',
    category: params.get('category') || '',
    page: Number(params.get('page') || '1'),
    pageSize: 50,
  }), [params, extra.q, extra.action, extra.resourceType, extra.resourceId, extra.userId])

  const load = async (next = query) => {
    setLoading(true)
    setError('')
    try {
      const page = extra.userId
        ? await auditApi.user(extra.userId, next)
        : extra.resourceType && extra.resourceId
          ? await auditApi.resource(extra.resourceType, extra.resourceId)
          : await auditApi.list(next)
      setData(page)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load activity history. Please try again.'
      setError(message)
      toast.push(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(query) }, [query.q, query.action, query.resourceType, query.resourceId, query.userId, query.dateFrom, query.dateTo, query.category, query.page])

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    if (!('page' in patch)) next.delete('page')
    setParams(next)
  }

  return { query, data, loading, error, update, reload: () => void load(query) }
}

export function ActivityLogPage() {
  const principal = isPrincipal()
  const { query, data, loading, error, update } = useAuditList()
  const details = useActivityDetails()
  if (!canManageUsers()) return <Navigate to="/admin" replace />
  return (
    <div>
      <AdminHeader
        title="Activity Log"
        description={principal
          ? 'A permanent history of submissions, approvals, publications and account changes for this school.'
          : 'Your submissions, related principal decisions, and school content activity.'}
      />
      {principal && data?.summary && (
        <div className="mb-6 grid gap-3 sm:grid-cols-4">
          {[
            ['Submitted', data.summary.submitted],
            ['Approved', data.summary.approved],
            ['Declined', data.summary.declined],
            ['Published', data.summary.published],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-white p-4 shadow-[var(--shadow-card)]">
              <p className="text-xs uppercase tracking-wide text-muted">{label} this month</p>
              <p className="mt-1 font-display text-2xl font-bold text-brand">{value}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <AdminSearch value={query.q || ''} onChange={(q) => update({ q })} placeholder="Search name, title or action…" />
        <select className={adminInput} value={query.action || ''} onChange={(e) => update({ action: e.target.value })}>
          {ACTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select className={adminInput} value={query.resourceType || ''} onChange={(e) => update({ resourceType: e.target.value })}>
          {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <input className={adminInput} type="date" value={query.dateFrom || ''} onChange={(e) => update({ dateFrom: e.target.value })} />
        <input className={adminInput} type="date" value={query.dateTo || ''} onChange={(e) => update({ dateTo: e.target.value })} />
      </div>
      {loading ? (
        <p className="text-sm text-muted">Loading activity…</p>
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : !data || data.total === 0 ? (
        <AdminEmpty title="No activity yet." body="Changes and approvals will appear here as your school website is updated." />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((event) => <AuditCard key={event.id} event={event} onViewDetails={(item) => void details.view(item.id)} />)}
          </div>
          <AdminPager page={data.page} totalPages={data.totalPages} total={data.total} perPage={data.pageSize} onChange={(page) => update({ page: String(page) })} />
        </>
      )}
      {details.open && (
        <ActivityDetailsPanel event={details.event} loading={details.loading} error={details.error} onClose={details.close} />
      )}
    </div>
  )
}

export function ActivityDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const toast = useToast()
  const [event, setEvent] = useState<AuditEvent | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (!id) return
    setLoading(true)
    auditApi.get(id)
      .then(setEvent)
      .catch((err: Error) => {
        setError(err.message || 'Unable to load activity history. Please try again.')
        toast.push('Unable to load activity history. Please try again.', 'error')
      })
      .finally(() => setLoading(false))
  }, [id])

  if (!canManageUsers()) return <Navigate to="/admin" replace />
  if (loading) return <p className="text-sm text-muted">Loading activity…</p>
  if (error || !event) return <p className="text-sm text-red-800">{error || 'That activity record was not found.'}</p>
  const timeline = event.timeline?.length ? event.timeline : [event]
  return (
    <div>
      <Link to={`/admin/activity${location.search}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand">
        <ArrowLeft className="h-4 w-4" /> Back to activity log
      </Link>
      <div className="mt-3 mb-6">
        <p className="text-xs uppercase tracking-wide text-muted">{event.resourceLabel}</p>
        <h1 className="font-display text-2xl font-bold text-brand">{event.resourceName || auditActionLabel(event)}</h1>
      </div>
      <Timeline events={timeline} />
    </div>
  )
}

export function ResourceHistoryPage() {
  const { type, id } = useParams()
  const { data, loading, error } = useAuditList({ resourceType: type, resourceId: id })
  const details = useActivityDetails()
  if (!canManageUsers()) return <Navigate to="/admin" replace />
  return (
    <div>
      <AdminHeader title="Content history" description="Who changed this record, what they changed, and who approved it." />
      {loading ? <p className="text-sm text-muted">Loading activity…</p> : error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : !data || data.total === 0 ? (
        <AdminEmpty title="No history for this record yet." body="Edits, submissions and approvals will appear here." />
      ) : (
        <div className="space-y-3">{data.items.slice().reverse().map((event) => <AuditCard key={event.id} event={event} onViewDetails={(item) => void details.view(item.id)} />)}</div>
      )}
      {details.open && (
        <ActivityDetailsPanel event={details.event} loading={details.loading} error={details.error} onClose={details.close} />
      )}
    </div>
  )
}

export function UserActivityPage() {
  const { userId } = useParams()
  const { data, loading, error } = useAuditList({ userId })
  const details = useActivityDetails()
  const profile = data?.profile
  if (!canManageUsers()) return <Navigate to="/admin" replace />
  return (
    <div>
      <AdminHeader
        title={profile?.name || 'User activity'}
        description={profile ? `${profile.roleLabel} · operational history for this account.` : 'Operational history for this account.'}
      />
      {profile && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-4"><p className="text-xs text-muted">Submitted changes</p><p className="font-display text-2xl font-bold text-brand">{profile.submitted}</p></div>
          <div className="rounded-lg bg-white p-4"><p className="text-xs text-muted">Approved</p><p className="font-display text-2xl font-bold text-brand">{profile.approved}</p></div>
          <div className="rounded-lg bg-white p-4"><p className="text-xs text-muted">Declined</p><p className="font-display text-2xl font-bold text-brand">{profile.declined}</p></div>
        </div>
      )}
      {loading ? <p className="text-sm text-muted">Loading activity…</p> : error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : !data || data.total === 0 ? (
        <AdminEmpty title="No activity for this user yet." body="Submissions and account changes will appear here." />
      ) : (
        <div className="space-y-3">{data.items.map((event) => <AuditCard key={event.id} event={event} onViewDetails={(item) => void details.view(item.id)} />)}</div>
      )}
      {details.open && (
        <ActivityDetailsPanel event={details.event} loading={details.loading} error={details.error} onClose={details.close} />
      )}
    </div>
  )
}

export function PrincipalActivityRedirect() {
  return <Navigate to="/admin/activity" replace />
}

export function HistoryLink({ resourceType, resourceId, className = '' }: { resourceType: string; resourceId: string; className?: string }) {
  const navigate = useNavigate()
  if (!canManageUsers()) return null
  return (
    <button type="button" className={className || 'text-sm font-medium text-brand hover:underline'} onClick={() => navigate(`/admin/activity/resource/${resourceType}/${resourceId}`)}>
      View history
    </button>
  )
}
