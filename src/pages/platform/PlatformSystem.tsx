import { useEffect, useState } from 'react'
import { Activity, Database, HardDrive, Server, ShieldAlert } from 'lucide-react'
import { AdminHeader, StatusBadge } from '@/components/admin/AdminChrome'
import { platformApi, type SystemError, type SystemHealth } from '@/services/platform'

function formatWhen(value?: string | null) {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function ServiceRow({ label, status, icon: Icon }: { label: string; status: string; icon: typeof Server }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-brand/5 py-3 last:border-0">
      <span className="inline-flex items-center gap-2 text-sm text-brand">
        <Icon className="h-4 w-4 text-gold-dark" />
        {label}
      </span>
      <StatusBadge status={status} />
    </li>
  )
}

export function PlatformSystem() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [errors, setErrors] = useState<SystemError[]>([])
  const [selected, setSelected] = useState<SystemError | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    Promise.all([platformApi.systemHealth(), platformApi.systemEvents({ unresolved: false, limit: 20 })])
      .then(([next, events]) => {
        setHealth(next)
        setErrors(events.items)
      })
      .catch((err: Error) => setError(err.message))
  }

  useEffect(() => {
    load()
  }, [])

  const services = health?.services
  const backup = health?.backup

  return (
    <div>
      <AdminHeader
        title="System health"
        description="Operational status for the API, database, storage, and backups. School administrators do not see this page."
      />
      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-display font-bold text-brand">Services</h2>
          <ul className="mt-2">
            <ServiceRow label="Frontend" status={services?.frontend || 'UNKNOWN'} icon={Activity} />
            <ServiceRow label="Backend API" status={services?.api || 'UNKNOWN'} icon={Server} />
            <ServiceRow label="Database" status={services?.database || 'UNKNOWN'} icon={Database} />
            <ServiceRow label="Storage" status={services?.storage || 'UNKNOWN'} icon={HardDrive} />
            <ServiceRow label="Database backup" status={services?.backup || 'UNKNOWN'} icon={ShieldAlert} />
          </ul>
          <p className="mt-3 text-xs text-muted">Last health check: {formatWhen(health?.checkedAt)}</p>
        </section>
        <section className="rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-display font-bold text-brand">Backup</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Last success</dt>
              <dd className="font-medium text-brand">{formatWhen(backup?.lastSuccess?.completedAt)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Last attempt</dt>
              <dd className="font-medium text-brand">{backup?.lastAttempt?.status || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Environment</dt>
              <dd className="font-medium text-brand">{health?.environment || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Errors today</dt>
              <dd className="font-medium text-brand">{health?.counts.errorsToday ?? 0}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Failed uploads</dt>
              <dd className="font-medium text-brand">{health?.counts.failedUploadsToday ?? 0}</dd>
            </div>
          </dl>
        </section>
      </div>
      <section className="mt-6 rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-display font-bold text-brand">Recent errors</h2>
        {errors.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No significant errors recorded.</p>
        ) : (
          <ul className="mt-4 divide-y divide-brand/10">
            {errors.map((item) => (
              <li key={item.id}>
                <button type="button" className="flex w-full items-start justify-between gap-4 py-3 text-left" onClick={() => setSelected(item)}>
                  <div>
                    <p className="text-sm font-medium text-brand">{item.message}</p>
                    <p className="mt-1 text-xs text-muted">
                      {item.tenantName || 'Platform'} · {item.category}
                      {item.requestId ? ` · ${item.requestId.slice(0, 8)}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={item.severity} />
                    <p className="mt-1 text-xs text-muted">{formatWhen(item.createdAt)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-dark/40 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-lg font-bold text-brand">{selected.eventType}</h3>
              <button type="button" className="text-sm text-muted" onClick={() => setSelected(null)}>Close</button>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div><dt className="text-xs uppercase text-muted">Time</dt><dd>{formatWhen(selected.createdAt)}</dd></div>
              <div><dt className="text-xs uppercase text-muted">School</dt><dd>{selected.tenantName || 'Platform'}</dd></div>
              <div><dt className="text-xs uppercase text-muted">Category</dt><dd>{selected.category}</dd></div>
              <div><dt className="text-xs uppercase text-muted">Request ID</dt><dd className="break-all">{selected.requestId || '—'}</dd></div>
              <div><dt className="text-xs uppercase text-muted">Route</dt><dd>{selected.route || '—'}</dd></div>
              <div><dt className="text-xs uppercase text-muted">Message</dt><dd>{selected.message}</dd></div>
              <div><dt className="text-xs uppercase text-muted">Status</dt><dd>{selected.resolvedAt ? 'Resolved' : 'Unresolved'}</dd></div>
            </dl>
          </div>
        </div>
      )}
    </div>
  )
}
