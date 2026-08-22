import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TenantLink as Link } from '@/components/common/TenantLink'
import { PageMeta } from '@/components/common/PageMeta'
import { PageHero } from '@/components/common/PageBits'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { GalleryGrid } from '@/components/common/GalleryGrid'
import { useContent } from '@/hooks/useContent'
import { photos } from '@/data/images'
import { mediaUrl } from '@/services/normalize'
import { EmptyState } from '@/components/common/PageBits'

export function Gallery() {
  const { albums, gallery, branding } = useContent()
  const published = albums.filter((a) => a.status === 'published')
  const albumCards = useMemo(() => {
    if (published.length) {
      return published.map((a) => ({
        slug: a.slug,
        name: a.title,
        cover: mediaUrl(a.cover) || mediaUrl(a.images[0]?.src) || photos.campus,
        count: a.images.length,
      }))
    }
    const map = new Map<string, { slug: string; name: string; cover: string; count: number }>()
    gallery.forEach((g) => {
      const current = map.get(g.albumSlug)
      if (current) current.count += 1
      else map.set(g.albumSlug, { slug: g.albumSlug, name: g.album, cover: mediaUrl(g.src), count: 1 })
    })
    return [...map.values()]
  }, [published, gallery])
  const allPhotos = published.length ? published.flatMap((a) => a.images) : gallery
  const [mode, setMode] = useState<'albums' | 'all'>('albums')

  return (
    <>
      <PageMeta title="Gallery" description={`Photographs of campus life, sport, ceremonies and clubs at ${branding.schoolName}.`} path="/gallery" />
      <PageHero title="Gallery" subtitle="A record of school life in Mandeville." image={photos.campus} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'Gallery' }]} />
        <div className="mb-6 flex gap-2">
          <button type="button" onClick={() => setMode('albums')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === 'albums' ? 'bg-brand text-white' : 'bg-cream'}`}>Albums</button>
          <button type="button" onClick={() => setMode('all')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${mode === 'all' ? 'bg-brand text-white' : 'bg-cream'}`}>All photos</button>
        </div>
        {albumCards.length === 0 ? (
          <EmptyState title="No gallery albums yet" body="Photographs will appear here once they are published." />
        ) : mode === 'albums' ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {albumCards.map((a) => (
              <Link key={a.slug} to={`/gallery/${a.slug}`} className="group overflow-hidden rounded-lg">
                <img src={a.cover} alt="" className="h-48 w-full object-cover transition group-hover:scale-105" />
                <div className="bg-brand px-4 py-3 text-white">
                  <p className="font-display font-bold">{a.name}</p>
                  <p className="text-xs text-gold">{a.count} photos</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <GalleryGrid items={allPhotos} />
        )}
      </div>
    </>
  )
}

export function GalleryAlbum() {
  const { slug } = useParams()
  const { albums, gallery, branding } = useContent()
  const album = albums.find((a) => a.slug === slug && a.status === 'published')
  const items = album ? album.images : gallery.filter((g) => g.albumSlug === slug)
  const name = album?.title ?? items[0]?.album ?? 'Album'
  return (
    <>
      <PageMeta title={name} description={album?.description || `${name} photographs from ${branding.schoolName}.`} path={`/gallery/${slug}`} />
      <PageHero title={name} image={album?.cover?.url || items[0]?.src || photos.campus} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'Gallery', href: '/gallery' }, { label: name }]} />
        {album?.description && <p className="mb-6 max-w-3xl text-muted">{album.description}</p>}
        {items.length === 0 ? <EmptyState title="No photographs" body="This album does not have published images yet." /> : <GalleryGrid items={items} showFilters={false} />}
      </div>
    </>
  )
}
