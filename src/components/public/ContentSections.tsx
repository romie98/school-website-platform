import { TenantLink as Link } from '@/components/common/TenantLink'
import { ArrowRight, FileText, Quote } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { SectionHeader } from '@/components/common/SectionHeader'
import { CTASection } from '@/components/common/PageBits'
import { QuickLinkCard, StaffCard } from '@/components/common/Cards'
import { StatisticsSection } from '@/components/homepage/StatisticsSection'
import { GalleryGrid } from '@/components/common/GalleryGrid'
import { NamedIcon } from '@/components/common/NamedIcon'
import { useContent } from '@/hooks/useContent'
import { useTenant } from '@/contexts/TenantContext'
import { photos } from '@/data/images'
import { isAnnouncementLive } from '@/services/normalize'
import { GoldRule } from '@/components/common/GoldRule'
import { SchoolCrest } from '@/components/common/SchoolCrest'
import type { GalleryItem, ResourceItem, StaffMember, Statistic } from '@/types'

export function QuickLinksSection({ variant = 'default' }: { variant?: string }) {
  const { quickLinks } = useContent()
  if (!quickLinks.length) return null
  if (variant === 'compact') {
    return (
      <section className="relative z-10 -mt-8 pb-2">
        <div className="page-wrap grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {quickLinks.map((item) => (
            <Link key={item.id} to={item.href} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-[var(--shadow-card)] ring-1 ring-brand/10 transition hover:-translate-y-0.5">
              <span className="inline-flex rounded-lg bg-brand-soft p-2 text-gold-dark"><NamedIcon name={item.icon} className="h-4 w-4" /></span>
              <span className="text-sm font-semibold text-brand">{item.title}</span>
            </Link>
          ))}
        </div>
      </section>
    )
  }
  if (variant === 'panels') {
    return (
      <section className="bg-brand">
        <div className="page-wrap grid gap-px bg-gold/30 py-0 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => (
            <Link key={item.id} to={item.href} className="group flex items-center justify-between bg-brand px-6 py-8 transition hover:bg-brand-mid">
              <span>
                <span className="inline-flex text-gold"><NamedIcon name={item.icon} className="h-5 w-5" /></span>
                <span className="mt-3 block font-display text-sm font-semibold uppercase tracking-[0.18em] text-white">{item.title}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-gold transition group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>
    )
  }
  return (
    <section className="relative z-10 -mt-10 pb-4">
      <div className="page-wrap grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {quickLinks.map((item) => <QuickLinkCard key={item.id} item={item} />)}
      </div>
    </section>
  )
}

export function WelcomeSection({ variant }: { variant: string }) {
  const { homepage, branding } = useContent()
  const image = homepage.welcomeImageMedia?.url || homepage.welcomeImage || photos.students
  const split = variant === 'split'
  return (
    <section className="section-space">
      <div className={`page-wrap grid items-center gap-10 ${split ? 'lg:grid-cols-[1.1fr_0.9fr]' : 'lg:grid-cols-2'}`}>
        <div>
          <SectionHeader title={homepage.welcomeTitle} eyebrow="Our school" />
          {homepage.welcomeBody.map((p) => (
            <p key={p} className="mt-4 leading-relaxed text-muted">{p}</p>
          ))}
          <Button href={homepage.welcomeButtonUrl || '/about'} className="mt-6" variant="outline">
            {homepage.welcomeButtonLabel || 'Learn More About Us'}
          </Button>
        </div>
        <div className="relative">
          {!split && <div className="absolute -left-3 -top-3 h-full w-full rounded-lg border-2 border-gold" />}
          <img src={image} alt={`Students at ${branding.schoolName}`} className="relative rounded-lg object-cover" />
        </div>
      </div>
    </section>
  )
}

export function PrincipalSection({ variant }: { variant: string }) {
  const { principal } = useContent()
  const photo = principal.photoMedia?.url || principal.photo || photos.principal
  if (variant === 'asymmetric') {
    return (
      <section className="section-space">
        <div className="page-wrap grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <SectionHeader title="Principal's Welcome" eyebrow="A message from leadership" />
            <p className="mt-5 line-clamp-6 text-lg leading-relaxed text-ink">{principal.excerpt}</p>
            <p className="mt-6 font-display text-xl font-bold text-brand">{principal.name}</p>
            <p className="text-sm text-muted">{principal.title}</p>
            <Link to="/about/principal" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold-dark">
              Read the full message <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -right-4 -top-4 h-full w-full rounded-3xl bg-brand-soft" aria-hidden />
            <img src={photo} alt={principal.name} className="relative aspect-[4/5] w-full rounded-3xl object-cover shadow-[var(--shadow-card)]" />
          </div>
        </div>
      </section>
    )
  }
  if (variant === 'editorial') {
    return (
      <section className="bg-cream section-space">
        <div className="page-wrap grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative border-l-2 border-gold pl-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-dark">From the Principal</p>
            <Quote className="absolute -left-3 top-10 h-10 w-10 text-gold/50" aria-hidden />
            <p className="mt-6 font-display text-2xl leading-relaxed text-brand md:text-3xl">“{principal.excerpt}”</p>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-brand">{principal.name}</p>
            <p className="text-sm text-muted">{principal.title}</p>
            <Link to="/about/principal" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-brand hover:text-gold-dark">
              Read full message <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative">
            <div className="absolute -right-3 -top-3 hidden h-full w-full border border-gold/70 lg:block" />
            <img src={photo} alt={principal.name} className="relative h-[28rem] w-full object-cover" />
          </div>
        </div>
      </section>
    )
  }
  if (variant === 'quote') {
    return (
      <section className="bg-brand section-space text-white">
        <div className="page-wrap max-w-3xl text-center">
          <Quote className="mx-auto h-8 w-8 text-gold" />
          <p className="mt-4 font-display text-2xl leading-relaxed">{principal.excerpt}</p>
          <p className="mt-6 font-bold">{principal.name}</p>
          <p className="text-sm text-gold">{principal.title}</p>
          <Link to="/about/principal" className="mt-4 inline-flex items-center gap-1 font-semibold text-gold">
            Read full message <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    )
  }
  if (variant === 'card') {
    return (
      <section className="section-space">
        <div className="page-wrap">
          <article className="grid items-center gap-8 rounded-lg bg-white p-6 shadow-[var(--shadow-card)] lg:grid-cols-[220px_1fr]">
            <img src={photo} alt={principal.name} className="h-64 w-full rounded-lg object-cover" />
            <div>
              <SectionHeader title="Principal's Welcome" />
              <p className="mt-4 text-lg text-ink">{principal.excerpt}</p>
              <p className="mt-4 font-display font-bold text-brand">{principal.name}</p>
              <Link to="/about/principal" className="mt-3 inline-flex items-center gap-1 font-semibold text-brand">
                Read Principal's Message <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        </div>
      </section>
    )
  }
  return (
    <section className="bg-cream section-space">
      <div className="page-wrap grid items-center gap-10 lg:grid-cols-[280px_1fr]">
        <img src={photo} alt={principal.name} className="mx-auto h-72 w-56 rounded-lg object-cover shadow-[var(--shadow-card)]" />
        <div>
          <SectionHeader title="Principal's Welcome" eyebrow="From the Principal's office" />
          <Quote className="mt-6 h-8 w-8 text-gold" aria-hidden />
          <p className="mt-2 text-lg leading-relaxed text-ink">{principal.excerpt}</p>
          <p className="mt-4 font-display font-bold text-brand">{principal.name}</p>
          <p className="text-sm text-muted">{principal.title}</p>
          <Link to="/about/principal" className="mt-4 inline-flex items-center gap-1 font-semibold text-brand">
            Read Principal's Message <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

export function AnnouncementSection({ variant }: { variant: string }) {
  const { announcements } = useContent()
  const items = announcements.filter((a) => isAnnouncementLive(a)).slice(0, 4)
  if (!items.length) return null
  if (variant === 'cards') {
    return (
      <section className="section-space">
        <div className="page-wrap grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-brand/10 bg-white p-5">
              <p className="text-xs font-semibold uppercase text-gold-dark">{item.type || 'Notice'}</p>
              <h3 className="mt-2 font-display text-lg font-bold text-brand">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.message}</p>
            </article>
          ))}
        </div>
      </section>
    )
  }
  const first = items[0]
  return (
    <section className="bg-gold">
      <div className="page-wrap py-4 text-center">
        <p className="font-display font-bold text-brand-dark">{first.title}</p>
        <p className="text-sm text-brand-dark/80">{first.message}</p>
      </div>
    </section>
  )
}

export function StatisticsBlock({ items, variant }: { items: Statistic[]; variant: string }) {
  if (variant === 'band') {
    return (
      <section className="bg-brand">
        <div className="page-wrap section-space">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">Excellence in numbers</p>
          <GoldRule className="mx-auto mt-4" light />
          <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
            {items.map((stat) => (
              <div key={stat.id} className="text-center">
                <p className="font-display text-4xl font-semibold text-gold md:text-5xl">{stat.prefix}{stat.value}{stat.suffix}</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-white/75">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }
  if (variant === 'light') {
    return (
      <section className="bg-cream">
        <div className="page-wrap section-space grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {items.map((stat) => (
            <div key={stat.id} className="text-center">
              <p className="font-display text-4xl font-extrabold text-brand">{stat.prefix}{stat.value}{stat.suffix}</p>
              <p className="mt-2 text-sm font-medium uppercase tracking-wide text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    )
  }
  return <StatisticsSection items={items} />
}

export function AcademicsSection({ variant = 'default' }: { variant?: string }) {
  const { programmes } = useContent()
  const items = programmes.filter((p) => p.active).sort((a, b) => a.displayOrder - b.displayOrder)
  if (!items.length) return null
  if (variant === 'levels') {
    return (
      <section className="section-space">
        <div className="page-wrap">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-dark">Academic excellence</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[0.06em] text-brand md:text-4xl">Preparing students for excellence in Jamaica and beyond</h2>
          <GoldRule className="mt-5" />
          <div className="mt-10 grid gap-px bg-gold/40 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <Link key={p.id} to={p.href || '/academics'} className="bg-white p-8 transition hover:bg-cream">
                <h3 className="font-display text-xl font-semibold tracking-[0.08em] text-brand">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{p.summary}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-dark">
                  Explore <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    )
  }
  return (
    <section className="section-space">
      <div className="page-wrap">
        <SectionHeader title="Academic Programmes" eyebrow="Learning pathways" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => (
            <Link key={p.id} to={p.href} className="rounded-lg border border-brand/10 bg-white p-5 shadow-[var(--shadow-card)]">
              <span className="inline-flex rounded-md bg-brand p-2 text-gold"><NamedIcon name={p.icon} className="h-5 w-5" /></span>
              <h3 className="mt-3 font-display text-lg font-bold text-brand">{p.title}</h3>
              <p className="mt-2 text-sm text-muted">{p.summary}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export function SchoolLifeSection({ variant = 'default' }: { variant?: string }) {
  const { clubs, sports, gallery } = useContent()
  const items = [
    { title: 'Sports', href: '/school-life/sports', image: sports[0]?.image || photos.football, body: 'Teams, fixtures and healthy competition.' },
    { title: 'Clubs & Societies', href: '/school-life/clubs', image: clubs[0]?.image || photos.music, body: 'Interests, leadership and service beyond class.' },
    { title: 'Student Leadership', href: '/students', image: gallery[0]?.src || photos.assembly, body: 'Opportunities to lead and represent the school.' },
  ]
  if (variant === 'split') {
    const feature = items[0]
    return (
      <section className="bg-cream section-space">
        <div className="page-wrap">
          <SectionHeader title="Student Life" eyebrow="Beyond the classroom" />
          <div className="mt-10 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Link to={feature.href} className="group relative isolate min-h-[22rem] overflow-hidden rounded-2xl">
              <img src={feature.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand/40 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-6">
                <span className="block font-display text-2xl font-bold text-white">{feature.title}</span>
                <span className="mt-2 block text-sm text-white/80">{feature.body}</span>
              </span>
            </Link>
            <div className="grid gap-4">
              {items.slice(1).map((item) => (
                <Link key={item.title} to={item.href} className="group relative isolate min-h-[10.5rem] overflow-hidden rounded-2xl">
                  <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-brand/55" />
                  <span className="absolute inset-x-0 bottom-0 p-5 font-display text-lg font-bold text-white">{item.title}</span>
                </Link>
              ))}
            </div>
          </div>
          <Link to="/school-life" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold-dark">
            Discover Student Life <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    )
  }
  return (
    <section className="bg-cream section-space">
      <div className="page-wrap">
        <SectionHeader title="School Life" eyebrow="Beyond the classroom" />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {items.map((item) => (
            <Link key={item.title} to={item.href} className="group relative isolate overflow-hidden rounded-lg">
              <img src={item.image} alt="" className="h-52 w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-brand/55" />
              <span className="absolute inset-x-0 bottom-0 p-4 font-display text-lg font-bold text-white">{item.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export function GallerySection({ items, variant }: { items: GalleryItem[]; variant: string }) {
  const { branding } = useContent()
  if (!items.length) return null
  if (variant === 'masonry') {
    const shown = items.slice(0, 6)
    return (
      <section className="bg-cream section-space">
        <div className="page-wrap">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-dark">Campus life</p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[0.06em] text-brand md:text-4xl">Life at {branding.schoolName.replace(/ School$/i, '')}</h2>
            </div>
            <Link to="/gallery" className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">View gallery</Link>
          </div>
          <div className="grid auto-rows-[140px] grid-cols-2 gap-2 sm:auto-rows-[180px] md:grid-cols-4 md:auto-rows-[200px]">
            {shown.map((item, index) => (
              <img
                key={item.id}
                src={item.src}
                alt={item.alt}
                loading="lazy"
                className={`h-full w-full object-cover ${index === 0 ? 'col-span-2 row-span-2' : ''} ${index === 5 ? 'md:col-span-2' : ''}`}
              />
            ))}
          </div>
        </div>
      </section>
    )
  }
  const shown = variant === 'featured' ? items.slice(0, 4) : items.slice(0, 8)
  return (
    <section className="section-space">
      <div className="page-wrap">
        <div className="mb-8 flex items-end justify-between">
          <SectionHeader title="Gallery" eyebrow="Campus life" />
          <Link to="/gallery" className="font-semibold text-brand">View gallery</Link>
        </div>
        <GalleryGrid items={shown} showFilters={false} />
      </div>
    </section>
  )
}

export function StaffSection({ people, variant }: { people: StaffMember[]; variant: string }) {
  const shown = variant === 'featured' ? people.filter((p) => p.featured || p.administration).slice(0, 4) : people.slice(0, 8)
  if (!shown.length) return null
  return (
    <section className="bg-cream section-space">
      <div className="page-wrap">
        <div className="mb-8 flex items-end justify-between">
          <SectionHeader title="Our Staff" eyebrow="People" />
          <Link to="/about/staff" className="font-semibold text-brand">Staff directory</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((person) => <StaffCard key={person.id} person={person} />)}
        </div>
      </div>
    </section>
  )
}

export function DocumentsSection({ items, variant }: { items: ResourceItem[]; variant: string }) {
  if (!items.length) return null
  return (
    <section className="section-space">
      <div className="page-wrap">
        <div className="mb-8 flex items-end justify-between">
          <SectionHeader title="Resources" eyebrow="Downloads" />
          <Link to="/resources" className="font-semibold text-brand">All resources</Link>
        </div>
        <div className={variant === 'cards' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-3'}>
          {items.slice(0, 6).map((item) => (
            <article key={item.id} className="flex items-start gap-3 rounded-lg bg-white p-4 shadow-[var(--shadow-card)]">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-gold-dark" aria-hidden />
              <div>
                <h3 className="font-display font-bold text-brand">{item.name}</h3>
                <p className="text-sm text-muted">{item.category}</p>
                {item.href ? <Link to={item.href} className="mt-2 inline-block text-sm font-semibold text-gold-dark">View</Link> : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function AchievementsSection() {
  const { about } = useContent()
  if (!about.achievements.length) return null
  return (
    <section className="bg-cream section-space">
      <div className="page-wrap">
        <SectionHeader title="Achievements" eyebrow="Celebrating our community" />
        <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {about.achievements.map((item) => (
            <li key={item} className="rounded-2xl border border-brand/10 bg-white p-5 shadow-[var(--shadow-card)]">
              <p className="text-sm leading-relaxed text-ink">{item}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function ContactBlock({ variant }: { variant: string }) {
  const { contact } = useContent()
  return (
    <section className="bg-cream section-space">
      <div className={`page-wrap grid gap-8 ${variant === 'split' ? 'lg:grid-cols-2' : ''}`}>
        <div>
          <SectionHeader title="Visit us" eyebrow="Contact" />
          <p className="mt-4 text-muted">{(contact.addressLines ?? []).join(', ')}</p>
          <p className="mt-2 text-muted">{(contact.phone ?? []).join(' · ')}</p>
          <Button href="/contact" className="mt-6">Contact details</Button>
        </div>
        {variant === 'split' && contact.mapEmbedUrl ? (
          <iframe title="Map" src={contact.mapEmbedUrl} className="h-64 w-full rounded-lg" />
        ) : null}
      </div>
    </section>
  )
}

export function CallToAction({ variant }: { variant: string }) {
  const { branding, homepage } = useContent()
  const { school } = useTenant()
  const name = branding.schoolName || school?.name || 'our school'
  if (variant === 'connect') {
    return (
      <section className="section-space">
        <div className="page-wrap overflow-hidden rounded-3xl bg-brand px-8 py-12 text-white md:px-12">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Stay connected</p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold md:text-4xl">Stay connected with {name}</h2>
          <p className="mt-4 max-w-xl text-white/80">Get in touch with the school office or follow official channels as they are published.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/contact">Contact School</Button>
            <Button href="/news" variant="ghost">Latest News</Button>
          </div>
        </div>
      </section>
    )
  }
  if (variant === 'split') {
    return (
      <section className="section-space">
        <div className="page-wrap grid items-center gap-8 rounded-lg bg-brand p-8 text-white lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold">Discover {name}</h2>
            <p className="mt-3 text-white/80">Explore programmes, admissions and campus life.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href={homepage.secondaryButtonUrl || '/admissions'}>{homepage.secondaryButtonLabel || 'Admissions'}</Button>
            <Button href="/contact" variant="ghost">Contact</Button>
          </div>
        </div>
      </section>
    )
  }
  return (
    <CTASection
      title={`Discover What ${name} Has to Offer`}
      body="Speak with Admissions or explore our programmes online."
      primary={{ label: homepage.secondaryButtonLabel || 'Admissions', href: homepage.secondaryButtonUrl || '/admissions' }}
      secondary={{ label: 'Contact Us', href: '/contact' }}
    />
  )
}

export function IdentityStrip({ variant = 'default' }: { variant?: string }) {
  const { branding, contact } = useContent()
  const established = branding.established
  const place = (contact.addressLines ?? []).at(-1) || (contact.addressLines ?? []).slice(-2).join(', ')
  const items = [
    established ? `Founded ${established}` : null,
    place || null,
    branding.motto || null,
  ].filter(Boolean) as string[]
  if (!items.length) return null
  const gold = variant === 'gold'
  return (
    <section className={gold ? 'bg-gold text-brand-dark' : 'bg-brand text-gold'}>
      <div className="page-wrap flex flex-col items-center justify-center gap-3 py-4 text-center sm:flex-row sm:gap-10">
        {items.map((item, index) => (
          <span key={item} className="flex items-center gap-10">
            {index > 0 ? <span className={`hidden h-3 w-px sm:block ${gold ? 'bg-brand-dark/30' : 'bg-gold/40'}`} /> : null}
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em]">{item}</span>
          </span>
        ))}
      </div>
    </section>
  )
}

export function MottoSection() {
  const { branding } = useContent()
  const { school } = useTenant()
  const motto = branding.motto
  if (!motto) return null
  const translation = branding.mottoTranslation
  const crest = branding.crestMedia?.url || branding.crestUrl || school?.logoUrl
  return (
    <section className="relative isolate overflow-hidden bg-brand py-24 text-center">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.07]">
        <SchoolCrest className="h-80 w-80" src={crest} />
      </div>
      <div className="page-wrap relative">
        <p className="font-display text-4xl font-semibold tracking-[0.18em] text-gold md:text-6xl">{motto}</p>
        {translation ? <p className="mt-6 font-display text-xl italic text-cream md:text-2xl">“{translation}”</p> : null}
        <GoldRule className="mx-auto mt-8 w-40" light />
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/70">{branding.schoolName}</p>
      </div>
    </section>
  )
}
