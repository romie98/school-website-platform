import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { AnnouncementBar } from '@/components/navigation/AnnouncementBar'
import { ScrollToTop } from '@/components/common/ScrollToTop'
import { useContent } from '@/hooks/useContent'
import { isAnnouncementLive } from '@/services/normalize'
import { hydrateContent } from '@/services/content'
import { useTenant } from '@/contexts/TenantContext'
import { DevTenantSwitcher } from '@/components/dev/DevTenantSwitcher'

export function PublicLayout() {
  const { announcements } = useContent()
  const { loading, error, errorStatus, school, theme } = useTenant()
  useEffect(() => {
    if (!loading && school) void hydrateContent()
  }, [loading, school])
  const active = [...announcements]
    .filter((a) => isAnnouncementLive(a) && (a.placement === 'bar' || a.placement === 'both'))
    .sort((a, b) => b.priority - a.priority)[0]

  if (loading) {
    return <div className="flex min-h-svh items-center justify-center text-sm text-muted">Loading school site…</div>
  }
  if (errorStatus === 503) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-2xl font-bold text-brand">Temporarily unavailable</h1>
        <p className="mt-2 max-w-md text-sm text-muted">{error || 'This school website is currently offline for maintenance.'}</p>
        <DevTenantSwitcher />
      </div>
    )
  }
  if (errorStatus === 404 && !school) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-2xl font-bold text-brand">School not found</h1>
        <p className="mt-2 max-w-md text-sm text-muted">This domain is not connected to a school website.</p>
        <DevTenantSwitcher />
      </div>
    )
  }

  return (
    <div className={`flex min-h-svh flex-col ${theme?.theme === 'heritage' || theme?.theme === 'sky' ? 'bg-cream' : 'bg-white'}`}>
      <ScrollToTop />
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[90] focus:bg-gold focus:px-3 focus:py-2 focus:text-brand-dark">
        Skip to content
      </a>
      <AnnouncementBar announcement={active} />
      <Navbar />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <DevTenantSwitcher />
    </div>
  )
}
