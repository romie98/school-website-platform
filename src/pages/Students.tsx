import { TenantLink as Link } from '@/components/common/TenantLink'
import { PageMeta } from '@/components/common/PageMeta'
import { PageHero } from '@/components/common/PageBits'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { SectionHeader } from '@/components/common/SectionHeader'
import { photos } from '@/data/images'
import { useContent } from '@/hooks/useContent'
import {
  BookOpen, ScrollText, Bell, CalendarRange, FileSpreadsheet, Library,
  FolderOpen, HeartHandshake, Users, Landmark, MonitorPlay, LogIn,
} from 'lucide-react'

const cards = [
  { title: 'Student Handbook', href: '/resources', icon: BookOpen, note: 'Rules, routines and expectations' },
  { title: 'School Rules', href: '/resources', icon: ScrollText, note: 'Code of conduct' },
  { title: 'Bell Schedule', href: '/students#bell', icon: Bell, note: 'Daily periods' },
  { title: 'Timetables', href: '/resources', icon: CalendarRange, note: 'Class schedules' },
  { title: 'Examination Timetables', href: '/resources', icon: FileSpreadsheet, note: 'Mocks and CXC' },
  { title: 'Booklists', href: '/resources', icon: Library, note: 'By grade' },
  { title: 'Forms', href: '/resources', icon: FolderOpen, note: 'Student forms' },
  { title: 'Guidance & Counselling', href: '/contact', icon: HeartHandshake, note: 'Support services' },
  { title: 'Clubs', href: '/school-life/clubs', icon: Users, note: 'Societies and service' },
  { title: 'Student Leadership', href: '/school-life/clubs/student-council', icon: Landmark, note: 'Student Council' },
  { title: 'Online Learning', href: '/resources', icon: MonitorPlay, note: 'Digital resources' },
  { title: 'Student Portal', href: '/students', icon: LogIn, note: 'Coming via the CMS' },
]

export function Students() {
  const { branding } = useContent()
  return (
    <>
      <PageMeta title="Students" description={`Student handbook, timetables, clubs and resources at ${branding.schoolName}.`} path="/students" />
      <PageHero title="Student Hub" subtitle="Tools and information for current students." image={photos.collaboration} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'Students' }]} />
        <SectionHeader title="Quick access" description="A dashboard of the resources students use most." />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.title} to={card.href} className="flex gap-4 rounded-lg border border-brand/10 bg-white p-4 shadow-[var(--shadow-card)] hover:border-gold">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand text-gold">
                <card.icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-display font-bold text-brand">{card.title}</span>
                <span className="text-sm text-muted">{card.note}</span>
              </span>
            </Link>
          ))}
        </div>
        <section id="bell" className="mt-16 scroll-mt-28">
          <SectionHeader title="Bell schedule" />
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead className="bg-brand text-white">
                <tr><th className="px-4 py-2">Period</th><th className="px-4 py-2">Time</th></tr>
              </thead>
              <tbody>
                {[
                  ['Homeroom', '8:00 – 8:15 a.m.'],
                  ['Period 1', '8:15 – 8:55 a.m.'],
                  ['Period 2', '8:55 – 9:35 a.m.'],
                  ['Period 3', '9:35 – 10:15 a.m.'],
                  ['Break', '10:15 – 10:30 a.m.'],
                  ['Period 4', '10:30 – 11:10 a.m.'],
                  ['Period 5', '11:10 – 11:50 a.m.'],
                  ['Lunch', '11:50 a.m. – 12:30 p.m.'],
                  ['Period 6', '12:30 – 1:10 p.m.'],
                  ['Period 7', '1:10 – 1:50 p.m.'],
                  ['Period 8', '1:50 – 2:30 p.m.'],
                ].map(([p, t]) => (
                  <tr key={p} className="border-b border-brand/10">
                    <td className="px-4 py-2 font-medium text-brand">{p}</td>
                    <td className="px-4 py-2 text-muted">{t}</td>
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
