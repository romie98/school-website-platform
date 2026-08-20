import { useParams, Link } from 'react-router-dom'
import { PageMeta } from '@/components/common/PageMeta'
import { PageHero, EmptyState } from '@/components/common/PageBits'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { SectionHeader } from '@/components/common/SectionHeader'
import { DepartmentCard, StaffCard } from '@/components/common/Cards'
import { useContent } from '@/hooks/useContent'
import { photos } from '@/data/images'

export function Departments() {
  const { departments, branding } = useContent()
  const visible = departments.filter((d) => d.displayOnWebsite && d.status === 'active')
  return (
    <>
      <PageMeta title="Departments" description={`Academic departments at ${branding.schoolName}.`} path="/academics/departments" />
      <PageHero title="Departments" image={photos.library} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'Academics', href: '/academics' }, { label: 'Departments' }]} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((d) => (
            <DepartmentCard key={d.id} department={d} />
          ))}
        </div>
      </div>
    </>
  )
}

export function DepartmentDetail() {
  const { slug } = useParams()
  const { departments, staff } = useContent()
  const dept = departments.find((d) => d.slug === slug && d.displayOnWebsite && d.status === 'active')
  if (!dept) {
    return (
      <div className="page-wrap section-space">
        <EmptyState title="Department not found" body="The department you requested is not in the directory." />
        <Link to="/academics/departments" className="mt-4 inline-block font-semibold text-brand">Back to departments</Link>
      </div>
    )
  }
  const teachers = staff.filter((s) => dept.teacherIds.includes(s.id) && s.displayOnWebsite && s.status === 'active')
  return (
    <>
      <PageMeta title={dept.name} description={dept.overview} path={`/academics/departments/${dept.slug}`} />
      <PageHero title={dept.name} image={dept.imageMedia?.url || dept.image} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'Academics', href: '/academics' }, { label: 'Departments', href: '/academics/departments' }, { label: dept.name }]} />
          <div className="cms-prose max-w-3xl text-lg leading-relaxed text-muted" dangerouslySetInnerHTML={{ __html: dept.overview }} />
        <p className="mt-4 text-sm font-medium text-brand">Head of Department: {dept.headOfDepartment}</p>
        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader title="Subjects" />
            <ul className="mt-4 list-disc space-y-1 pl-5 text-muted">{dept.subjects.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
          <div>
            <SectionHeader title="Programmes" />
            <ul className="mt-4 list-disc space-y-1 pl-5 text-muted">{dept.programmes.map((s) => <li key={s}>{s}</li>)}</ul>
          </div>
        </div>
        <section className="mt-12">
          <SectionHeader title="Achievements" />
          <div className="cms-prose mt-4" dangerouslySetInnerHTML={{ __html: dept.achievements }} />
        </section>
        <section className="mt-12">
          <SectionHeader title="Teachers" />
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {teachers.map((t) => <StaffCard key={t.id} person={t} />)}
          </div>
        </section>
        <section className="mt-12">
          <SectionHeader title="Resources" />
          <ul className="mt-4">{dept.resources.map((r) => <li key={r.label}><Link to={r.href} className="font-medium text-brand hover:underline">{r.label}</Link></li>)}</ul>
        </section>
      </div>
    </>
  )
}
