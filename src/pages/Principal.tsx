import { PageMeta } from '@/components/common/PageMeta'
import { PageHero } from '@/components/common/PageBits'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { useContent } from '@/hooks/useContent'
import { useTenant } from '@/contexts/TenantContext'
import { photos } from '@/data/images'
import { isHeritageTheme } from '@/themes/heritage'

export function Principal() {
  const { principal, branding } = useContent()
  const { theme } = useTenant()
  const name = branding.schoolName
  const heritage = isHeritageTheme(theme)
  return (
    <>
      <PageMeta title="Principal's Message" description={`A welcome from ${principal.name}, ${principal.title} of ${name}.`} path="/about/principal" />
      <PageHero title="Principal's Message" image={photos.lecture} />
      <div className={`section-space ${heritage ? 'bg-cream' : ''}`}>
        <div className="page-wrap">
          <Breadcrumbs items={[{ label: 'About', href: '/about' }, { label: "Principal's Message" }]} />
          <article className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-[240px_1fr]">
            <aside className="text-center">
              <img src={principal.photoMedia?.url || principal.photo} alt={principal.name} className={`mx-auto h-72 w-56 object-cover ${heritage ? '' : 'rounded-lg shadow-[var(--shadow-card)]'}`} />
              <h1 className="mt-4 font-display text-xl font-bold text-brand">{principal.name}</h1>
              <p className="text-sm font-medium text-gold-dark">{principal.title}</p>
              <p className="text-xs text-muted">{name}</p>
            </aside>
            <div className={`border-l-0 border-gold lg:pl-10 ${heritage ? 'lg:border-l-2' : 'lg:border-l-4'}`}>
              {principal.content ? (
                <div className="cms-prose text-[17px] leading-8 text-ink" dangerouslySetInnerHTML={{ __html: principal.content }} />
              ) : principal.paragraphs.map((p) => (
                <p key={p} className="mt-4 text-[17px] leading-8 text-ink first:mt-0">{p}</p>
              ))}
              {principal.signatureImage && <img src={principal.signatureImage.url} alt="" className="mt-6 h-16 object-contain" />}
              <div className="mt-10 border-t border-brand/10 pt-6">
                <p className="font-display text-2xl italic text-brand">{principal.signature}</p>
                <p className="text-sm text-muted">{principal.title}, {name}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </>
  )
}
