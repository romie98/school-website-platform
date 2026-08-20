import { PageMeta } from '@/components/common/PageMeta'
import { PageHero } from '@/components/common/PageBits'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { SectionHeader } from '@/components/common/SectionHeader'
import { StaffCard } from '@/components/common/Cards'
import { useContent } from '@/hooks/useContent'
import { photos } from '@/data/images'

export function Administration() {
  const { staff, branding } = useContent()
  const admin = staff.filter((s) => s.administration && s.displayOnWebsite && s.status === 'active')
  return (
    <>
      <PageMeta title="Administration" description={`Leadership and administrative team of ${branding.schoolName}.`} path="/about/administration" />
      <PageHero title="Administration" subtitle="The team responsible for the academic and daily life of the school." image={photos.corridor} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'About', href: '/about' }, { label: 'Administration' }]} />
        <SectionHeader title="Senior leadership and offices" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {admin.map((person) => (
            <StaffCard key={person.id} person={person} />
          ))}
        </div>
      </div>
    </>
  )
}
