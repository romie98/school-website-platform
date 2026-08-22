import { useState } from 'react'
import { X } from 'lucide-react'
import type { GalleryItem, GalleryCategory } from '@/types'
import { FilterTabs, Pagination } from '@/components/common/PageBits'
import { paginate } from '@/utils'
import { mediaUrl } from '@/services/normalize'

const cats: Array<'All' | GalleryCategory> = ['All', 'Academic', 'Sports', 'Graduation', 'Clubs', 'Special Events', 'Campus Life']

export function GalleryGrid({ items, showFilters = true }: { items: GalleryItem[]; showFilters?: boolean }) {
  const [filter, setFilter] = useState<(typeof cats)[number]>('All')
  const [active, setActive] = useState<GalleryItem | null>(null)
  const [page, setPage] = useState(1)
  const visible = filter === 'All' ? items : items.filter((i) => i.category === filter)
  const paged = paginate(visible, page, 18)

  return (
    <div>
      {showFilters && (
        <div className="mb-6">
          <FilterTabs options={[...cats]} value={filter} onChange={(v) => { setFilter(v as (typeof cats)[number]); setPage(1) }} />
        </div>
      )}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {paged.items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(item)}
            className="mb-4 block w-full overflow-hidden rounded-lg"
          >
            <img src={mediaUrl(item.src)} alt={item.alt} className="w-full object-cover transition hover:brightness-110" loading="lazy" />
          </button>
        ))}
      </div>
      <Pagination page={paged.page} totalPages={paged.totalPages} onChange={setPage} />
      {active && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-dark/90 p-4" role="dialog" aria-modal>
          <button type="button" className="absolute inset-0" aria-label="Close lightbox" onClick={() => setActive(null)} />
          <div className="relative max-h-[90vh] max-w-5xl">
            <img src={mediaUrl(active.src)} alt={active.alt} className="max-h-[90vh] rounded-md object-contain" />
            <p className="mt-2 max-w-3xl text-center text-sm text-white">{active.caption || active.alt}</p>
            <button type="button" onClick={() => setActive(null)} className="absolute -right-2 -top-2 rounded-full bg-gold p-1 text-brand-dark" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
