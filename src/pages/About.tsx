import { PageMeta } from '@/components/common/PageMeta'
import { PageHero, CTASection } from '@/components/common/PageBits'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { SectionHeader } from '@/components/common/SectionHeader'
import { SchoolCrest } from '@/components/common/SchoolCrest'
import { useContent } from '@/hooks/useContent'
import { photos } from '@/data/images'

export function About() {
  const { about, values, branding } = useContent()
  const name = branding.schoolName
  return (
    <>
      <PageMeta title="About Us" description={`History, mission, vision and values of ${name}.`} path="/about" />
      <PageHero title={`About ${name}`} subtitle={branding.motto} image={photos.campus} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'About' }]} />
        <section>
          <SectionHeader title="School overview" eyebrow="Who we are" />
          {about.overview.map((p) => (
            <p key={p} className="mt-4 max-w-3xl leading-relaxed text-muted">{p}</p>
          ))}
        </section>
        <section className="mt-16">
          <SectionHeader title="Our history" eyebrow={branding.established ? `Since ${branding.established}` : 'Our story'} />
          <img src={photos.corridor} alt="School corridor at Christiana High School" className="mt-6 h-64 w-full rounded-lg object-cover md:h-80" loading="lazy" />
          {about.historyHtml ? (
            <div className="cms-prose mt-8 max-w-3xl text-[17px] leading-8 text-ink" dangerouslySetInnerHTML={{ __html: about.historyHtml }} />
          ) : (
            about.history.map((p) => (
              <p key={p.slice(0, 48)} className="mt-4 max-w-3xl leading-relaxed text-muted">{p}</p>
            ))
          )}
        </section>
        <section className="mt-16 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg bg-brand p-8 text-white">
            <h2 className="font-display text-2xl font-bold text-gold">Mission</h2>
            <p className="mt-4 leading-relaxed text-white/85">{about.mission}</p>
          </div>
          <div className="rounded-lg bg-cream p-8">
            <h2 className="font-display text-2xl font-bold text-brand">Vision</h2>
            <p className="mt-4 leading-relaxed text-muted">{about.vision}</p>
          </div>
        </section>
        <section className="mt-16">
          <SectionHeader title="Motto" />
          <p className="mt-4 font-display text-2xl font-semibold text-brand md:text-3xl">“{about.motto}”</p>
        </section>
        <section className="mt-16">
          <SectionHeader title="Core values" eyebrow="How we work" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <article key={v.title} className="rounded-lg border-t-4 border-gold bg-cream p-5">
                <h3 className="font-display text-lg font-bold text-brand">{v.title}</h3>
                <p className="mt-2 text-sm text-muted">{v.description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="mt-16 grid items-center gap-10 lg:grid-cols-[200px_1fr]">
          <SchoolCrest className="mx-auto h-40 w-40" />
          <div>
            <SectionHeader title="The school crest" />
            {about.crestExplanation.map((p) => (
              <p key={p} className="mt-4 leading-relaxed text-muted">{p}</p>
            ))}
          </div>
        </section>
        <section className="mt-16">
          <SectionHeader title="Achievements" />
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {about.achievements.map((item) => (
              <li key={item} className="rounded-md border-l-4 border-gold bg-cream px-4 py-3 text-sm text-ink">{item}</li>
            ))}
          </ul>
        </section>
        <section className="mt-16">
          <SectionHeader title="Campus" />
          {about.campus.map((p) => (
            <p key={p} className="mt-4 max-w-3xl leading-relaxed text-muted">{p}</p>
          ))}
        </section>
      </div>
      <CTASection title={`Meet the people who lead ${name}`} primary={{ label: 'Administration', href: '/about/administration' }} secondary={{ label: "Principal's Message", href: '/about/principal' }} />
    </>
  )
}
