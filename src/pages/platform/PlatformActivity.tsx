import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminEmpty, AdminHeader, AdminPager, AdminSearch, adminInput } from '@/components/admin/AdminChrome'
import { useToast } from '@/components/admin/Toast'
import { platformApi } from '@/services/platform'
import { platformAuditApi, type AuditEvent, type AuditPage } from '@/services/audit'
import { ActivityDetailsPanel, AuditCard, useActivityDetails } from '@/pages/admin/activity/ActivityPages'

export function PlatformActivity() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([])
  const [data, setData] = useState<AuditPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const details = useActivityDetails((id) => platformAuditApi.get(id))
  const q = params.get('q') || ''
  const tenantId = params.get('tenantId') || ''
  const action = params.get('action') || ''
  const page = Number(params.get('page') || '1')

  useEffect(() => {
    platformApi.schools().then((rows) => setSchools(rows.map((row) => ({ id: row.id, name: row.name })))).catch(() => undefined)
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    platformAuditApi.list({ q, tenantId, action, page, pageSize: 50 })
      .then(setData)
      .catch((err: Error) => {
        setError(err.message || 'Unable to load activity history. Please try again.')
        toast.push('Unable to load activity history. Please try again.', 'error')
      })
      .finally(() => setLoading(false))
  }, [q, tenantId, action, page])

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    if (!('page' in patch)) next.delete('page')
    setParams(next)
  }

  return (
    <div>
      <AdminHeader title="Platform activity" description="Inspect audit history across schools. School users cannot see another tenant’s logs." />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <AdminSearch value={q} onChange={(value) => update({ q: value })} placeholder="Search actor, title or action…" />
        <select className={adminInput} value={tenantId} onChange={(e) => update({ tenantId: e.target.value })}>
          <option value="">All schools</option>
          {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
        </select>
        <select className={adminInput} value={action} onChange={(e) => update({ action: e.target.value })}>
          <option value="">All actions</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="declined">Declined</option>
          <option value="published">Published</option>
          <option value="deleted">Deleted</option>
          <option value="login">Sign-in</option>
          <option value="users">User management</option>
        </select>
      </div>
      {loading ? (
        <p className="text-sm text-muted">Loading activity…</p>
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : !data || data.total === 0 ? (
        <AdminEmpty title="No activity yet." body="School content and approval actions will appear here." />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((event: AuditEvent) => (
              <AuditCard key={event.id} event={event} showSchool onViewDetails={(item) => void details.view(item.id)} />
            ))}
          </div>
          <AdminPager page={data.page} totalPages={data.totalPages} total={data.total} perPage={data.pageSize} onChange={(next) => update({ page: String(next) })} />
        </>
      )}
      <p className="mt-6 text-xs text-muted">
        <Link to="/platform/schools" className="text-brand hover:underline">Back to schools</Link>
      </p>
      {details.open && (
        <ActivityDetailsPanel event={details.event} loading={details.loading} error={details.error} onClose={details.close} />
      )}
    </div>
  )
}
