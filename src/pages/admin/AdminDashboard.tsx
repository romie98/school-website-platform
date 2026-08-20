import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Newspaper, CalendarDays, Megaphone, Users, FileText } from 'lucide-react'
import { useContent } from '@/hooks/useContent'
import { formatDate } from '@/utils'
import { canManageUsers, isPrincipal } from '@/services/api'
import { RecentApprovals } from '@/pages/admin/approvals/ApprovalPages'
import { auditActionLabel, auditApi, formatAuditWhen, type AuditEvent } from '@/services/audit'

export function AdminDashboard() {
  const content = useContent()
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = content.events.filter((e) => (e.status === 'published' || e.status === 'completed') && e.date >= today).length
  const cards = [
    { label: 'Published news', value: content.news.filter((n) => n.status === 'published').length, icon: Newspaper, to: '/admin/news' },
    { label: 'Upcoming events', value: upcoming, icon: CalendarDays, to: '/admin/events' },
    { label: 'Active announcements', value: content.announcements.filter((a) => a.active).length, icon: Megaphone, to: '/admin/announcements' },
    { label: 'Staff', value: content.staff.length, icon: Users, to: '/admin/staff' },
    { label: 'Documents', value: content.resources.length, icon: FileText, to: '/admin/documents' },
  ]
  const [activity, setActivity] = useState<AuditEvent[]>([])
  const [activityError, setActivityError] = useState('')

  useEffect(() => {
    if (!canManageUsers()) return
    auditApi.list({ page: 1, pageSize: 6 })
      .then((page) => setActivity(page.items))
      .catch(() => setActivityError('Unable to load activity history. Please try again.'))
  }, [])

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Overview of published website content.</p>
      {isPrincipal() && <RecentApprovals />}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="rounded-lg bg-white p-4 shadow-[var(--shadow-card)]">
            <c.icon className="h-5 w-5 text-gold-dark" />
            <p className="mt-3 font-display text-3xl font-bold text-brand">{c.value}</p>
            <p className="text-sm text-muted">{c.label}</p>
          </Link>
        ))}
      </div>
      <section className="mt-10 rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-brand">Recent activity</h2>
          {canManageUsers() && <Link to="/admin/activity" className="text-sm font-medium text-brand hover:underline">Open activity log</Link>}
        </div>
        {activityError ? (
          <p className="mt-4 text-sm text-red-800">{activityError}</p>
        ) : activity.length ? (
          <ul className="mt-4 divide-y divide-brand/10">
            {activity.map((event) => (
              <li key={event.id} className="flex justify-between gap-4 py-3 text-sm">
                <span>
                  <span className="font-medium text-brand">{event.actorName}</span>
                  {' '}{auditActionLabel(event).toLowerCase()}
                  {event.resourceName ? ` · ${event.resourceName}` : ''}
                </span>
                <time className="shrink-0 text-muted">{formatAuditWhen(event.createdAt)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-4 divide-y divide-brand/10">
            {content.activity.map((a) => (
              <li key={a.id} className="flex justify-between gap-4 py-3 text-sm">
                <span>{a.text}</span>
                <time className="shrink-0 text-muted">{formatDate(a.at)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
