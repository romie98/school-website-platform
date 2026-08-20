import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Globe, HardDrive, Users } from 'lucide-react'
import { AdminHeader, StatusBadge } from '@/components/admin/AdminChrome'
import { formatBytes, platformApi, type PlatformStats } from '@/services/platform'

export function PlatformDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [system, setSystem] = useState<{ environment: string; platformDomain: string; storageProvider: string; services?: { api: string } } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([platformApi.stats(), platformApi.system()])
      .then(([next, sys]) => {
        setStats(next)
        setSystem(sys)
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  const cards = stats
    ? [
        { label: 'Schools', value: String(stats.schools), hint: `${stats.activeSchools} active or trial`, icon: Building2 },
        { label: 'Users', value: String(stats.users), hint: `${stats.schoolAdmins} school admins`, icon: Users },
        { label: 'Content', value: String(stats.news + stats.events), hint: `${stats.news} news · ${stats.events} events`, icon: Globe },
        { label: 'Storage', value: formatBytes(stats.storageBytes), hint: `${stats.media} media files`, icon: HardDrive },
      ]
    : []

  return (
    <div>
      <AdminHeader title="Platform overview" description="Schools, domains, and accounts on this deployment. School admins cannot see this console." />
      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">{card.label}</p>
              <card.icon className="h-4 w-4 text-gold-dark" />
            </div>
            <p className="mt-2 font-display text-3xl font-bold text-brand">{card.value}</p>
            <p className="mt-1 text-xs text-muted">{card.hint}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-display font-bold text-brand">School status</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {Object.entries(stats?.schoolsByStatus || {}).map(([status, count]) => (
              <li key={status} className="flex items-center justify-between">
                <StatusBadge status={status} />
                <span className="font-medium text-brand">{count}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-display font-bold text-brand">System status</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted">Environment</dt><dd className="font-medium text-brand">{system?.environment || '—'}</dd></div>
            <div><dt className="text-muted">Platform domain</dt><dd className="font-medium text-brand">{system?.platformDomain || '—'}</dd></div>
            <div><dt className="text-muted">Storage</dt><dd className="font-medium text-brand">{system?.storageProvider || '—'}</dd></div>
            <div><dt className="text-muted">API</dt><dd className="font-medium text-brand">{system?.services?.api || (stats ? 'HEALTHY' : 'Loading…')}</dd></div>
          </dl>
          <Link to="/platform/system" className="mt-6 inline-block text-sm font-semibold text-brand">Open system health →</Link>
        </section>
      </div>
    </div>
  )
}
