import { useMemo, useState } from 'react'
import { PageMeta } from '@/components/common/PageMeta'
import { PageHero, SearchBar, FilterTabs, EmptyState, Pagination } from '@/components/common/PageBits'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { StaffCard } from '@/components/common/Cards'
import { useContent } from '@/hooks/useContent'
import { photos } from '@/data/images'
import { paginate } from '@/utils'

export function StaffDirectory() {
  const { staff, branding } = useContent()
  const visibleStaff = staff.filter((s) => s.displayOnWebsite && s.status === 'active')
  const departments = ['All', ...Array.from(new Set(visibleStaff.map((s) => s.department)))]
  const [query, setQuery] = useState('')
  const [dept, setDept] = useState('All')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      if (!s.displayOnWebsite || s.status !== 'active') return false
      const matchDept = dept === 'All' || s.department === dept
      const q = query.toLowerCase()
      const matchQ = !q || s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.department.toLowerCase().includes(q)
      return matchDept && matchQ
    })
  }, [staff, query, dept])
  const paged = paginate(filtered, page, 12)

  return (
    <>
      <PageMeta title="Staff Directory" description={`Find ${branding.schoolName} staff by department.`} path="/about/staff" />
      <PageHero title="Staff Directory" subtitle="Search by name or filter by department." image={photos.lecture} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'About', href: '/about' }, { label: 'Staff Directory' }]} />
        <div className="grid gap-4 md:grid-cols-[280px_1fr]">
          <SearchBar value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Search staff" />
          <FilterTabs options={departments} value={dept} onChange={(v) => { setDept(v); setPage(1) }} />
        </div>
        {filtered.length === 0 ? (
          <div className="mt-10">
            <EmptyState title="No staff found" body="Try another name or department." />
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {paged.items.map((person) => (
              <StaffCard key={person.id} person={person} />
            ))}
          </div>
        )}
        <Pagination page={paged.page} totalPages={paged.totalPages} onChange={setPage} />
      </div>
    </>
  )
}
