import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AdminHeader, EditorShell, Field, StatusBadge, adminInput } from '@/components/admin/AdminChrome'
import { useToast } from '@/components/admin/Toast'
import { approvalApi, formatWhen, isPrincipal, type ChangeAction, type ChangeStatus, type ContentChange } from '@/services/approvals'
import { conflictText } from '@/services/collections'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { RichTextEditor } from '@/components/admin/RichTextEditor'

const TABS: { id: ChangeStatus; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'declined', label: 'Declined' },
]

function actionLabel(action: ChangeAction) {
  if (action === 'create') return 'CREATE'
  if (action === 'delete') return 'DELETE'
  return 'UPDATE'
}

function isImageValue(key: string, value: unknown) {
  if (['image', 'photo', 'url', 'crestUrl', 'logoUrl', 'heroImage', 'welcomeImage', 'faviconUrl'].includes(key)) return true
  if (value && typeof value === 'object' && 'url' in (value as object)) return true
  return false
}

function mediaSrc(value: unknown): string | null {
  if (typeof value === 'string' && value) return value
  if (value && typeof value === 'object' && 'url' in value && typeof (value as { url: unknown }).url === 'string') {
    return (value as { url: string }).url
  }
  return null
}

function pretty(value: unknown) {
  if (value == null || value === '') return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return String(value)
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function ApprovalsHub() {
  const principal = isPrincipal()
  const [tab, setTab] = useSearchParams()
  const status = (tab.get('status') as ChangeStatus) || 'pending'
  const [stats, setStats] = useState({ pending: 0, approved: 0, declined: 0, approvedThisMonth: 0, declinedThisMonth: 0 })
  const [rows, setRows] = useState<ContentChange[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const load = async (next?: ChangeStatus) => {
    setLoading(true)
    try {
      const [nextStats, list] = await Promise.all([approvalApi.stats(), approvalApi.list(next || status)])
      setStats(nextStats)
      setRows(list)
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Unable to load approvals.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(status) }, [status])

  return (
    <div>
      <AdminHeader
        title={principal ? 'Approval Centre' : 'My Changes'}
        description={principal
          ? 'Review content submitted by school administrators before it appears on the public website.'
          : 'Track the status of changes you submitted for principal approval.'}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab({ status: item.id })}
            className={`rounded-lg bg-white p-4 text-left shadow-[var(--shadow-card)] ${status === item.id ? 'ring-2 ring-gold' : ''}`}
          >
            <p className="text-sm text-muted">{item.label}</p>
            <p className="font-display text-3xl font-bold text-brand">{stats[item.id as 'pending' | 'approved' | 'declined']}</p>
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rounded-full px-3 py-1 text-sm ${status === item.id ? 'bg-brand text-white' : 'bg-white text-brand ring-1 ring-brand/15'}`}
            onClick={() => setTab({ status: item.id })}
          >
            {item.label}
          </button>
        ))}
      </div>
      {loading ? <p className="text-sm text-muted">Loading…</p> : rows.length === 0 ? (
        <p className="rounded-lg bg-white p-8 text-sm text-muted">No {status} requests.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-lg bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <StatusBadge status={actionLabel(row.action)} />
                    <StatusBadge status={row.status} />
                  </div>
                  <p className="text-xs uppercase tracking-wide text-muted">{row.resourceLabel}</p>
                  <p className="font-display text-lg font-bold text-brand">{row.title || 'Untitled'}</p>
                  <p className="mt-1 text-sm text-muted">Submitted by {row.submittedByName} · {formatWhen(row.submittedAt)}</p>
                  {row.status === 'declined' && row.declineReason && (
                    <p className="mt-2 text-sm text-red-800">Reason: “{row.declineReason}”</p>
                  )}
                  {row.reviewedByName && row.status !== 'pending' && (
                    <p className="text-sm text-muted">Reviewed by {row.reviewedByName} · {formatWhen(row.reviewedAt)}</p>
                  )}
                </div>
                <Link
                  to={row.status === 'declined' && !principal ? `/admin/approvals/${row.id}?edit=1` : `/admin/approvals/${row.id}`}
                  className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark"
                >
                  {row.status === 'pending' && principal ? 'Review Change' : row.status === 'declined' && !principal ? 'Edit & Resubmit' : 'View'}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ApprovalReview() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const principal = isPrincipal()
  const [row, setRow] = useState<ContentChange | null>(null)
  const [busy, setBusy] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (!id) return
    approvalApi.get(id).then((item) => {
      setRow(item)
      if (params.get('edit') === '1' && item.status === 'declined') {
        setDraft({ ...(item.newData || item.oldData || {}) })
        setEditing(true)
      }
    }).catch((err) => toast.push(err instanceof Error ? err.message : 'Not found.', 'error'))
  }, [id])

  const diffs = row?.changes || []
  const imageDiffs = diffs.filter((item) => isImageValue(item.key, item.to) || isImageValue(item.key, item.from))
  const textDiffs = diffs.filter((item) => !imageDiffs.includes(item))

  if (!row) return <p className="text-sm text-muted">Loading request…</p>

  const startEdit = () => {
    setDraft({ ...(row.newData || row.oldData || {}) })
    setEditing(true)
  }

  const approve = async () => {
    if (busy) return
    setBusy(true)
    try {
      const next = await approvalApi.approve(row.id)
      setRow(next)
      toast.push(row.action === 'delete' ? 'Deletion approved and published.' : 'Change approved and published.')
      navigate('/admin/approvals')
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Unable to approve.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const decline = async () => {
    if (!reason.trim()) {
      toast.push('A reason is required when declining a change.', 'error')
      return
    }
    if (busy) return
    setBusy(true)
    try {
      const next = await approvalApi.decline(row.id, reason.trim())
      setRow(next)
      toast.push('Change declined. The public website was not updated.')
      setDeclineOpen(false)
      navigate('/admin/approvals?status=declined')
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Unable to decline.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const resubmit = async () => {
    if (busy) return
    setBusy(true)
    try {
      const next = await approvalApi.resubmit(row.id, row.action === 'delete' ? undefined : draft)
      toast.push('Submitted for principal approval.')
      setEditing(false)
      navigate(`/admin/changes/${next.id}`)
    } catch (err) {
      toast.push(conflictText(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  const canEdit = row.status === 'declined' && !principal

  return (
    <EditorShell
      title={editing ? `Revise: ${row.title || 'change'}` : row.title || 'Review change'}
      backTo="/admin/changes"
      dirty={editing}
      actions={
        row.status === 'pending' && principal ? (
          <>
            <button type="button" disabled={busy} className="rounded-md border border-brand/20 px-4 py-2 text-sm disabled:opacity-50" onClick={() => setDeclineOpen(true)}>Decline</button>
            <button type="button" disabled={busy} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark disabled:opacity-50" onClick={approve}>
              {busy ? 'Working…' : row.action === 'delete' ? 'Approve Deletion' : 'Approve & Publish'}
            </button>
          </>
        ) : canEdit && editing ? (
          <>
            <button type="button" disabled={busy} className="rounded-md border border-brand/20 px-4 py-2 text-sm disabled:opacity-50" onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" disabled={busy} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark disabled:opacity-50" onClick={resubmit}>
              {busy ? 'Submitting…' : 'Submit for Approval'}
            </button>
          </>
        ) : canEdit ? (
          <button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={startEdit}>Edit & Resubmit</button>
        ) : null
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <StatusBadge status={actionLabel(row.action)} />
        <StatusBadge status={row.status} />
      </div>
      <div className="mb-6 grid gap-3 rounded-lg bg-white p-5 text-sm shadow-[var(--shadow-card)] sm:grid-cols-2">
        <p><span className="text-muted">Change type:</span> {actionLabel(row.action)}</p>
        <p><span className="text-muted">Content type:</span> {row.resourceLabel}</p>
        <p><span className="text-muted">Submitted by:</span> {row.submittedByName}</p>
        <p><span className="text-muted">Submitted on:</span> {formatWhen(row.submittedAt)}</p>
        {row.reviewedByName && <p><span className="text-muted">Reviewed by:</span> {row.reviewedByName}</p>}
        {row.declineReason && <p className="sm:col-span-2"><span className="text-muted">Reason:</span> {row.declineReason}</p>}
      </div>

      {editing && canEdit ? (
        <section className="rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-lg font-bold text-brand">
            {row.action === 'delete' ? 'Resubmit deletion request' : 'Edit the proposed content'}
          </h2>
          {row.declineReason && (
            <p className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-900">
              Please address this feedback before sending it back: “{row.declineReason}”
            </p>
          )}
          {row.action === 'delete' ? (
            <div className="mt-4">
              <p className="text-sm text-muted">The public content below will still be removed only after the principal approves this request again.</p>
              <PreviewFields data={row.oldData || {}} />
            </div>
          ) : (
            <div className="mt-4">
              <ProposalEditor data={draft} onChange={setDraft} />
            </div>
          )}
        </section>
      ) : (
        <>
          {row.action === 'delete' && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              DELETE REQUEST. The following published content will be removed if this request is approved.
            </div>
          )}

          {row.action === 'create' && (
            <section className="rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-lg font-bold text-brand">New content</h2>
              <PreviewFields data={row.newData || {}} />
            </section>
          )}

          {row.action === 'delete' && (
            <section className="rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-display text-lg font-bold text-brand">Published content</h2>
              <PreviewFields data={row.oldData || {}} />
            </section>
          )}

          {row.action === 'update' && (
            <div className="space-y-6">
              {imageDiffs.length > 0 && (
                <section className="rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
                  <h2 className="mb-4 font-display text-lg font-bold text-brand">Image comparison</h2>
                  {imageDiffs.map((item) => (
                    <div key={item.key} className="grid gap-4 md:grid-cols-2">
                      <figure>
                        <figcaption className="mb-2 text-sm text-muted">Current image</figcaption>
                        {mediaSrc(item.from) ? <img src={mediaSrc(item.from)!} alt="" className="max-h-56 w-full rounded object-cover" /> : <p className="text-sm text-muted">None</p>}
                      </figure>
                      <figure>
                        <figcaption className="mb-2 text-sm text-muted">Proposed image</figcaption>
                        {mediaSrc(item.to) ? <img src={mediaSrc(item.to)!} alt="" className="max-h-56 w-full rounded object-cover" /> : <p className="text-sm text-muted">None</p>}
                      </figure>
                    </div>
                  ))}
                </section>
              )}
              <section className="rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
                <h2 className="mb-4 font-display text-lg font-bold text-brand">What will change</h2>
                {textDiffs.length === 0 && imageDiffs.length === 0 ? (
                  <p className="text-sm text-muted">No visible field changes were detected.</p>
                ) : (
                  <dl className="space-y-3">
                    {textDiffs.map((item) => (
                      <div key={item.key} className="grid gap-2 md:grid-cols-2">
                        <dt className="text-sm font-medium text-brand">{item.field}</dt>
                        <dd className="text-sm text-muted md:col-span-2 md:grid md:grid-cols-2 md:gap-4">
                          <span><strong className="text-brand">Current version:</strong> {pretty(item.from)}</span>
                          <span><strong className="text-brand">Proposed version:</strong> {pretty(item.to)}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </section>
            </div>
          )}
        </>
      )}

      {declineOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-brand-dark/70" aria-label="Cancel" onClick={() => setDeclineOpen(false)} />
          <div className="relative w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="font-display text-lg font-bold text-brand">Decline change</h2>
            <p className="mt-1 text-sm text-muted">Explain what the administrator should correct before resubmitting.</p>
            <Field label="Reason for declining">
              <textarea className={adminInput} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} required />
            </Field>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={() => setDeclineOpen(false)}>Cancel</button>
              <button type="button" disabled={busy || !reason.trim()} className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={decline}>Decline Change</button>
            </div>
          </div>
        </div>
      )}
    </EditorShell>
  )
}

const SKIP_EDIT_KEYS = new Set([
  'id', 'school_id', 'schoolId', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'payload',
  'featuredImage', 'photoMedia', 'heroImageMedia', 'welcomeImageMedia', 'crestMedia', 'faviconMedia',
  'gallery',
])
const RICH_TEXT_KEYS = new Set(['content', 'description', 'bio', 'overview', 'message', 'body', 'welcomeBody'])

function fieldLabel(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())
}

function ProposalEditor({ data, onChange }: { data: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void }) {
  const set = (key: string, value: unknown) => onChange({ ...data, [key]: value })
  const entries = Object.entries(data).filter(([key]) => !SKIP_EDIT_KEYS.has(key))
  if (entries.length === 0) {
    return <p className="text-sm text-muted">There are no editable fields on this request.</p>
  }
  return (
    <div className="space-y-4">
      {entries.map(([key, value]) => {
        if (isImageValue(key, value) || key.toLowerCase().includes('image') || key.toLowerCase().includes('photo') || key.toLowerCase().includes('logo')) {
          return (
            <ImageUploader
              key={key}
              label={fieldLabel(key)}
              value={mediaSrc(value)}
              onChange={(_file, url) => set(key, url)}
            />
          )
        }
        if (typeof value === 'boolean') {
          return (
            <label key={key} className="flex items-center gap-2 text-sm text-brand">
              <input type="checkbox" checked={value} onChange={(e) => set(key, e.target.checked)} />
              {fieldLabel(key)}
            </label>
          )
        }
        if (typeof value === 'string' && (RICH_TEXT_KEYS.has(key) || value.includes('<p'))) {
          return <RichTextEditor key={key} label={fieldLabel(key)} value={value} onChange={(html) => set(key, html)} />
        }
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return (
            <fieldset key={key} className="rounded-md border border-brand/10 p-4">
              <legend className="px-1 text-sm font-medium text-brand">{fieldLabel(key)}</legend>
              <ProposalEditor data={value as Record<string, unknown>} onChange={(next) => set(key, next)} />
            </fieldset>
          )
        }
        if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
          return (
            <Field key={key} label={fieldLabel(key)}>
              <textarea className={adminInput} rows={4} value={value.join('\n')} onChange={(e) => set(key, e.target.value.split('\n'))} />
            </Field>
          )
        }
        if (typeof value === 'number') {
          return (
            <Field key={key} label={fieldLabel(key)}>
              <input type="number" className={adminInput} value={value} onChange={(e) => set(key, Number(e.target.value))} />
            </Field>
          )
        }
        const text = value == null ? '' : String(value)
        const long = text.length > 80 || key === 'excerpt'
        return (
          <Field key={key} label={fieldLabel(key)}>
            {long ? (
              <textarea className={adminInput} rows={4} value={text} onChange={(e) => set(key, e.target.value)} />
            ) : (
              <input className={adminInput} value={text} onChange={(e) => set(key, e.target.value)} />
            )}
          </Field>
        )
      })}
    </div>
  )
}

function PreviewFields({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([key]) => !['id', 'school_id', 'schoolId', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'payload'].includes(key))
  return (
    <dl className="mt-4 space-y-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="text-sm font-medium text-brand">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</dt>
          <dd className="mt-1 text-sm text-muted">
            {isImageValue(key, value) && mediaSrc(value) ? (
              <img src={mediaSrc(value)!} alt="" className="max-h-56 rounded object-cover" />
            ) : (
              <span className="whitespace-pre-wrap">{pretty(value)}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function PrincipalApprovalsRedirect() {
  return <Navigate to="/admin/approvals" replace />
}

export function useApprovalStats() {
  const [pending, setPending] = useState(0)
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [stats, notes] = await Promise.all([approvalApi.stats(), approvalApi.notifications()])
        if (!active) return
        setPending(stats.pending)
        setUnread(notes.unread)
      } catch {
        /* ignore */
      }
    }
    void load()
    const timer = window.setInterval(load, 20000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])
  return { pending, unread }
}

export function RecentApprovals() {
  const [rows, setRows] = useState<ContentChange[]>([])
  const [stats, setStats] = useState({ pending: 0, approvedThisMonth: 0, declinedThisMonth: 0 })
  useEffect(() => {
    Promise.all([approvalApi.stats(), approvalApi.list('pending')])
      .then(([nextStats, list]) => {
        setStats(nextStats)
        setRows(list.slice(0, 5))
      })
      .catch(() => undefined)
  }, [])
  const cards = useMemo(() => [
    { label: 'Pending Approvals', value: stats.pending, to: '/admin/approvals?status=pending' },
    { label: 'Approved This Month', value: stats.approvedThisMonth, to: '/admin/approvals?status=approved' },
    { label: 'Declined This Month', value: stats.declinedThisMonth, to: '/admin/approvals?status=declined' },
  ], [stats])
  return (
    <section className="mt-10">
      <h2 className="font-display text-lg font-bold text-brand">Approval Centre</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className="rounded-lg bg-white p-4 shadow-[var(--shadow-card)]">
            <p className="font-display text-3xl font-bold text-brand">{card.value}</p>
            <p className="text-sm text-muted">{card.label}</p>
          </Link>
        ))}
      </div>
      <div className="mt-6 rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-brand">Recent approval requests</h3>
          <Link to="/admin/approvals" className="text-sm font-medium text-brand hover:underline">View all</Link>
        </div>
        {rows.length === 0 ? <p className="mt-3 text-sm text-muted">No pending requests.</p> : (
          <ul className="mt-3 divide-y divide-brand/10">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>{row.title} · {row.submittedByName}</span>
                <Link to={`/admin/approvals/${row.id}`} className="font-medium text-brand hover:underline">Review</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
