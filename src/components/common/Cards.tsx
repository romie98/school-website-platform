import type { NewsArticle, SchoolEvent, StaffMember, Department, ResourceItem, QuickLink } from '@/types'
import { TenantLink as Link } from '@/components/common/TenantLink'
import { ArrowRight, FileText, Download, Clock, MapPin } from 'lucide-react'
import { formatDate, formatShortDate } from '@/utils'
import { NamedIcon } from '@/components/common/NamedIcon'
import { isHeritageTheme } from '@/themes/heritage'
import { useTenant } from '@/contexts/TenantContext'

export function NewsCard({ article, featured = false }: { article: NewsArticle; featured?: boolean }) {
  const { theme } = useTenant()
  const heritage = isHeritageTheme(theme)
  return (
    <article className={`group overflow-hidden bg-white ${heritage ? 'border border-gold/35' : 'rounded-lg border border-brand/10 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-md'} ${featured ? 'md:grid md:grid-cols-2' : ''}`}>
      <div className={`overflow-hidden ${featured ? 'min-h-56' : 'h-44'}`}>
        <img src={article.featuredImage?.url || article.image} alt={article.imageAlt || article.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
      </div>
      <div className="flex flex-col p-5">
        <p className={`text-xs font-semibold uppercase tracking-wider ${heritage ? 'tracking-[0.18em] text-gold-dark' : 'text-brand-mid'}`}>{article.category}</p>
        <h3 className={`mt-2 font-display text-lg text-brand ${heritage ? 'font-semibold' : 'font-bold'}`}>
          <Link to={`/news/${article.slug}`} className={`break-words ${heritage ? 'hover:text-gold-dark' : 'hover:text-brand-mid'}`}>
            {article.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">{article.excerpt}</p>
        <div className="mt-4 flex items-center justify-between text-sm">
          <time dateTime={article.date} className="text-muted">
            {formatDate(article.date)}
          </time>
          <Link to={`/news/${article.slug}`} className={`inline-flex items-center gap-1 font-semibold ${heritage ? 'uppercase tracking-[0.14em] text-gold-dark' : 'text-brand'}`}>
            Read more <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  )
}

export function EventCard({ event }: { event: SchoolEvent }) {
  const { theme } = useTenant()
  const heritage = isHeritageTheme(theme)
  const d = formatShortDate(event.date)
  return (
    <article className={`flex gap-4 bg-white p-4 ${heritage ? 'border-b border-gold/30' : 'rounded-lg border border-brand/10 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5'}`}>
      <div className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center ${heritage ? 'bg-gold text-brand-dark' : 'rounded-md bg-brand text-white'}`}>
        <span className={`text-[10px] font-semibold tracking-wider ${heritage ? 'uppercase text-brand-dark' : 'text-gold'}`}>{d.month}</span>
        <span className="font-display text-xl font-bold leading-none">{d.day}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-mid">{event.category}</p>
        <h3 className="font-display text-base font-bold text-brand">
          <Link to={`/events/${event.slug}`} className="break-words hover:underline">
            {event.title}
          </Link>
        </h3>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-gold-dark" /> {event.startTime}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-gold-dark" /> {event.location}
          </span>
        </p>
      </div>
    </article>
  )
}

export function StaffCard({ person }: { person: StaffMember }) {
  return (
    <article className="overflow-hidden rounded-lg border border-brand/10 bg-white text-center shadow-[var(--shadow-card)]">
      <div className="aspect-[4/5] overflow-hidden bg-brand-soft">
        <img src={person.photoMedia?.url || person.photo} alt={`Portrait of ${person.name}`} className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="p-4">
        <h3 className="break-words font-display text-base font-bold text-brand">{person.name}</h3>
        <p className="text-sm font-medium text-gold-dark">{person.role}</p>
        <p className="text-xs text-muted">{person.department}</p>
        {person.email && (
          <a href={`mailto:${person.email}`} className="mt-2 inline-block break-all text-xs text-brand hover:underline">
            {person.email}
          </a>
        )}
        {person.bio && (
          <p className="mt-2 line-clamp-5 text-xs leading-relaxed text-muted">
            {person.bio.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
          </p>
        )}
      </div>
    </article>
  )
}

export function DepartmentCard({ department }: { department: Department }) {
  return (
    <Link
      to={`/academics/departments/${department.slug}`}
      className="group overflow-hidden rounded-lg border border-brand/10 bg-white shadow-[var(--shadow-card)] transition hover:-translate-y-0.5"
    >
      <div className="h-36 overflow-hidden">
        <img src={department.imageMedia?.url || department.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg font-bold text-brand">{department.name}</h3>
        <p className="mt-2 line-clamp-3 text-sm text-muted">{department.overview.replace(/<[^>]+>/g, ' ')}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
          View department <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  )
}

export function ResourceCard({ resource }: { resource: ResourceItem }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-brand/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-brand-soft p-2 text-brand">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-medium text-brand">{resource.name}</h3>
          <p className="text-xs text-muted">
            {resource.category} · {resource.fileType} · {resource.size} · {formatDate(resource.uploadedAt)}
          </p>
        </div>
      </div>
      <a
        href={resource.file?.url || resource.href}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark"
      >
        <Download className="h-4 w-4" /> Download
      </a>
    </article>
  )
}

export function QuickLinkCard({ item }: { item: QuickLink }) {
  return (
    <Link
      to={item.href}
      className="group flex items-center gap-4 rounded-lg bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-brand/10 transition hover:-translate-y-0.5 hover:ring-gold md:flex-col md:items-start md:p-6"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-brand text-gold">
        <NamedIcon name={item.icon} className="h-6 w-6" />
      </span>
      <span>
        <span className="block font-display text-base font-bold text-brand">{item.title}</span>
        <span className="mt-1 block text-sm text-muted">{item.description}</span>
      </span>
    </Link>
  )
}
