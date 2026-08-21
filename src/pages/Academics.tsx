import { TenantLink as Link } from '@/components/common/TenantLink'
import { PageMeta } from '@/components/common/PageMeta'
import { PageHero, CTASection } from '@/components/common/PageBits'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { SectionHeader } from '@/components/common/SectionHeader'
import { DepartmentCard } from '@/components/common/Cards'
import { useContent } from '@/hooks/useContent'
import { photos } from '@/data/images'
import { NamedIcon } from '@/components/common/NamedIcon'

export function Academics() {
  const { programmes, departments, branding } = useContent()
  const visibleProgrammes = programmes.filter((p) => p.active).sort((a, b) => a.displayOrder - b.displayOrder)
  const visibleDepartments = departments.filter((d) => d.displayOnWebsite && d.status === 'active')
  return (
    <>
      <PageMeta title="Academics" description={`CSEC, CAPE, TVET and departmental programmes at ${branding.schoolName}.`} path="/academics" />
      <PageHero title="Academics" subtitle="A structured curriculum from Grade 7 to Grade 13." image={photos.classroom} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'Academics' }]} />
        <SectionHeader title="Curriculum" description="Lower school foundations lead to CSEC subject selection, then to CAPE or further technical training." />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProgrammes.map((p) => (
            <article key={p.id} className="rounded-lg border border-brand/10 p-5">
              <span className="inline-flex rounded-md bg-brand p-2 text-gold">
                <NamedIcon name={p.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-3 font-display text-lg font-bold text-brand">{p.title}</h3>
              <p className="mt-2 text-sm text-muted">{p.summary || p.description.replace(/<[^>]+>/g, ' ')}</p>
            </article>
          ))}
        </div>

        <section id="csec" className="mt-16 scroll-mt-28">
          <SectionHeader title="CSEC" eyebrow="Grades 10–11" />
          <p className="mt-4 max-w-3xl text-muted">Students sit the Caribbean Secondary Education Certificate in a combination of core and elective subjects. English A and Mathematics are required. Additional choices are made with the form teacher and heads of department in Grade 9.</p>
        </section>
        <section id="cape" className="mt-12 scroll-mt-28">
          <SectionHeader title="CAPE" eyebrow="Grades 12–13" />
          <p className="mt-4 max-w-3xl text-muted">Sixth form offers CAPE Unit 1 and Unit 2. Caribbean Studies and Communication Studies sit alongside chosen subjects. Entry depends on CSEC results and available teaching groups.</p>
        </section>
        <section id="tvet" className="mt-12 scroll-mt-28">
          <SectionHeader title="TVET" eyebrow="Technical pathways" />
          <p className="mt-4 max-w-3xl text-muted">Technical and vocational subjects run alongside the academic programme, giving students practical competence and a route into HEART/NSTA, apprenticeships and skilled work.</p>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            { title: 'Academic expectations', body: 'Punctuality, completed homework, and full participation in class. Honour roll is published each term.' },
            { title: 'Examination preparation', body: 'Mocks, past-paper clinics and Saturday classes in the lead-up to CSEC and CAPE.' },
            { title: 'Student assessment', body: 'A mix of classwork, tests, projects and CXC internal assessments, reported to parents each term.' },
          ].map((item) => (
            <article key={item.title} className="rounded-lg bg-cream p-6">
              <h3 className="font-display text-lg font-bold text-brand">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-16">
          <div className="mb-6 flex items-end justify-between">
            <SectionHeader title="Departments" />
            <Link to="/academics/departments" className="font-semibold text-brand">View all departments</Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleDepartments.slice(0, 6).map((d) => (
              <DepartmentCard key={d.id} department={d} />
            ))}
          </div>
        </section>
      </div>
      <CTASection title="Questions about subject selection?" primary={{ label: 'Contact the school', href: '/contact' }} secondary={{ label: 'Admissions', href: '/admissions' }} />
    </>
  )
}
