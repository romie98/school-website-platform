import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { TenantLink as Link } from '@/components/common/TenantLink'
import type { Announcement } from '@/types'

export function AnnouncementBar({ announcement }: { announcement?: Announcement }) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!announcement) return
    setHidden(sessionStorage.getItem(`bahs-ann-${announcement.id}`) === '1')
  }, [announcement])

  if (!announcement?.active || hidden) return null

  const dismiss = () => {
    sessionStorage.setItem(`bahs-ann-${announcement.id}`, '1')
    setHidden(true)
  }

  return (
    <div className="bg-gold text-brand-dark">
      <div className="page-wrap flex items-center justify-between gap-3 py-2 text-sm font-medium">
        <p className="flex-1">
          {announcement.message}{' '}
          {announcement.linkHref && (
            <Link to={announcement.linkHref} className="underline underline-offset-2">
              {announcement.linkLabel ?? 'Learn more'}
            </Link>
          )}
        </p>
        {announcement.dismissible && (
          <button type="button" onClick={dismiss} className="shrink-0 rounded p-1 hover:bg-brand/10" aria-label="Dismiss announcement">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
