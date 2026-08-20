import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { MediaFile, NewsArticle, NewsCategory } from '@/types'
import { EditorShell, Field, adminInput } from '@/components/admin/AdminChrome'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { newsService, uniqueSlug, writeMessage, conflictText } from '@/services/collections'
import { nowIso } from '@/services/normalize'
import { useToast } from '@/components/admin/Toast'
import { storeMediaFile } from '@/services/mediaService'
import { mediaLibraryService } from '@/services/collections'
import { submitLabel } from '@/services/approvals'
import { canPublishDirectly } from '@/services/api'

const categories: NewsCategory[] = ['Academic', 'Sports', 'Events', 'Achievements', 'Student Life', 'Community', 'Announcements', 'General']

function blank(): NewsArticle {
  const id = crypto.randomUUID()
  return {
    id,
    slug: '',
    title: '',
    excerpt: '',
    content: '',
    category: 'General',
    author: 'Communications',
    image: '',
    imageAlt: '',
    gallery: [],
    status: 'draft',
    isFeatured: false,
    showOnHomepage: false,
    featuredPriority: 0,
    date: nowIso().slice(0, 10),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
}

export function NewsEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const existing = isNew ? undefined : newsService.get(id)
  const [form, setForm] = useState<NewsArticle>(existing ?? blank())
  const [slugManual, setSlugManual] = useState(false)
  const [savedAt, setSavedAt] = useState(existing?.updatedAt)
  const [dirty, setDirty] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    if (existing) setForm(existing)
  }, [id])

  const set = (patch: Partial<NewsArticle>) => {
    setForm((f) => ({ ...f, ...patch }))
    setDirty(true)
  }

  const persist = async (status?: NewsArticle['status']) => {
    if (!form.title.trim()) {
      toast.push('Please enter a headline.', 'error')
      return false
    }
    const slug = uniqueSlug(form.slug || form.title, [], form.id)
    const next: NewsArticle = {
      ...form,
      slug,
      status: status ?? form.status,
      date: form.date || nowIso().slice(0, 10),
      publishedAt: (status ?? form.status) === 'published' ? form.publishedAt || nowIso() : form.publishedAt,
      image: form.featuredImage?.url || form.image,
      updatedAt: nowIso(),
    }
    try {
      const result = await newsService.save(next, status === 'published' ? `News published: ${next.title}` : `News saved: ${next.title}`)
      setForm(next)
      setSavedAt(next.updatedAt)
      setDirty(false)
      toast.push(writeMessage(result, canPublishDirectly() ? (status === 'published' ? 'News story published successfully.' : 'News story updated successfully.') : 'News story published successfully.'))
      if (result.mode === 'pending') navigate('/admin/changes', { replace: true })
      else if (isNew) navigate(`/admin/news/${next.id}/edit`, { replace: true })
      return true
    } catch (err) {
      toast.push(conflictText(err), 'error')
      return false
    }
  }

  const gallery = form.gallery

  return (
    <EditorShell
      title={isNew ? 'Add news story' : 'Edit news story'}
      backTo="/admin/news"
      lastSaved={savedAt}
      dirty={dirty}
      actions={
        <>
          <button type="button" className="rounded-md border border-brand/20 px-4 py-2 text-sm" onClick={() => persist('draft')}>Save draft</button>
          <button type="button" className="rounded-md border border-brand/20 px-4 py-2 text-sm" onClick={async () => {
            const ok = await persist()
            if (ok) window.open(`/news/${form.slug || uniqueSlug(form.title, [], form.id)}?preview=1`, '_blank')
          }}>Preview</button>
          <button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={() => persist(existing?.status === 'published' ? 'published' : 'published')}>
            {submitLabel()}
          </button>
        </>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5 rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
          <Field label="Headline">
            <input className={adminInput} value={form.title} onChange={(e) => {
              const title = e.target.value
              set({ title, slug: slugManual ? form.slug : uniqueSlug(title, [], form.id) })
            }} />
          </Field>
          <Field label="Slug" hint="Used in the public URL. Auto-generated from the headline unless you edit it.">
            <input className={adminInput} value={form.slug} onChange={(e) => { setSlugManual(true); set({ slug: e.target.value }) }} />
          </Field>
          <Field label="Short summary / excerpt">
            <textarea className={adminInput} rows={3} value={form.excerpt} onChange={(e) => set({ excerpt: e.target.value })} />
          </Field>
          <RichTextEditor label="Full story" value={form.content} onChange={(content) => set({ content })} minHeight="280px" />
        </div>
        <div className="space-y-5">
          <div className="space-y-4 rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-display font-bold text-brand">Publishing</h2>
            <Field label="Status">
              <select className={adminInput} value={form.status} onChange={(e) => set({ status: e.target.value as NewsArticle['status'] })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field label="Publish date">
              <input type="date" className={adminInput} value={form.date} onChange={(e) => set({ date: e.target.value, publishedAt: e.target.value })} />
            </Field>
            <Field label="Category">
              <select className={adminInput} value={form.category} onChange={(e) => set({ category: e.target.value as NewsCategory })}>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Author">
              <input className={adminInput} value={form.author} onChange={(e) => set({ author: e.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-brand">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => set({ isFeatured: e.target.checked })} /> Feature this story
            </label>
            <label className="flex items-center gap-2 text-sm text-brand">
              <input type="checkbox" checked={form.showOnHomepage} onChange={(e) => set({ showOnHomepage: e.target.checked })} /> Show on homepage
            </label>
            <Field label="Featured priority">
              <input type="number" className={adminInput} value={form.featuredPriority} onChange={(e) => set({ featuredPriority: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="space-y-4 rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-display font-bold text-brand">Media</h2>
            <ImageUploader
              label="Featured image"
              value={form.featuredImage || form.image}
              alt={form.imageAlt}
              onAltChange={(imageAlt) => set({ imageAlt })}
              onChange={(file, url) => set({ featuredImage: file, image: url })}
            />
            <ArticleGallery items={gallery} onChange={(gallery) => set({ gallery })} />
          </div>
        </div>
      </div>
    </EditorShell>
  )
}

function ArticleGallery({ items, onChange }: { items: MediaFile[]; onChange: (items: MediaFile[]) => void }) {
  const toast = useToast()
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-brand">Article gallery</p>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])]
          const uploaded: MediaFile[] = []
          for (const file of files) {
            try {
              const stored = await storeMediaFile(file)
              mediaLibraryService.add({ ...stored, url: `idb:${stored.id}` })
              uploaded.push(stored)
            } catch (err) {
              toast.push(err instanceof Error ? err.message : 'Upload failed', 'error')
            }
          }
          onChange([...items, ...uploaded])
          e.target.value = ''
        }}
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {items.map((item, index) => (
          <div key={item.id} className="rounded border border-brand/10 p-2">
            <img src={item.url} alt={item.alt} className="h-20 w-full object-cover" />
            <input className="mt-1 w-full rounded border border-brand/15 px-2 py-1 text-xs" placeholder="Caption" value={item.caption ?? ''} onChange={(e) => onChange(items.map((g, i) => i === index ? { ...g, caption: e.target.value } : g))} />
            <div className="mt-1 flex justify-between text-xs">
              <button type="button" disabled={index === 0} onClick={() => {
                const next = [...items]
                ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                onChange(next)
              }}>Up</button>
              <button type="button" className="text-red-700" onClick={() => onChange(items.filter((_, i) => i !== index))}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function NewsView() {
  const { id } = useParams()
  const article = newsService.get(id ?? '')
  const navigate = useNavigate()
  if (!article) return <p>Story not found.</p>
  return (
    <EditorShell title={article.title} backTo="/admin/news" actions={
      <>
        <button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={() => navigate(`/admin/news/${article.id}/edit`)}>Edit</button>
        <button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={() => navigate(`/admin/activity/resource/news/${article.id}`)}>View history</button>
        <a className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" href={`/news/${article.slug}?preview=1`} target="_blank" rel="noreferrer">Preview</a>
      </>
    }>
      <div className="rounded-lg bg-white p-6 shadow-[var(--shadow-card)]">
        {(article.featuredImage?.url || article.image) && <img src={article.featuredImage?.url || article.image} alt={article.imageAlt} className="mb-4 max-h-80 w-full rounded object-cover" />}
        <p className="text-sm text-muted">{article.category} · {article.status} · {article.author}</p>
        <p className="mt-3 text-muted">{article.excerpt}</p>
        <div className="cms-prose mt-6" dangerouslySetInnerHTML={{ __html: article.content }} />
      </div>
    </EditorShell>
  )
}
