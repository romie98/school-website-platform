import { useEffect, useState } from 'react'
import { Button } from '@/components/common/Button'
import { useContent } from '@/hooks/useContent'
import { useTenant } from '@/contexts/TenantContext'
import { SchoolCrest } from '@/components/common/SchoolCrest'
import { GoldRule } from '@/components/common/GoldRule'
import { photos } from '@/data/images'
import { mediaUrl } from '@/services/normalize'

export function HeroSection({ variant }: { variant: string }) {
  const { homepage, branding } = useContent()
  const { school } = useTenant()
  const name = homepage.heroTitle || school?.name || 'Welcome'
  const image = mediaUrl(homepage.heroImageMedia) || mediaUrl(homepage.heroImage) || photos.hero
  const welcome = mediaUrl(homepage.welcomeImageMedia) || mediaUrl(homepage.welcomeImage) || photos.campus
  const slides = [...new Set([image, welcome, photos.assembly].filter(Boolean))]
  const [index, setIndex] = useState(0)
  const crest = mediaUrl(branding.crestMedia) || mediaUrl(branding.crestUrl) || mediaUrl(school?.logoUrl)

  useEffect(() => {
    if (variant !== 'slideshow' || slides.length < 2) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000)
    return () => window.clearInterval(timer)
  }, [variant, slides.length])

  const copy = (
    <>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">{homepage.heroEyebrow}</p>
      <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold text-white md:text-6xl">{name}</h1>
      <p className="mt-4 max-w-xl font-display text-xl text-gold md:text-2xl">{homepage.heroTagline}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button href={homepage.primaryButtonUrl || '/about'}>{homepage.primaryButtonLabel || 'Explore Our School'}</Button>
        <Button href={homepage.secondaryButtonUrl || '/admissions'} variant="ghost">
          {homepage.secondaryButtonLabel || 'Admissions'}
        </Button>
      </div>
    </>
  )

  if (variant === 'split') {
    return (
      <section className="bg-brand">
        <div className="page-wrap grid min-h-[70vh] items-center gap-10 py-16 lg:grid-cols-2">
          <div>{copy}</div>
          <img src={image} alt="" className="h-[28rem] w-full rounded-lg object-cover shadow-[var(--shadow-card)]" />
        </div>
      </section>
    )
  }

  if (variant === 'compact') {
    return (
      <section className="relative isolate min-h-[42vh] overflow-hidden">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-brand/80" />
        <div className="page-wrap relative flex min-h-[42vh] flex-col justify-center py-14">{copy}</div>
      </section>
    )
  }

  if (variant === 'spotlight') {
    return (
      <section className="relative isolate min-h-[58vh] overflow-hidden md:min-h-[78vh]">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/92 via-brand/75 to-brand/25" />
        <div className="page-wrap relative flex min-h-[58vh] flex-col justify-end py-16 md:min-h-[78vh] md:justify-center md:py-24">
          {crest ? <SchoolCrest className="mb-5 h-14 w-14 opacity-90 md:h-16 md:w-16" src={crest} title={`${name} crest`} /> : null}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold">{homepage.heroEyebrow || name}</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold text-white md:text-6xl">{name}</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/90 md:text-2xl">{homepage.heroTagline}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button href={homepage.primaryButtonUrl || '/about'}>{homepage.primaryButtonLabel || 'Explore Our School'}</Button>
            <Button href={homepage.secondaryButtonUrl || '/admissions'} variant="ghost">{homepage.secondaryButtonLabel || 'Admissions'}</Button>
            <Button href="/news" variant="ghost" className="!border-transparent !px-2 text-sm text-gold hover:bg-transparent">Latest News</Button>
          </div>
        </div>
      </section>
    )
  }

  if (variant === 'cinematic') {
    return (
      <section className="relative isolate min-h-[88svh] overflow-hidden md:min-h-[92vh]">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand via-brand/80 to-brand/35" />
        <div className="page-wrap relative flex min-h-[88svh] flex-col items-center justify-center py-20 text-center md:min-h-[92vh]">
          <SchoolCrest className="h-20 w-20 md:h-24 md:w-24" src={crest} title={`${name} crest`} />
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.35em] text-gold">{homepage.heroEyebrow || name}</p>
          <h1 className="mt-3 max-w-4xl font-display text-4xl font-semibold tracking-[0.06em] text-white md:text-6xl lg:text-7xl">{name}</h1>
          <GoldRule className="mx-auto mt-6 w-48" light />
          {homepage.heroTagline ? (
            <p className="mt-6 max-w-2xl font-display text-xl italic text-cream md:text-2xl">{homepage.heroTagline}</p>
          ) : null}
          {branding.motto ? (
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.32em] text-gold">{branding.motto}</p>
          ) : null}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button href={homepage.primaryButtonUrl || '/about'} className="min-w-40 !rounded-sm uppercase tracking-[0.14em]">
              {homepage.primaryButtonLabel || 'Discover'}
            </Button>
            <Button href={homepage.secondaryButtonUrl || '/news'} variant="ghost" className="min-w-40 !rounded-sm border-gold/70 text-gold uppercase tracking-[0.14em] hover:bg-gold/10">
              {homepage.secondaryButtonLabel || 'Latest News'}
            </Button>
          </div>
        </div>
      </section>
    )
  }

  const bg = variant === 'slideshow' ? slides[index] || image : image
  return (
    <section className="relative isolate min-h-[78vh] overflow-hidden">
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand via-brand/75 to-brand/40 md:bg-gradient-to-r md:from-brand/92 md:via-brand/70 md:to-brand/35" />
      <div className="page-wrap relative flex min-h-[78vh] flex-col justify-center py-20">{copy}</div>
      {variant === 'slideshow' && slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((src, i) => (
            <button key={src} type="button" aria-label={`Slide ${i + 1}`} className={`h-2 w-2 rounded-full ${i === index ? 'bg-gold' : 'bg-white/50'}`} onClick={() => setIndex(i)} />
          ))}
        </div>
      )}
    </section>
  )
}
