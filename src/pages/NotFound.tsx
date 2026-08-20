import { PageMeta } from '@/components/common/PageMeta'
import { Button } from '@/components/common/Button'
import { useContent } from '@/hooks/useContent'

export function NotFound() {
  const { branding } = useContent()
  return (
    <div className="page-wrap section-space text-center">
      <PageMeta title="Page not found" description={`The requested page could not be found on the ${branding.schoolName} website.`} />
      <p className="text-sm font-semibold uppercase tracking-widest text-gold-dark">404</p>
      <h1 className="mt-2 font-display text-4xl font-bold text-brand">Page not found</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">The page you requested is not on this website. Try the menu, or return home.</p>
      <Button href="/" className="mt-6">Back to home</Button>
    </div>
  )
}
