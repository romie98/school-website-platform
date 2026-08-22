import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { FacebookIcon } from '@/components/common/SocialIcons'
import { PageMeta } from '@/components/common/PageMeta'
import { PageHero, SearchBar, FilterTabs, Pagination, EmptyState } from '@/components/common/PageBits'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { NewsCard } from '@/components/common/Cards'
import { GoldRule } from '@/components/common/GoldRule'
import { useContent } from '@/hooks/useContent'
import { useTenant } from '@/contexts/TenantContext'
import { photos } from '@/data/images'
import { formatDate, paginate, newsCategories } from '@/utils'
import { isNewsPublic, mediaUrl } from '@/services/normalize'
import { isAdminAuthenticated } from '@/services/content'
import { isHeritageTheme } from '@/themes/heritage'

export function News() {
  const { news, branding } = useContent()
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('All')
  const [page, setPage] = useState(1)
  const filtered = useMemo(() => {
    return [...news]
      .filter((n) => isNewsPublic(n))
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((n) => (cat === 'All' || n.category === cat) && (!query || n.title.toLowerCase().includes(query.toLowerCase()) || n.excerpt.toLowerCase().includes(query.toLowerCase())))
  }, [news, query, cat])
  const featured = filtered.find((n) => n.isFeatured || n.featuredPriority > 0) ?? filtered[0]
  const rest = filtered.filter((n) => n.id !== featured?.id)
  const paged = paginate(rest, page, 8)

  return (
    <>
      <PageMeta title="News" description={`Stories from ${branding.schoolName} — academics, sport, student life and community.`} path="/news" />
      <PageHero title="News" subtitle="The latest from campus." image={photos.assembly} />
      <div className="page-wrap section-space">
        <Breadcrumbs items={[{ label: 'News' }]} />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SearchBar value={query} onChange={(v) => { setQuery(v); setPage(1) }} placeholder="Search news" />
          <FilterTabs options={['All', ...newsCategories]} value={cat} onChange={(v) => { setCat(v); setPage(1) }} />
        </div>
        {featured && (
          <div className="mt-8">
            <NewsCard article={featured} featured />
          </div>
        )}
        {paged.items.length === 0 && !featured ? (
          <div className="mt-10"><EmptyState title="No stories found" body="Try another category or search term." /></div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paged.items.map((article) => <NewsCard key={article.id} article={article} />)}
          </div>
        )}
        <Pagination page={paged.page} totalPages={paged.totalPages} onChange={setPage} />
      </div>
    </>
  )
}

export function NewsArticlePage() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const { news } = useContent()
  const { theme } = useTenant()
  const preview = params.get('preview') === '1' && isAdminAuthenticated()
  const article = news.find((n) => n.slug === slug)
  if (!article || !isNewsPublic(article, preview)) {
    return <div className="page-wrap section-space"><EmptyState title="Story not found" body="This article may have been moved." /></div>
  }
  const related = news.filter((n) => n.id !== article.id && n.category === article.category && isNewsPublic(n)).slice(0, 3)
  const share = typeof window !== 'undefined' ? window.location.href : ''
  const hero = mediaUrl(article.featuredImage) || mediaUrl(article.image)
  const heritage = isHeritageTheme(theme)

  if (heritage) {
    return (
      <>
        <PageMeta title={article.title} description={article.excerpt} path={`/news/${article.slug}`} />
        <article className="bg-cream">
          <div className="page-wrap section-space">
            <Breadcrumbs items={[{ label: 'News', href: '/news' }, { label: article.title }]} />
            {preview && article.status !== 'published' && (
              <p className="mb-4 inline-block bg-gold px-2 py-1 text-xs font-semibold uppercase tracking-wider text-brand-dark">Preview · {article.status}</p>
            )}
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-dark">{article.category}</p>
            <h1 className="mt-3 max-w-3xl break-words font-display text-3xl font-semibold tracking-[0.04em] text-brand md:text-5xl">{article.title}</h1>
            <p className="mt-4 text-sm text-muted">{formatDate(article.publishedAt || article.date)} · {article.author}</p>
            <GoldRule className="mt-6 w-32" />
            {hero ? (
              <img src={hero} alt={article.imageAlt || article.title} className="mt-10 aspect-[16/8] w-full object-cover" />
            ) : null}
            <div className="mx-auto mt-10 max-w-3xl">
              <div className="cms-prose text-[17px] leading-8 text-ink" dangerouslySetInnerHTML={{ __html: article.content }} />
              <div className="mt-8 flex gap-3 text-sm">
                <span className="font-medium text-brand">Share:</span>
                <a className="inline-flex items-center gap-1 text-muted hover:text-brand" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(share)}`}><FacebookIcon className="h-4 w-4" /> Facebook</a>
                <a className="inline-flex items-center gap-1 text-muted hover:text-brand" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(share)}&text=${encodeURIComponent(article.title)}`}>X</a>
                <a className="inline-flex items-center gap-1 text-muted hover:text-brand" href={`mailto:?subject=${encodeURIComponent(article.title)}`}><Mail className="h-4 w-4" /> Email</a>
              </div>
            </div>
            {article.gallery && article.gallery.length > 0 && (
              <div className="mt-12 grid gap-3 sm:grid-cols-3">
                {article.gallery.map((item) => <img key={item.id} src={mediaUrl(item)} alt={item.alt || item.caption || ''} className="h-48 w-full object-cover" />)}
              </div>
            )}
            {related.length > 0 && (
              <div className="mt-16">
                <h2 className="font-display text-2xl font-semibold tracking-[0.06em] text-brand">Related articles</h2>
                <GoldRule className="mt-4 w-28" />
                <div className="mt-8 grid gap-6 md:grid-cols-3">
                  {related.map((n) => <NewsCard key={n.id} article={n} />)}
                </div>
              </div>
            )}
          </div>
        </article>
      </>
    )
  }

  return (
    <>
      <PageMeta title={article.title} description={article.excerpt} path={`/news/${article.slug}`} />
      <article>
        <div className="relative min-h-[280px]">
          {hero && <img src={hero} alt={article.imageAlt || article.title} className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-brand/75" />
          <div className="page-wrap relative py-16">
            {preview && article.status !== 'published' && (
              <p className="mb-3 inline-block rounded bg-gold px-2 py-1 text-xs font-semibold text-brand-dark">Preview · {article.status}</p>
            )}
            <p className="text-sm font-semibold uppercase tracking-wider text-gold">{article.category}</p>
            <h1 className="mt-2 max-w-3xl break-words font-display text-3xl font-bold text-white md:text-5xl">{article.title}</h1>
            <p className="mt-4 text-white/80">{formatDate(article.publishedAt || article.date)} · {article.author}</p>
          </div>
        </div>
        <div className="page-wrap section-space">
          <Breadcrumbs items={[{ label: 'News', href: '/news' }, { label: article.title }]} />
          <div className="mx-auto max-w-3xl">
            <div className="cms-prose text-[17px] leading-8 text-ink" dangerouslySetInnerHTML={{ __html: article.content }} />
            <div className="mt-8 flex gap-3 text-sm">
              <span className="font-medium text-brand">Share:</span>
              <a className="inline-flex items-center gap-1 text-muted hover:text-brand" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(share)}`}><FacebookIcon className="h-4 w-4" /> Facebook</a>
              <a className="inline-flex items-center gap-1 text-muted hover:text-brand" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(share)}&text=${encodeURIComponent(article.title)}`}>X</a>
              <a className="inline-flex items-center gap-1 text-muted hover:text-brand" href={`mailto:?subject=${encodeURIComponent(article.title)}`}><Mail className="h-4 w-4" /> Email</a>
            </div>
          </div>
          {article.gallery && article.gallery.length > 0 && (
            <div className="mt-12 grid gap-3 sm:grid-cols-3">
              {article.gallery.map((item) => <img key={item.id} src={mediaUrl(item)} alt={item.alt || item.caption || ''} className="h-48 w-full rounded-lg object-cover" />)}
            </div>
          )}
          {related.length > 0 && (
            <div className="mt-16">
              <h2 className="font-display text-2xl font-bold text-brand">Related articles</h2>
              <div className="mt-6 grid gap-6 md:grid-cols-3">
                {related.map((n) => <NewsCard key={n.id} article={n} />)}
              </div>
            </div>
          )}
        </div>
      </article>
    </>
  )
}
