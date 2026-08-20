import { Link } from 'react-router-dom'
import { PageMeta } from '@/components/common/PageMeta'
import { PageHero } from '@/components/common/PageBits'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { SectionHeader } from '@/components/common/SectionHeader'
import { EventCard, NewsCard } from '@/components/common/Cards'
import { useContent } from '@/hooks/useContent'
import { photos } from '@/data/images'
import { Bell, Users, CalendarDays, FileText, BookOpen, Phone, GraduationCap, HeartHandshake } from 'lucide-react'

const links = [
  { title: 'School policies', href: '/resources', icon: FileText },
  { title: 'Forms', href: '/resources', icon: BookOpen },
  { title: 'Booklists', href: '/resources', icon: BookOpen },
  { title: 'Calendar', href: '/events', icon: CalendarDays },
  { title: 'Academic information', href: '/academics', icon: GraduationCap },
  { title: 'Guidance', href: '/contact', icon: HeartHandshake },
  { title: 'School contacts', href: '/contact', icon: Phone },
  { title: 'Parent Portal', href: '/parents', icon: Users },
]

export function Parents() {
  const { news, events, announcements, branding } = useContent()
  const notices = news.filter((n) => n.category === 'Announcements' || n.category === 'Academic').slice(0, 3)
  const meetings = events.filter((e) => e.category === 'PTA').slice(0, 3)
  return (
    <>
      <PageMeta title="Parents" description={`Parent notices, PTA information, forms and contacts for ${branding.schoolName} families.`} path="/parents" />
      <PageHero title="Parents" subtitle="Notices, meetings and the information families need during the school year." image={photos.parents} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'Parents' }]} />
        <section className="rounded-lg border-l-4 border-gold bg-cream p-6">
          <div className="flex items-center gap-2 text-brand">
            <Bell className="h-5 w-5 text-gold-dark" />
            <h2 className="font-display text-xl font-bold">Important notices</h2>
          </div>
          <ul className="mt-4 space-y-2">
            {announcements.filter((a) => a.active).map((a) => (
              <li key={a.id} className="text-ink">{a.message}</li>
            ))}
            {notices.map((n) => (
              <li key={n.id}>
                <Link to={`/news/${n.slug}`} className="font-medium text-brand hover:underline">{n.title}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <SectionHeader title="Parent resource centre" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {links.map((l) => (
              <Link key={l.title} to={l.href} className="flex items-center gap-3 rounded-lg border border-brand/10 bg-white p-4 hover:border-gold">
                <l.icon className="h-5 w-5 text-gold-dark" />
                <span className="font-medium text-brand">{l.title}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader title="PTA" description="The Parent-Teacher Association supports student welfare, sport and campus life. Meetings are listed on the calendar." />
            <div className="mt-6 space-y-3">
              {meetings.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          </div>
          <div>
            <SectionHeader title="Recent academic notices" />
            <div className="mt-6 space-y-4">
              {notices.map((n) => <NewsCard key={n.id} article={n} />)}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
