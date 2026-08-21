import { TenantLink as Link } from '@/components/common/TenantLink'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbsProps {
  items: { label: string; href?: string }[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link to="/" className="hover:text-brand">
            Home
          </Link>
        </li>
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            {item.href ? (
              <Link to={item.href} className="hover:text-brand">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-brand">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
