import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { TenantLink as Link } from '@/components/common/TenantLink'
import { Clock, MapPin, CalendarDays } from 'lucide-react'
import { PageMeta } from '@/components/common/PageMeta'
import { PageHero, FilterTabs, EmptyState, Pagination } from '@/components/common/PageBits'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { EventCard } from '@/components/common/Cards'
import { useContent } from '@/hooks/useContent'
import { photos } from '@/data/images'
import { eventCategories, formatDate, formatShortDate, paginate } from '@/utils'
import type { SchoolEvent } from '@/types'
import { isEventPublic } from '@/services/normalize'
import { isAdminAuthenticated } from '@/services/content'
import { useTenant } from '@/contexts/TenantContext'
import { isHeritageTheme } from '@/themes/heritage'

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1)
  const start = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells: Array<number | null> = [...Array(start).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  while (cells.length % 7) cells.push(null)
  return cells
}

export function Events() {
  const { events, branding } = useContent()
  const [view, setView] = useState<'month' | 'list'>('month')
  const [cat, setCat] = useState('All')
  const [page, setPage] = useState(1)
  const [cursor, setCursor] = useState(() => new Date(2026, 7, 1))
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const publicEvents = events.filter((e) => isEventPublic(e))
  const filtered = useMemo(
    () => publicEvents.filter((e) => cat === 'All' || e.category === cat),
    [publicEvents, cat],
  )
  const listPaged = paginate(filtered, page, 8)
  const byDay = (day: number) =>
    filtered.filter((e) => {
      const d = new Date(e.date)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })

  return (
    <>
      <PageMeta title="Events & Calendar" description={`School calendar for ${branding.schoolName} — examinations, PTA, sport and ceremonies.`} path="/events" />
      <PageHero title="Events & Calendar" image={photos.assembly} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'Events' }]} />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <FilterTabs options={['All', ...eventCategories]} value={cat} onChange={(v) => { setCat(v); setPage(1) }} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setView('month')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === 'month' ? 'bg-brand text-white' : 'bg-cream text-brand'}`}>Month</button>
            <button type="button" onClick={() => setView('list')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === 'list' ? 'bg-brand text-white' : 'bg-cream text-brand'}`}>List</button>
          </div>
        </div>

        {view === 'month' ? (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <button type="button" className="text-sm font-medium text-brand" onClick={() => setCursor(new Date(year, month - 1, 1))}>Previous</button>
              <h2 className="font-display text-xl font-bold text-brand">
                {cursor.toLocaleDateString('en-JM', { month: 'long', year: 'numeric' })}
              </h2>
              <button type="button" className="text-sm font-medium text-brand" onClick={() => setCursor(new Date(year, month + 1, 1))}>Next</button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-semibold uppercase tracking-wide text-muted">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 border border-brand/10">
              {monthMatrix(year, month).map((day, i) => {
                const items = day ? byDay(day) : []
                return (
                  <div key={i} className="min-h-24 border border-brand/10 p-1 text-left align-top">
                    {day && <p className="text-xs font-semibold text-brand">{day}</p>}
                    {items.map((e) => (
                      <Link key={e.id} to={`/events/${e.slug}`} className="mt-1 block truncate rounded bg-gold/80 px-1 text-[11px] font-medium text-brand-dark">
                        {e.title}
                      </Link>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <EmptyState title="No events" body="Try another category." />
              ) : (
                listPaged.items.map((e) => <EventCard key={e.id} event={e} />)
              )}
            </div>
            <Pagination page={listPaged.page} totalPages={listPaged.totalPages} onChange={setPage} />
          </div>
        )}
      </div>
    </>
  )
}

export function EventDetail() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const { events } = useContent()
  const { theme } = useTenant()
  const preview = params.get('preview') === '1' && isAdminAuthenticated()
  const event = events.find((e: SchoolEvent) => e.slug === slug)
  if (!event || !isEventPublic(event, preview)) return <div className="page-wrap section-space"><EmptyState title="Event not found" body="This event may have been removed." /></div>
  const d = formatShortDate(event.date)
  const hero = event.featuredImage?.url || event.image
  const heritage = isHeritageTheme(theme)
  return (
    <>
      <PageMeta title={event.title} description={event.description.replace(/<[^>]+>/g, ' ')} path={`/events/${event.slug}`} />
      <PageHero title={event.title} image={hero ?? photos.assembly} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'Events', href: '/events' }, { label: event.title }]} />
        <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
          <div className={`flex h-28 w-28 flex-col items-center justify-center ${heritage ? 'bg-gold text-brand-dark' : 'rounded-lg bg-brand text-white'}`}>
            <span className={`text-xs tracking-widest ${heritage ? 'uppercase' : 'text-gold'}`}>{d.month}</span>
            <span className="font-display text-4xl font-bold">{d.day}</span>
            <span className="text-xs">{d.year}</span>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-mid">{event.category}</p>
            <div className="cms-prose mt-4 max-w-2xl leading-relaxed text-muted" dangerouslySetInnerHTML={{ __html: event.description }} />
            <ul className="mt-6 space-y-2 text-sm text-ink">
              <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gold-dark" /> {formatDate(event.date)}{event.endDate ? ` – ${formatDate(event.endDate)}` : ''}</li>
              {!event.allDay && <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-gold-dark" /> {event.startTime}{event.endTime ? ` – ${event.endTime}` : ''}</li>}
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold-dark" /> {event.location}</li>
            </ul>
            {event.registrationUrl && (
              <a href={event.registrationUrl} className="mt-6 inline-block font-semibold text-brand hover:underline">Register</a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
