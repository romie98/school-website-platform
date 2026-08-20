import { Link } from 'react-router-dom'
import { ArrowRight, Clock, MapPin } from 'lucide-react'
import { SectionHeader } from '@/components/common/SectionHeader'
import { NewsCard, EventCard } from '@/components/common/Cards'
import { formatDate, formatShortDate } from '@/utils'
import { photos } from '@/data/images'
import { useContent } from '@/hooks/useContent'
import type { NewsArticle, SchoolEvent } from '@/types'

export function NewsSection({ articles, variant }: { articles: NewsArticle[]; variant: string }) {
  const { branding } = useContent()
  const items = articles.slice(0, variant === 'list' ? 5 : 6)
  const editorialTitle = `Latest from ${branding.schoolName.replace(/ School$/i, '')}`
  return (
    <section className="section-space">
      <div className="page-wrap">
        <div className="mb-8 flex items-end justify-between gap-4">
          <SectionHeader title={variant === 'editorial' ? editorialTitle : 'Latest News'} eyebrow={variant === 'editorial' ? 'Stories' : 'School stories'} />
          <Link to="/news" className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
            View all news <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {variant === 'list' ? (
          <ul className="divide-y divide-brand/10 rounded-lg bg-white shadow-[var(--shadow-card)]">
            {items.map((article) => (
              <li key={article.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-brand-mid">{article.category}</p>
                  <Link to={`/news/${article.slug}`} className="font-display font-bold text-brand hover:underline">{article.title}</Link>
                </div>
                <time className="text-sm text-muted">{formatDate(article.date)}</time>
              </li>
            ))}
          </ul>
        ) : variant === 'editorial' && items[0] ? (
          <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
            <Link to={`/news/${items[0].slug}`} className="group relative isolate min-h-[22rem] overflow-hidden">
              <img src={items[0].featuredImage?.url || items[0].image || photos.assembly} alt={items[0].imageAlt || items[0].title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand via-brand/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">{items[0].category} · {formatDate(items[0].date)}</p>
                <h3 className="mt-2 font-display text-3xl font-semibold">{items[0].title}</h3>
                <p className="mt-3 line-clamp-3 max-w-xl text-sm text-white/80">{items[0].excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold">Read more <ArrowRight className="h-3.5 w-3.5" /></span>
              </div>
            </Link>
            <div className="flex flex-col divide-y divide-brand/15 border-y border-brand/15">
              {items.slice(1, 4).map((article) => (
                <Link key={article.id} to={`/news/${article.slug}`} className="py-5 hover:text-gold-dark">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-dark">{article.category}</p>
                  <h3 className="mt-1 font-display text-xl font-semibold text-brand">{article.title}</h3>
                  <time className="mt-2 block text-xs text-muted">{formatDate(article.date)}</time>
                </Link>
              ))}
            </div>
          </div>
        ) : variant === 'featured' && items[0] ? (
          <div className="grid gap-6">
            <NewsCard article={items[0]} featured />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.slice(1, 6).map((article) => <NewsCard key={article.id} article={article} />)}
            </div>
          </div>
        ) : variant === 'cards' ? (
          <div className="grid gap-6 md:grid-cols-2">
            {items.map((article) => <NewsCard key={article.id} article={article} />)}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {items.map((article) => <NewsCard key={article.id} article={article} />)}
          </div>
        )}
      </div>
    </section>
  )
}

export function EventsSection({ events, variant }: { events: SchoolEvent[]; variant: string }) {
  if (variant === 'date-list') {
    return (
      <section className="bg-brand section-space text-white">
        <div className="page-wrap">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">Calendar</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[0.06em] md:text-4xl">Upcoming events</h2>
            </div>
            <Link to="/events" className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">View full calendar</Link>
          </div>
          <ul>
            {events.map((event) => {
              const d = formatShortDate(event.date)
              return (
                <li key={event.id} className="flex gap-5 border-t border-gold/25 py-6">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center bg-gold text-brand-dark">
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{d.month}</span>
                    <span className="font-display text-2xl font-semibold leading-none">{d.day}</span>
                  </div>
                  <div>
                    <Link to={`/events/${event.slug}`} className="font-display text-xl font-semibold text-white hover:text-gold">{event.title}</Link>
                    <p className="mt-1 text-sm text-white/70">{event.startTime} · {event.location}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    )
  }
  return (
    <section className="bg-cream section-space">
      <div className="page-wrap">
        <div className="mb-8 flex items-end justify-between">
          <SectionHeader title="Upcoming Events" eyebrow="Calendar" />
          <Link to="/events" className="font-semibold text-brand">View full calendar</Link>
        </div>
        {variant === 'timeline' ? (
          <ol className="relative border-l border-brand/20 pl-6">
            {events.map((event) => (
              <li key={event.id} className="mb-8">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-gold" />
                <p className="text-xs font-semibold uppercase text-brand-mid">{formatDate(event.date)} · {event.startTime}</p>
                <Link to={`/events/${event.slug}`} className="font-display text-lg font-bold text-brand">{event.title}</Link>
                <p className="text-sm text-muted">{event.location}</p>
              </li>
            ))}
          </ol>
        ) : variant === 'list' ? (
          <ul className="space-y-3">
            {events.map((event) => {
              const d = formatShortDate(event.date)
              return (
                <li key={event.id} className="flex items-center gap-4 rounded-lg bg-white p-4">
                  <div className="w-14 text-center">
                    <p className="text-[10px] font-semibold uppercase text-gold-dark">{d.month}</p>
                    <p className="font-display text-xl font-bold text-brand">{d.day}</p>
                  </div>
                  <div>
                    <Link to={`/events/${event.slug}`} className="break-words font-display font-bold text-brand">{event.title}</Link>
                    <p className="text-xs text-muted">{event.startTime} · {event.location}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : variant === 'calendar' ? (
          <div className="grid gap-3">
            {events.map((event) => (
              <article key={event.id} className="grid gap-2 rounded-lg bg-white p-4 md:grid-cols-[8rem_1fr]">
                <p className="font-display font-bold text-brand">{formatDate(event.date)}</p>
                <div>
                  <Link to={`/events/${event.slug}`} className="font-semibold text-brand">{event.title}</Link>
                  <p className="mt-1 flex gap-3 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {event.startTime}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.location}</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        )}
      </div>
    </section>
  )
}
