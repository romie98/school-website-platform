import { useParams } from 'react-router-dom'
import { TenantLink as Link } from '@/components/common/TenantLink'
import { PageMeta } from '@/components/common/PageMeta'
import { PageHero, EmptyState } from '@/components/common/PageBits'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { SectionHeader } from '@/components/common/SectionHeader'
import { useContent } from '@/hooks/useContent'
import { photos } from '@/data/images'
import { mediaUrl } from '@/services/normalize'

export function SchoolLife() {
  const { clubs, sports, houses, branding } = useContent()
  const clubCount = clubs.filter((c) => c.active).length
  const sportCount = sports.filter((s) => s.active).length
  return (
    <>
      <PageMeta title="School Life" description={`Clubs, sport, houses and student life at ${branding.schoolName}.`} path="/school-life" />
      <PageHero title="School Life" subtitle="Sport, clubs, houses, leadership and service." image={photos.leadership} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'School Life' }]} />
        <p className="max-w-3xl text-muted">Learning at {branding.schoolName} is not confined to the timetable. Students are expected to join a club or team, support their house, and take part in the public life of the school.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { title: 'Clubs & Societies', href: '/school-life/clubs', n: `${clubCount} groups`, img: photos.music },
            { title: 'Sports', href: '/school-life/sports', n: `${sportCount} programmes`, img: photos.football },
            { title: 'Houses', href: '/school-life/houses', n: `${houses.length} houses`, img: photos.sportsTrack },
          ].map((c) => (
            <Link key={c.title} to={c.href} className="group relative overflow-hidden rounded-lg">
              <img src={c.img} alt="" className="h-56 w-full object-cover transition group-hover:scale-105" />
              <div className="absolute inset-0 bg-brand/55" />
              <span className="absolute bottom-4 left-4 text-white">
                <span className="block font-display text-xl font-bold">{c.title}</span>
                <span className="text-sm text-gold">{c.n}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

export function Clubs() {
  const { clubs, branding } = useContent()
  const visible = clubs.filter((c) => c.active)
  return (
    <>
      <PageMeta title="Clubs & Societies" description={`Extracurricular organisations at ${branding.schoolName}.`} path="/school-life/clubs" />
      <PageHero title="Clubs & Societies" image={photos.community} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'School Life', href: '/school-life' }, { label: 'Clubs' }]} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((club) => (
            <Link key={club.id} to={`/school-life/clubs/${club.slug}`} className="overflow-hidden rounded-lg border border-brand/10 bg-white shadow-[var(--shadow-card)]">
              <img src={mediaUrl(club.imageMedia) || mediaUrl(club.image)} alt="" className="h-40 w-full object-cover" />
              <div className="p-5">
                <h2 className="font-display text-lg font-bold text-brand">{club.name}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-muted">{club.description.replace(/<[^>]+>/g, ' ')}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

export function ClubDetail() {
  const { slug } = useParams()
  const { clubs } = useContent()
  const club = clubs.find((c) => c.slug === slug && c.active)
  if (!club) return <div className="page-wrap section-space"><EmptyState title="Club not found" body="This group may have been renamed." /></div>
  return (
    <>
      <PageMeta title={club.name} description={club.description.replace(/<[^>]+>/g, ' ')} path={`/school-life/clubs/${club.slug}`} />
      <PageHero title={club.name} image={club.imageMedia?.url || club.image} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'School Life', href: '/school-life' }, { label: 'Clubs', href: '/school-life/clubs' }, { label: club.name }]} />
        <div className="cms-prose max-w-3xl text-lg text-muted" dangerouslySetInnerHTML={{ __html: club.description }} />
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md bg-cream p-4"><dt className="text-xs uppercase text-muted">Coordinator</dt><dd className="font-medium text-brand">{club.coordinator}</dd></div>
          <div className="rounded-md bg-cream p-4"><dt className="text-xs uppercase text-muted">Meetings</dt><dd className="font-medium text-brand">{club.meeting}</dd></div>
        </dl>
        <section className="mt-10">
          <SectionHeader title="Achievements" />
          <ul className="mt-4 list-disc pl-5 text-muted">{club.achievements.map((a) => <li key={a}>{a}</li>)}</ul>
        </section>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {(club.gallery.length ? club.gallery.map((g) => g.url) : club.photos).map((src) => <img key={src} src={mediaUrl(src)} alt="" className="h-48 w-full rounded-lg object-cover" />)}
        </div>
      </div>
    </>
  )
}

export function Sports() {
  const { sports, branding } = useContent()
  const visible = sports.filter((s) => s.active)
  return (
    <>
      <PageMeta title="Sports" description={`Football, netball, track and field and other ISSA sport at ${branding.schoolName}.`} path="/school-life/sports" />
      <PageHero title="Sports" subtitle="Training, fixtures and school pride on the field." image={photos.football} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'School Life', href: '/school-life' }, { label: 'Sports' }]} />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <Link key={s.id} to={`/school-life/sports/${s.slug}`} className="group relative overflow-hidden rounded-lg">
              <img src={mediaUrl(s.imageMedia) || mediaUrl(s.image)} alt="" className="h-56 w-full object-cover transition group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand via-brand/30 to-transparent" />
              <span className="absolute bottom-4 left-4 font-display text-xl font-bold text-white">{s.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

export function SportDetail() {
  const { slug } = useParams()
  const { sports } = useContent()
  const sport = sports.find((s) => s.slug === slug && s.active)
  if (!sport) return <div className="page-wrap section-space"><EmptyState title="Sport not found" body="Check the sports hub for current programmes." /></div>
  return (
    <>
      <PageMeta title={sport.name} description={sport.overview.replace(/<[^>]+>/g, ' ')} path={`/school-life/sports/${sport.slug}`} />
      <PageHero title={sport.name} image={sport.imageMedia?.url || sport.image} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'School Life', href: '/school-life' }, { label: 'Sports', href: '/school-life/sports' }, { label: sport.name }]} />
        <div className="cms-prose max-w-3xl text-lg text-muted" dangerouslySetInnerHTML={{ __html: sport.overview }} />
        <p className="mt-4 text-sm font-medium text-brand">Coach: {sport.coach}{sport.assistantCoach ? ` · Assistant: ${sport.assistantCoach}` : ''}</p>
        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader title="Teams" />
            <ul className="mt-4 list-disc pl-5 text-muted">{sport.teams.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
          <div>
            <SectionHeader title="Achievements" />
            <ul className="mt-4 space-y-2">{sport.achievements.map((a) => <li key={a} className="border-l-4 border-gold bg-cream px-3 py-2 text-sm">{a}</li>)}</ul>
          </div>
        </div>
        <section className="mt-10">
          <SectionHeader title="Fixtures & results" />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-brand text-white">
                <tr><th className="px-3 py-2">Opponent</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Venue</th><th className="px-3 py-2">Result</th></tr>
              </thead>
              <tbody>
                {sport.fixtures.map((f) => (
                  <tr key={f.opponent + f.date} className="border-b border-brand/10">
                    <td className="px-3 py-2">{f.opponent}</td>
                    <td className="px-3 py-2">{f.date}</td>
                    <td className="px-3 py-2">{f.venue}</td>
                    <td className="px-3 py-2">{f.result ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}

export function Houses() {
  const { houses, branding } = useContent()
  return (
    <>
      <PageMeta title="Houses" description={`House system at ${branding.schoolName}.`} path="/school-life/houses" />
      <PageHero title="Houses" image={photos.sportsTrack} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'School Life', href: '/school-life' }, { label: 'Houses' }]} />
        <p className="max-w-3xl text-muted">Every student belongs to a house. Points are awarded for sport, attendance, service and academic honour rolls, culminating on Sports Day.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {houses.map((h) => (
            <article key={h.id} className="overflow-hidden rounded-lg border border-brand/10 bg-white">
              <div className="h-2" style={{ background: h.colour }} />
              <div className="p-6">
                <h2 className="font-display text-2xl font-bold text-brand">{h.name}</h2>
                <p className="mt-1 text-sm font-medium" style={{ color: h.colour }}>{h.motto}</p>
                <p className="mt-3 text-muted">{h.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  )
}
