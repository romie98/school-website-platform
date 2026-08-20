import { useMemo, useState } from 'react'
import { PageMeta } from '@/components/common/PageMeta'
import { PageHero, SearchBar, FilterTabs, EmptyState } from '@/components/common/PageBits'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { ResourceCard } from '@/components/common/Cards'
import { useContent } from '@/hooks/useContent'
import { photos } from '@/data/images'
import type { ResourceCategory } from '@/types'

const cats: Array<'All' | ResourceCategory> = [
  'All',
  'Student Handbook',
  'School Policies',
  'Application Forms',
  'Booklists',
  'Academic Calendars',
  'Examination Timetables',
  'Parent Forms',
  'Student Forms',
  'Newsletters',
]

export function Resources() {
  const { resources, branding } = useContent()
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState<(typeof cats)[number]>('All')
  const filtered = useMemo(
    () =>
      resources.filter(
        (r) =>
          r.status === 'published' &&
          (cat === 'All' || r.category === cat) &&
          (!query || r.name.toLowerCase().includes(query.toLowerCase())),
      ),
    [resources, query, cat],
  )

  return (
    <>
      <PageMeta title="Downloads & Resources" description={`Handbooks, booklists, forms and timetables from ${branding.schoolName}.`} path="/resources" />
      <PageHero title="Downloads & Resources" image={photos.library} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'Resources' }]} />
        <div className="grid gap-4">
          <SearchBar value={query} onChange={setQuery} placeholder="Search documents" />
          <FilterTabs options={[...cats]} value={cat} onChange={(v) => setCat(v as (typeof cats)[number])} />
        </div>
        <div className="mt-8 space-y-3">
          {filtered.length === 0 ? (
            <EmptyState title="No documents found" body="Try another category or search term." />
          ) : (
            filtered.map((r) => <ResourceCard key={r.id} resource={r} />)
          )}
        </div>
      </div>
    </>
  )
}
