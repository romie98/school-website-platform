import { Link, useBlocker, useNavigate } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal, Plus, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { paginate } from '@/utils'

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    published: 'bg-brand-soft text-brand',
    draft: 'bg-gold-muted text-brand-dark',
    archived: 'bg-gray-200 text-gray-700',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-brand-soft text-brand',
    active: 'bg-brand-soft text-brand',
    trial: 'bg-gold-muted text-brand-dark',
    suspended: 'bg-red-100 text-red-800',
    inactive: 'bg-gray-200 text-gray-700',
    past_due: 'bg-gold-muted text-brand-dark',
    disabled: 'bg-gray-200 text-gray-700',
    pending: 'bg-gold-muted text-brand-dark',
    approved: 'bg-brand-soft text-brand',
    declined: 'bg-red-100 text-red-800',
    CREATE: 'bg-brand-soft text-brand',
    UPDATE: 'bg-gold-muted text-brand-dark',
    DELETE: 'bg-red-100 text-red-800',
    Important: 'bg-gold text-brand-dark',
    Emergency: 'bg-red-100 text-red-800',
    HEALTHY: 'bg-brand-soft text-brand',
    DEGRADED: 'bg-gold-muted text-brand-dark',
    UNHEALTHY: 'bg-red-100 text-red-800',
    UNKNOWN: 'bg-gray-200 text-gray-700',
    INFO: 'bg-brand-soft text-brand',
    WARNING: 'bg-gold-muted text-brand-dark',
    ERROR: 'bg-red-100 text-red-800',
    CRITICAL: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${styles[status] ?? 'bg-cream text-brand'}`}>
      {status}
    </span>
  )
}

export function AdminHeader({
  title,
  description,
  addLabel,
  addTo,
  extra,
}: {
  title: string
  description?: string
  addLabel?: string
  addTo?: string
  extra?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold text-brand">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {extra}
        {addTo && addLabel && (
          <Link to={addTo} className="inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark">
            <Plus className="h-4 w-4" /> {addLabel}
          </Link>
        )}
      </div>
    </div>
  )
}

export function AdminSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block min-w-[200px] flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input className="w-full rounded-md border border-brand/20 bg-white py-2 pl-9 pr-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  )
}

export function AdminEmpty({ title, body, actionLabel, actionTo }: { title: string; body: string; actionLabel?: string; actionTo?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-brand/20 bg-white px-6 py-16 text-center">
      <p className="font-display text-lg font-semibold text-brand">{title}</p>
      <p className="mt-2 text-sm text-muted">{body}</p>
      {actionTo && actionLabel && (
        <Link to={actionTo} className="mt-5 inline-flex rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark">
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

export function ActionsMenu({ items }: { items: { label: string; onClick: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <button type="button" className="rounded-md p-1.5 hover:bg-cream" aria-label="Actions" onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal className="h-4 w-4 text-brand" />
      </button>
      {open && (
        <ul className="absolute right-0 z-20 min-w-40 rounded-md bg-white py-1 shadow-lg ring-1 ring-brand/10">
          {items.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                className={`block w-full px-3 py-1.5 text-left text-sm ${item.danger ? 'text-red-700 hover:bg-red-50' : 'text-brand hover:bg-cream'}`}
                onClick={() => { setOpen(false); item.onClick() }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function AdminPager({ page, totalPages, total, perPage, onChange }: { page: number; totalPages: number; total: number; perPage: number; onChange: (p: number) => void }) {
  if (total === 0) return null
  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <p>Showing {start}–{end} of {total}</p>
      {totalPages > 1 && (
        <div className="flex gap-1">
          <button type="button" className="rounded border border-brand/20 px-2 py-1 disabled:opacity-40" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button>
          <button type="button" className="rounded border border-brand/20 px-2 py-1 disabled:opacity-40" disabled={page === totalPages} onClick={() => onChange(page + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}

export function useAdminList<T>(items: T[], perPage = 12, match?: (item: T, query: string) => boolean) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const filtered = match ? items.filter((item) => !query || match(item, query.toLowerCase())) : items
  const paged = paginate(filtered, page, perPage)
  return { query, setQuery: (v: string) => { setQuery(v); setPage(1) }, page, setPage, paged }
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-sm font-medium text-brand">
      {label}
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs font-normal text-muted">{hint}</p>}
    </label>
  )
}

export const adminInput = 'w-full rounded-md border border-brand/20 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand'

export function EditorShell({
  title,
  backTo,
  lastSaved,
  dirty,
  children,
  actions,
}: {
  title: string
  backTo: string
  lastSaved?: string
  dirty?: boolean
  children: React.ReactNode
  actions: React.ReactNode
}) {
  const blocker = useBlocker(Boolean(dirty))
  useEffect(() => {
    if (!dirty) return
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [dirty])
  return (
    <div>
      <Link to={backTo} className="inline-flex items-center gap-1 text-sm font-medium text-brand">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="mt-3 mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand">{title}</h1>
          {lastSaved && <p className="text-xs text-muted">Last saved: {new Date(lastSaved).toLocaleString('en-JM')}</p>}
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
      {children}
      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-brand-dark/70" />
          <div className="relative max-w-md rounded-lg bg-white p-6">
            <p className="font-display font-bold text-brand">You have unsaved changes. Are you sure you want to leave?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-md border px-3 py-1.5 text-sm" onClick={() => blocker.reset()}>Stay</button>
              <button type="button" className="rounded-md bg-brand px-3 py-1.5 text-sm text-white" onClick={() => blocker.proceed()}>Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function StringList({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('')
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {values.map((v, i) => (
          <span key={v + i} className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-1 text-xs">
            {v}
            <button type="button" onClick={() => onChange(values.filter((_, idx) => idx !== i))} aria-label={`Remove ${v}`}>×</button>
          </span>
        ))}
      </div>
      <input
        className={`${adminInput} mt-2`}
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (draft.trim()) {
              onChange([...values, draft.trim()])
              setDraft('')
            }
          }
        }}
      />
    </div>
  )
}

export function useNavigateConfirm() {
  return useNavigate()
}
