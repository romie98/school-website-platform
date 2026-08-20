import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { isHeritageTheme } from '@/themes/heritage'
import { GoldRule } from '@/components/common/GoldRule'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search' }: SearchBarProps) {
  return (
    <label className="relative block">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-brand/15 bg-white py-2.5 pl-10 pr-3 text-sm text-ink shadow-sm outline-none transition focus:border-brand"
      />
    </label>
  )
}

export function FilterTabs({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {options.map((option) => {
        const active = option === value
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active ? 'bg-brand text-white' : 'bg-brand-soft text-brand hover:bg-gold/80 hover:text-brand-dark'
            }`}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
      <button
        type="button"
        className="rounded-md border border-brand/20 px-3 py-1.5 text-sm disabled:opacity-40"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
      >
        Previous
      </button>
      <span className="px-2 text-sm text-muted">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="rounded-md border border-brand/20 px-3 py-1.5 text-sm disabled:opacity-40"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
      >
        Next
      </button>
    </nav>
  )
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-brand/20 bg-cream px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold text-brand">{title}</p>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  )
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid gap-4" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-lg bg-brand-soft" />
      ))}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal aria-labelledby="modal-title">
      <button type="button" className="absolute inset-0 bg-brand-dark/70" aria-label="Close" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 id="modal-title" className="font-display text-xl font-bold text-brand">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

export function PageHero({
  title,
  subtitle,
  image,
  crumbs,
}: {
  title: string
  subtitle?: string
  image: string
  crumbs?: { label: string; href?: string }[]
}) {
  const { theme } = useTenant()
  if (isHeritageTheme(theme)) {
    return (
      <section className="relative isolate min-h-[220px] overflow-hidden md:min-h-[280px]">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-brand/88" />
        <div className="page-wrap relative flex min-h-[220px] flex-col justify-end py-10 md:min-h-[280px] md:py-14">
          <h1 className="max-w-4xl break-words font-display text-3xl font-semibold tracking-[0.08em] text-white md:text-5xl">{title}</h1>
          <GoldRule className="mt-4 w-40" light />
          {crumbs ? (
            <div className="mt-4 text-white/80 [&_a]:text-gold [&_nav]:text-sm [&_span]:text-white/80">
              <Breadcrumbs items={crumbs} />
            </div>
          ) : null}
          {subtitle && <p className="mt-4 max-w-2xl font-display text-lg italic text-cream">{subtitle}</p>}
        </div>
      </section>
    )
  }
  return (
    <section className="relative isolate min-h-[240px] overflow-hidden md:min-h-[300px]">
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-brand/80" />
      <div className="page-wrap relative flex min-h-[240px] flex-col justify-end py-12 md:min-h-[300px]">
        <h1 className="max-w-4xl break-words font-display text-3xl font-bold text-white md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-white/85">{subtitle}</p>}
        <span className="mt-4 block h-1 w-20 bg-gold" />
      </div>
    </section>
  )
}

export function CTASection({
  title,
  body,
  primary,
  secondary,
}: {
  title: string
  body?: string
  primary: { label: string; href: string }
  secondary?: { label: string; href: string }
}) {
  return (
    <section className="bg-brand">
      <div className="page-wrap section-space flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h2 className="font-display text-3xl font-bold text-white md:text-4xl">{title}</h2>
          {body && <p className="mt-3 max-w-xl text-white/80">{body}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to={primary.href}
            className="rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-brand-dark hover:brightness-95"
          >
            {primary.label}
          </Link>
          {secondary && (
            <Link
              to={secondary.href}
              className="rounded-md border border-white/70 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
