import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import type { AcademicProgramme, AdminUser, BrandingSettings, Club, ContactInfo, GalleryAlbum, GalleryItem, HomepageContent, PrincipalMessage, ResourceItem, Sport, UserRole } from '@/types'
import { ActionsMenu, AdminEmpty, AdminHeader, AdminPager, AdminSearch, EditorShell, Field, StatusBadge, StringList, adminInput, useAdminList } from '@/components/admin/AdminChrome'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { useContent } from '@/hooks/useContent'
import { useTenant } from '@/contexts/TenantContext'
import { SECTION_CATALOG, variantsFor } from '@/components/public/sectionCatalog'
import { albumService, clubService, documentService, homepageService, mediaLibraryService, principalService, programmeService, settingsService, sportService, usersService, writeMessage, conflictText } from '@/services/collections'
import { nowIso } from '@/services/normalize'
import { slugify, formatDate } from '@/utils'
import { useToast } from '@/components/admin/Toast'
import { canManageUsers, isPrincipal, isSchoolAdmin } from '@/services/api'
import { deleteConfirmCopy, submitLabel } from '@/services/approvals'
import { storeMediaFile, validateDocumentFile, formatSize } from '@/services/mediaService'
import type { MediaFile } from '@/types'

export function ProgrammeList() {
  const { programmes } = useContent()
  const navigate = useNavigate()
  const toast = useToast()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  return (
    <div>
      <AdminHeader title="Academics" description="Manage CSEC, CAPE, TVET and other programme cards shown on the academics pages." addLabel="Add Programme" addTo="/admin/academics/new" />
      <div className="overflow-x-auto rounded-lg bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand text-white"><tr><th className="px-3 py-2">Title</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Order</th><th className="px-3 py-2">Actions</th></tr></thead>
          <tbody>
            {programmes.map((p) => (
              <tr key={p.id} className="border-b border-brand/10">
                <td className="px-3 py-2 font-medium">{p.title}</td>
                <td className="px-3 py-2"><StatusBadge status={p.active ? 'active' : 'inactive'} /></td>
                <td className="px-3 py-2">{p.displayOrder}</td>
                <td className="px-3 py-2"><ActionsMenu items={[{ label: 'Edit', onClick: () => navigate(`/admin/academics/${p.id}/edit`) }, { label: 'Delete', danger: true, onClick: () => setDeleteId(p.id) }]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog open={Boolean(deleteId)} title="Delete this programme?" body="This action cannot be undone." onCancel={() => setDeleteId(null)} onConfirm={() => { if (deleteId) programmeService.remove(deleteId); toast.push('Programme deleted.'); setDeleteId(null) }} />
    </div>
  )
}

export function ProgrammeEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const existing = isNew ? undefined : programmeService.get(id)
  const [form, setForm] = useState<AcademicProgramme>(existing ?? { id: crypto.randomUUID(), slug: '', title: '', summary: '', description: '', icon: 'BookOpen', href: '/academics', subjects: [], active: true, displayOrder: 99, createdAt: nowIso(), updatedAt: nowIso() })
  const [dirty, setDirty] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const set = (p: Partial<AcademicProgramme>) => { setForm((f) => ({ ...f, ...p })); setDirty(true) }
  return (
    <EditorShell title={isNew ? 'Add programme' : 'Edit programme'} backTo="/admin/academics" dirty={dirty} actions={<button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={() => { if (!form.title.trim()) { toast.push('Enter a title.', 'error'); return } const next = { ...form, slug: form.slug || slugify(form.title) }; programmeService.save(next); setDirty(false); toast.push('Programme saved.'); if (isNew) navigate(`/admin/academics/${next.id}/edit`, { replace: true }) }}>Save</button>}>
      <div className="max-w-3xl space-y-4 rounded-lg bg-white p-5">
        <Field label="Title"><input className={adminInput} value={form.title} onChange={(e) => set({ title: e.target.value, slug: slugify(e.target.value), href: `/academics#${slugify(e.target.value)}` })} /></Field>
        <Field label="Short description"><textarea className={adminInput} rows={2} value={form.summary} onChange={(e) => set({ summary: e.target.value })} /></Field>
        <RichTextEditor label="Full description" value={form.description} onChange={(description) => set({ description })} />
        <Field label="Icon name"><input className={adminInput} value={form.icon} onChange={(e) => set({ icon: e.target.value })} /></Field>
        <ImageUploader label="Image" value={form.imageMedia || form.image} onChange={(file, url) => set({ imageMedia: file, image: url })} />
        <Field label="Subjects"><StringList values={form.subjects} onChange={(subjects) => set({ subjects })} placeholder="Add a subject" /></Field>
        <Field label="Eligibility / requirements"><textarea className={adminInput} rows={3} value={form.requirements ?? ''} onChange={(e) => set({ requirements: e.target.value })} /></Field>
        <Field label="Display order"><input type="number" className={adminInput} value={form.displayOrder} onChange={(e) => set({ displayOrder: Number(e.target.value) })} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Active</label>
      </div>
    </EditorShell>
  )
}

export function PrincipalEditor() {
  const current = principalService.get()
  const [form, setForm] = useState<PrincipalMessage>(current)
  const [dirty, setDirty] = useState(false)
  const toast = useToast()
  const set = (p: Partial<PrincipalMessage>) => { setForm((f) => ({ ...f, ...p })); setDirty(true) }
  return (
    <EditorShell title="Principal's Message" backTo="/admin" lastSaved={form.updatedAt} dirty={dirty} actions={
      <>
        <a className="rounded-md border px-4 py-2 text-sm" href="/about/principal" target="_blank" rel="noreferrer">Preview</a>
        <button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={async () => {
          try {
            const result = await principalService.save(form)
            setDirty(false)
            toast.push(writeMessage(result, 'Principal’s message saved.'))
          } catch (err) {
            toast.push(conflictText(err), 'error')
          }
        }}>{submitLabel()}</button>
      </>
    }>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4 rounded-lg bg-white p-5">
          <Field label="Principal name"><input className={adminInput} value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Position"><input className={adminInput} value={form.title} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Message title"><input className={adminInput} value={form.messageTitle} onChange={(e) => set({ messageTitle: e.target.value })} /></Field>
          <Field label="Short excerpt"><textarea className={adminInput} rows={3} value={form.excerpt} onChange={(e) => set({ excerpt: e.target.value })} /></Field>
          <RichTextEditor label="Full message" value={form.content} onChange={(content) => set({ content, paragraphs: [] })} minHeight="260px" />
          <Field label="Signature name"><input className={adminInput} value={form.signature} onChange={(e) => set({ signature: e.target.value })} /></Field>
        </div>
        <div className="space-y-4 rounded-lg bg-white p-5">
          <ImageUploader label="Principal photo" value={form.photoMedia || form.photo} onChange={(file, url) => set({ photoMedia: file, photo: url })} />
          <ImageUploader label="Signature image" value={form.signatureImage} onChange={(file) => set({ signatureImage: file })} />
        </div>
      </div>
    </EditorShell>
  )
}

export function ClubList() {
  const { clubs } = useContent()
  const navigate = useNavigate()
  const toast = useToast()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  return (
    <div>
      <AdminHeader title="Clubs" description="Extracurricular groups shown under School Life." addLabel="Add Club" addTo="/admin/clubs/new" />
      <div className="overflow-x-auto rounded-lg bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand text-white"><tr><th className="px-3 py-2">Club</th><th className="px-3 py-2">Advisor</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead>
          <tbody>{clubs.map((c) => (
            <tr key={c.id} className="border-b border-brand/10">
              <td className="px-3 py-2 font-medium">{c.name}</td>
              <td className="px-3 py-2">{c.coordinator}</td>
              <td className="px-3 py-2"><StatusBadge status={c.active ? 'active' : 'inactive'} /></td>
              <td className="px-3 py-2"><ActionsMenu items={[{ label: 'Edit', onClick: () => navigate(`/admin/clubs/${c.id}/edit`) }, { label: 'Delete', danger: true, onClick: () => setDeleteId(c.id) }]} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <ConfirmDialog open={Boolean(deleteId)} title="Delete this club?" body="This action cannot be undone." onCancel={() => setDeleteId(null)} onConfirm={() => { if (deleteId) clubService.remove(deleteId); toast.push('Club deleted.'); setDeleteId(null) }} />
    </div>
  )
}

export function ClubEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const existing = isNew ? undefined : clubService.get(id)
  const [form, setForm] = useState<Club>(existing ?? { id: crypto.randomUUID(), slug: '', name: '', description: '', coordinator: '', meeting: '', achievements: [], photos: [], gallery: [], image: '', active: true, createdAt: nowIso(), updatedAt: nowIso() })
  const [dirty, setDirty] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const set = (p: Partial<Club>) => { setForm((f) => ({ ...f, ...p })); setDirty(true) }
  return (
    <EditorShell title={isNew ? 'Add club' : 'Edit club'} backTo="/admin/clubs" dirty={dirty} actions={<button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={() => { const next = { ...form, slug: form.slug || slugify(form.name), meeting: [form.meetingDay, form.meetingTime, form.meetingLocation].filter(Boolean).join(' · ') || form.meeting }; clubService.save(next); setDirty(false); toast.push('Club saved.'); if (isNew) navigate(`/admin/clubs/${next.id}/edit`, { replace: true }) }}>Save</button>}>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4 rounded-lg bg-white p-5">
          <Field label="Club name"><input className={adminInput} value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <RichTextEditor label="Description" value={form.description} onChange={(description) => set({ description })} />
          <Field label="Faculty advisor"><input className={adminInput} value={form.coordinator} onChange={(e) => set({ coordinator: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Meeting day"><input className={adminInput} value={form.meetingDay ?? ''} onChange={(e) => set({ meetingDay: e.target.value })} /></Field>
            <Field label="Meeting time"><input className={adminInput} value={form.meetingTime ?? ''} onChange={(e) => set({ meetingTime: e.target.value })} /></Field>
            <Field label="Location"><input className={adminInput} value={form.meetingLocation ?? ''} onChange={(e) => set({ meetingLocation: e.target.value })} /></Field>
          </div>
          <Field label="Contact"><input className={adminInput} value={form.contact ?? ''} onChange={(e) => set({ contact: e.target.value })} /></Field>
          <Field label="Achievements"><StringList values={form.achievements} onChange={(achievements) => set({ achievements })} placeholder="Add an achievement" /></Field>
        </div>
        <div className="space-y-4 rounded-lg bg-white p-5">
          <ImageUploader label="Club image" value={form.imageMedia || form.image} onChange={(file, url) => set({ imageMedia: file, image: url })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Active</label>
        </div>
      </div>
    </EditorShell>
  )
}

export function SportList() {
  const { sports } = useContent()
  const navigate = useNavigate()
  const toast = useToast()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  return (
    <div>
      <AdminHeader title="Sports" description="Teams, fixtures and results for the sports hub." addLabel="Add Sport" addTo="/admin/sports/new" />
      <table className="w-full text-left text-sm">
        <thead className="bg-brand text-white"><tr><th className="px-3 py-2">Sport</th><th className="px-3 py-2">Coach</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead>
        <tbody>{sports.map((s) => (
          <tr key={s.id} className="border-b border-brand/10 bg-white">
            <td className="px-3 py-2 font-medium">{s.name}</td>
            <td className="px-3 py-2">{s.coach}</td>
            <td className="px-3 py-2"><StatusBadge status={s.active ? 'active' : 'inactive'} /></td>
            <td className="px-3 py-2"><ActionsMenu items={[{ label: 'Edit', onClick: () => navigate(`/admin/sports/${s.id}/edit`) }, { label: 'Delete', danger: true, onClick: () => setDeleteId(s.id) }]} /></td>
          </tr>
        ))}</tbody>
      </table>
      <ConfirmDialog open={Boolean(deleteId)} title="Delete this sport?" body="This action cannot be undone." onCancel={() => setDeleteId(null)} onConfirm={() => { if (deleteId) sportService.remove(deleteId); toast.push('Sport deleted.'); setDeleteId(null) }} />
    </div>
  )
}

export function SportEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const existing = isNew ? undefined : sportService.get(id)
  const [form, setForm] = useState<Sport>(existing ?? { id: crypto.randomUUID(), slug: '', name: '', overview: '', coach: '', teams: [], fixtures: [], achievements: [], photos: [], gallery: [], image: '', active: true, createdAt: nowIso(), updatedAt: nowIso() })
  const [dirty, setDirty] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const set = (p: Partial<Sport>) => { setForm((f) => ({ ...f, ...p })); setDirty(true) }
  const addFixture = () => set({ fixtures: [...form.fixtures, { id: crypto.randomUUID(), opponent: '', date: nowIso().slice(0, 10), venue: 'Home' }] })
  return (
    <EditorShell title={isNew ? 'Add sport' : 'Edit sport'} backTo="/admin/sports" dirty={dirty} actions={<button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={() => { const next = { ...form, slug: form.slug || slugify(form.name) }; sportService.save(next); setDirty(false); toast.push('Sport saved.'); if (isNew) navigate(`/admin/sports/${next.id}/edit`, { replace: true }) }}>Save</button>}>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4 rounded-lg bg-white p-5">
          <Field label="Sport name"><input className={adminInput} value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <RichTextEditor label="Description" value={form.overview} onChange={(overview) => set({ overview })} />
          <Field label="Coach"><input className={adminInput} value={form.coach} onChange={(e) => set({ coach: e.target.value })} /></Field>
          <Field label="Assistant coach"><input className={adminInput} value={form.assistantCoach ?? ''} onChange={(e) => set({ assistantCoach: e.target.value })} /></Field>
          <Field label="Team category"><input className={adminInput} value={form.teamCategory ?? ''} onChange={(e) => set({ teamCategory: e.target.value })} /></Field>
          <Field label="Training schedule"><input className={adminInput} value={form.trainingSchedule ?? ''} onChange={(e) => set({ trainingSchedule: e.target.value })} /></Field>
          <Field label="Active season"><input className={adminInput} value={form.activeSeason ?? ''} onChange={(e) => set({ activeSeason: e.target.value })} /></Field>
          <Field label="Teams"><StringList values={form.teams} onChange={(teams) => set({ teams })} placeholder="Add a team" /></Field>
          <Field label="Achievements"><StringList values={form.achievements} onChange={(achievements) => set({ achievements })} placeholder="Add an achievement" /></Field>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-brand">Fixtures & results</p>
              <button type="button" className="text-sm font-medium text-brand" onClick={addFixture}>Add fixture</button>
            </div>
            <div className="space-y-2">
              {form.fixtures.map((fx, i) => (
                <div key={fx.id} className="grid gap-2 rounded border border-brand/10 p-2 sm:grid-cols-6">
                  <input className={adminInput} placeholder="Opponent" value={fx.opponent} onChange={(e) => set({ fixtures: form.fixtures.map((f, idx) => idx === i ? { ...f, opponent: e.target.value } : f) })} />
                  <input className={adminInput} placeholder="Competition" value={fx.competition ?? ''} onChange={(e) => set({ fixtures: form.fixtures.map((f, idx) => idx === i ? { ...f, competition: e.target.value } : f) })} />
                  <input type="date" className={adminInput} value={fx.date} onChange={(e) => set({ fixtures: form.fixtures.map((f, idx) => idx === i ? { ...f, date: e.target.value } : f) })} />
                  <input className={adminInput} placeholder="Time" value={fx.time ?? ''} onChange={(e) => set({ fixtures: form.fixtures.map((f, idx) => idx === i ? { ...f, time: e.target.value } : f) })} />
                  <input className={adminInput} placeholder="Venue" value={fx.venue} onChange={(e) => set({ fixtures: form.fixtures.map((f, idx) => idx === i ? { ...f, venue: e.target.value } : f) })} />
                  <input className={adminInput} placeholder="Result / score" value={fx.result ?? fx.score ?? ''} onChange={(e) => set({ fixtures: form.fixtures.map((f, idx) => idx === i ? { ...f, result: e.target.value, score: e.target.value } : f) })} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4 rounded-lg bg-white p-5">
          <ImageUploader label="Image" value={form.imageMedia || form.image} onChange={(file, url) => set({ imageMedia: file, image: url })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Active</label>
        </div>
      </div>
    </EditorShell>
  )
}

export function AlbumList() {
  const { albums } = useContent()
  const navigate = useNavigate()
  const toast = useToast()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  return (
    <div>
      <AdminHeader title="Gallery" description="Create albums and upload photographs for the public gallery." addLabel="Create Album" addTo="/admin/gallery/new" />
      {albums.length === 0 ? <AdminEmpty title="No albums yet" body="Create an album and upload images." actionLabel="Create Album" actionTo="/admin/gallery/new" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {albums.map((a) => (
            <article key={a.id} className="overflow-hidden rounded-lg bg-white shadow-[var(--shadow-card)]">
              {a.cover?.url || a.images[0]?.src ? <img src={a.cover?.url || a.images[0]?.src} alt="" className="h-36 w-full object-cover" /> : <div className="h-36 bg-cream" />}
              <div className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium text-brand">{a.title}</p>
                  <p className="text-xs text-muted">{a.images.length} photos · {a.status}</p>
                </div>
                <ActionsMenu items={[{ label: 'Edit', onClick: () => navigate(`/admin/gallery/${a.id}/edit`) }, { label: 'Delete', danger: true, onClick: () => setDeleteId(a.id) }]} />
              </div>
            </article>
          ))}
        </div>
      )}
      <ConfirmDialog open={Boolean(deleteId)} title={deleteConfirmCopy().title} body={deleteConfirmCopy().body} confirmLabel={deleteConfirmCopy().confirmLabel} onCancel={() => setDeleteId(null)} onConfirm={async () => {
        if (!deleteId) return
        try {
          const result = await albumService.remove(deleteId)
          toast.push(writeMessage(result, 'Album deleted.'))
        } catch (err) {
          toast.push(conflictText(err), 'error')
        }
        setDeleteId(null)
      }} />
    </div>
  )
}

export function AlbumEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const existing = isNew ? undefined : albumService.get(id)
  const [form, setForm] = useState<GalleryAlbum>(existing ?? { id: crypto.randomUUID(), slug: '', title: '', description: '', category: 'Campus Life', status: 'draft', images: [], createdAt: nowIso(), updatedAt: nowIso() })
  const [dirty, setDirty] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const set = (p: Partial<GalleryAlbum>) => { setForm((f) => ({ ...f, ...p })); setDirty(true) }
  return (
    <EditorShell title={isNew ? 'Create album' : 'Edit album'} backTo="/admin/gallery" dirty={dirty} actions={<button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={async () => {
      const next = { ...form, slug: form.slug || slugify(form.title) }
      try {
        const result = await albumService.save(next)
        setDirty(false)
        toast.push(writeMessage(result, 'Album saved.'))
        if (result.mode === 'pending') navigate('/admin/changes', { replace: true })
        else if (isNew) navigate(`/admin/gallery/${next.id}/edit`, { replace: true })
      } catch (err) {
        toast.push(conflictText(err), 'error')
      }
    }}>{submitLabel()}</button>}>
      <div className="space-y-4 rounded-lg bg-white p-5">
        <Field label="Album title"><input className={adminInput} value={form.title} onChange={(e) => set({ title: e.target.value, slug: slugify(e.target.value) })} /></Field>
        <Field label="Description"><textarea className={adminInput} rows={3} value={form.description} onChange={(e) => set({ description: e.target.value })} /></Field>
        <ImageUploader label="Cover image" value={form.cover} onChange={(file) => set({ cover: file })} />
        <Field label="Category"><select className={adminInput} value={form.category} onChange={(e) => set({ category: e.target.value as GalleryAlbum['category'] })}>{['Academic', 'Sports', 'Graduation', 'Clubs', 'Special Events', 'Campus Life'].map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Event date"><input type="date" className={adminInput} value={form.eventDate ?? ''} onChange={(e) => set({ eventDate: e.target.value })} /></Field>
        <Field label="Status"><select className={adminInput} value={form.status} onChange={(e) => set({ status: e.target.value as GalleryAlbum['status'] })}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
        <div>
          <p className="mb-2 text-sm font-medium text-brand">Images</p>
          <input type="file" accept="image/*" multiple onChange={async (e) => {
            const uploaded: GalleryItem[] = []
            for (const file of [...(e.target.files ?? [])]) {
              const stored = await storeMediaFile(file)
              mediaLibraryService.add(stored)
              uploaded.push({ id: crypto.randomUUID(), src: stored.url, alt: file.name, category: form.category, album: form.title, albumSlug: form.slug || slugify(form.title), media: stored, order: form.images.length + uploaded.length })
            }
            set({ images: [...form.images, ...uploaded] })
            e.target.value = ''
          }} />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {form.images.map((img, i) => (
              <div key={img.id} className="rounded border p-2">
                <img src={img.src} alt={img.alt} className="h-24 w-full object-cover" />
                <input className="mt-1 w-full text-xs" placeholder="Caption" value={img.caption ?? ''} onChange={(e) => set({ images: form.images.map((g, idx) => idx === i ? { ...g, caption: e.target.value, alt: e.target.value || g.alt } : g) })} />
                <button type="button" className="text-xs text-red-700" onClick={() => set({ images: form.images.filter((g) => g.id !== img.id) })}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </EditorShell>
  )
}

export function DocumentList() {
  const { resources } = useContent()
  const navigate = useNavigate()
  const toast = useToast()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [cat, setCat] = useState('All')
  const filtered = resources.filter((r) => cat === 'All' || r.category === cat)
  const { query, setQuery, page, setPage, paged } = useAdminList(filtered, 12, (r, q) => r.name.toLowerCase().includes(q))
  return (
    <div>
      <AdminHeader title="Documents" description="Upload handbooks, booklists and forms for the public Downloads page." addLabel="Upload Document" addTo="/admin/documents/new" />
      <div className="mb-4 flex gap-3">
        <AdminSearch value={query} onChange={setQuery} placeholder="Search documents..." />
        <select className="rounded-md border border-brand/20 px-3 py-2 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
          {['All', 'Booklists', 'Student Handbook', 'School Policies', 'Examination Timetables', 'Forms', 'Calendars', 'Newsletters', 'Parent Resources', 'Other'].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      {paged.total === 0 ? <AdminEmpty title="No documents" body="Upload a PDF or Office file to share it with families." actionLabel="Upload Document" actionTo="/admin/documents/new" /> : (
        <table className="w-full text-left text-sm">
          <thead className="bg-brand text-white"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Uploaded</th><th className="px-3 py-2">Size</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead>
          <tbody>{paged.items.map((r) => (
            <tr key={r.id} className="border-b border-brand/10 bg-white">
              <td className="px-3 py-2 font-medium">{r.name}</td>
              <td className="px-3 py-2">{r.category}</td>
              <td className="px-3 py-2">{r.fileType}</td>
              <td className="px-3 py-2">{formatDate(r.uploadedAt)}</td>
              <td className="px-3 py-2">{r.size}</td>
              <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
              <td className="px-3 py-2"><ActionsMenu items={[{ label: 'Edit', onClick: () => navigate(`/admin/documents/${r.id}/edit`) }, { label: 'Delete', danger: true, onClick: () => setDeleteId(r.id) }]} /></td>
            </tr>
          ))}</tbody>
        </table>
      )}
      <AdminPager page={paged.page} totalPages={paged.totalPages} total={paged.total} perPage={12} onChange={setPage} />
      <ConfirmDialog open={Boolean(deleteId)} title={deleteConfirmCopy().title} body={deleteConfirmCopy().body} confirmLabel={deleteConfirmCopy().confirmLabel} onCancel={() => setDeleteId(null)} onConfirm={async () => {
        if (!deleteId) return
        try {
          const result = await documentService.remove(deleteId)
          toast.push(writeMessage(result, 'Document deleted.'))
        } catch (err) {
          toast.push(conflictText(err), 'error')
        }
        setDeleteId(null)
      }} />
    </div>
  )
}

export function DocumentEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const existing = isNew ? undefined : documentService.get(id)
  const [form, setForm] = useState<ResourceItem>(existing ?? { id: crypto.randomUUID(), name: '', category: 'Other', fileType: 'PDF', uploadedAt: nowIso().slice(0, 10), size: '—', href: '#', status: 'published', createdAt: nowIso(), updatedAt: nowIso() })
  const [dirty, setDirty] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const set = (p: Partial<ResourceItem>) => { setForm((f) => ({ ...f, ...p })); setDirty(true) }
  return (
    <EditorShell title={isNew ? 'Upload document' : 'Edit document'} backTo="/admin/documents" dirty={dirty} actions={<button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={async () => {
      if (!form.name.trim()) { toast.push('Enter a document title.', 'error'); return }
      try {
        const result = await documentService.save(form)
        setDirty(false)
        toast.push(writeMessage(result, 'Document saved.'))
        if (result.mode === 'pending') navigate('/admin/changes', { replace: true })
        else if (isNew) navigate(`/admin/documents/${form.id}/edit`, { replace: true })
      } catch (err) {
        toast.push(conflictText(err), 'error')
      }
    }}>{submitLabel()}</button>}>
      <div className="max-w-xl space-y-4 rounded-lg bg-white p-5">
        <Field label="Document title"><input className={adminInput} value={form.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label="Category"><select className={adminInput} value={form.category} onChange={(e) => set({ category: e.target.value as ResourceItem['category'] })}>{['Booklists', 'Student Handbook', 'School Policies', 'Examination Timetables', 'Application Forms', 'Forms', 'Academic Calendars', 'Calendars', 'Newsletters', 'Parent Forms', 'Student Forms', 'Parent Resources', 'Other'].map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Description"><textarea className={adminInput} rows={3} value={form.description ?? ''} onChange={(e) => set({ description: e.target.value })} /></Field>
        <Field label="Academic year"><input className={adminInput} value={form.academicYear ?? ''} onChange={(e) => set({ academicYear: e.target.value })} /></Field>
        <Field label="Publish date"><input type="date" className={adminInput} value={(form.publishedAt ?? '').slice(0, 10)} onChange={(e) => set({ publishedAt: e.target.value })} /></Field>
        <Field label="Status"><select className={adminInput} value={form.status} onChange={(e) => set({ status: e.target.value as ResourceItem['status'] })}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
        <label className="block text-sm font-medium text-brand">File
          <input type="file" className="mt-1 block" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const err = validateDocumentFile(file)
            if (err) { toast.push(err, 'error'); return }
            const stored = await storeMediaFile(file, { kind: 'document' })
            mediaLibraryService.add(stored)
            set({ file: stored, href: stored.url, fileType: file.name.split('.').pop()?.toUpperCase() || 'FILE', size: formatSize(stored.size), uploadedAt: nowIso().slice(0, 10) })
            toast.push('File uploaded successfully.')
          }} />
        </label>
        {form.file && <p className="text-sm text-muted">Current file: {form.file.name} ({form.size}). Upload another file to replace it.</p>}
      </div>
    </EditorShell>
  )
}

export function HomepageEditor() {
  const { homepage, statistics } = useContent()
  const { homepage_sections, refresh } = useTenant()
  const [form, setForm] = useState<HomepageContent>(homepage)
  const [stats, setStats] = useState(statistics)
  const [sections, setSections] = useState(() =>
    homepage_sections.length
      ? homepage_sections
      : homepage.sections.map((s, i) => ({ id: s.id, section_type: s.id, label: s.label, variant: s.variant || 'default', enabled: s.enabled, position: i })),
  )
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  useEffect(() => {
    if (!dirty && homepage_sections.length) setSections(homepage_sections)
  }, [homepage_sections, dirty])
  const set = (p: Partial<HomepageContent>) => { setForm((f) => ({ ...f, ...p })); setDirty(true) }
  const move = (i: number, dir: -1 | 1) => {
    const next = [...sections]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setSections(next.map((item, index) => ({ ...item, position: index })))
    setDirty(true)
  }
  const used = new Set(sections.map((s) => s.section_type))
  return (
    <EditorShell title="Homepage" backTo="/admin" dirty={dirty} actions={<button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark disabled:opacity-50" disabled={busy} onClick={async () => {
      setBusy(true)
      try {
        const bundle = await homepageService.save(form, stats)
        const layout = await homepageService.saveSections(sections.map((s, i) => ({
          id: s.id,
          section_type: s.section_type,
          variant: s.variant || 'default',
          enabled: s.enabled,
          position: i,
        })))
        await refresh()
        setDirty(false)
        toast.push(writeMessage(bundle.mode === 'pending' ? bundle : layout, 'Homepage updated successfully.'))
      } catch (err) {
        toast.push(conflictText(err), 'error')
      } finally {
        setBusy(false)
      }
    }}>{busy ? 'Saving…' : submitLabel()}</button>}>
      <div className="space-y-6">
        <section className="rounded-lg bg-white p-5">
          <h2 className="font-display font-bold text-brand">Hero</h2>
          <div className="mt-4 grid gap-4">
            <Field label="Heading"><input className={adminInput} value={form.heroTitle} onChange={(e) => set({ heroTitle: e.target.value })} /></Field>
            <Field label="Subheading"><input className={adminInput} value={form.heroTagline} onChange={(e) => set({ heroTagline: e.target.value })} /></Field>
            <Field label="Eyebrow"><input className={adminInput} value={form.heroEyebrow} onChange={(e) => set({ heroEyebrow: e.target.value })} /></Field>
            <ImageUploader label="Hero background image" value={form.heroImageMedia || form.heroImage} onChange={(file, url) => set({ heroImageMedia: file, heroImage: url })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Primary button label"><input className={adminInput} value={form.primaryButtonLabel} onChange={(e) => set({ primaryButtonLabel: e.target.value })} /></Field>
              <Field label="Primary button URL"><input className={adminInput} value={form.primaryButtonUrl} onChange={(e) => set({ primaryButtonUrl: e.target.value })} /></Field>
              <Field label="Secondary button label"><input className={adminInput} value={form.secondaryButtonLabel} onChange={(e) => set({ secondaryButtonLabel: e.target.value })} /></Field>
              <Field label="Secondary button URL"><input className={adminInput} value={form.secondaryButtonUrl} onChange={(e) => set({ secondaryButtonUrl: e.target.value })} /></Field>
            </div>
          </div>
        </section>
        <section className="rounded-lg bg-white p-5">
          <h2 className="font-display font-bold text-brand">Welcome</h2>
          <div className="mt-4 space-y-4">
            <Field label="Heading"><input className={adminInput} value={form.welcomeTitle} onChange={(e) => set({ welcomeTitle: e.target.value })} /></Field>
            <Field label="Description"><textarea className={adminInput} rows={5} value={form.welcomeBody.join('\n\n')} onChange={(e) => set({ welcomeBody: e.target.value.split('\n\n') })} /></Field>
            <ImageUploader label="Welcome image" value={form.welcomeImageMedia || form.welcomeImage} onChange={(file, url) => set({ welcomeImageMedia: file, welcomeImage: url })} />
            <Field label="Button label"><input className={adminInput} value={form.welcomeButtonLabel} onChange={(e) => set({ welcomeButtonLabel: e.target.value })} /></Field>
            <Field label="Button link"><input className={adminInput} value={form.welcomeButtonUrl} onChange={(e) => set({ welcomeButtonUrl: e.target.value })} /></Field>
          </div>
        </section>
        <section className="rounded-lg bg-white p-5">
          <h2 className="font-display font-bold text-brand">Statistics</h2>
          <div className="mt-4 space-y-3">
            {stats.map((s, i) => (
              <div key={s.id} className="grid gap-2 sm:grid-cols-5">
                <input className={adminInput} value={s.label} onChange={(e) => { const next = [...stats]; next[i] = { ...s, label: e.target.value }; setStats(next); setDirty(true) }} />
                <input type="number" className={adminInput} value={s.value} onChange={(e) => { const next = [...stats]; next[i] = { ...s, value: Number(e.target.value) }; setStats(next); setDirty(true) }} />
                <input className={adminInput} placeholder="suffix" value={s.suffix ?? ''} onChange={(e) => { const next = [...stats]; next[i] = { ...s, suffix: e.target.value }; setStats(next); setDirty(true) }} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.visible} onChange={(e) => { const next = [...stats]; next[i] = { ...s, visible: e.target.checked }; setStats(next); setDirty(true) }} /> Visible</label>
                <button type="button" className="text-sm text-red-700" onClick={() => { setStats(stats.filter((x) => x.id !== s.id)); setDirty(true) }}>Remove</button>
              </div>
            ))}
            <button type="button" className="text-sm font-medium text-brand" onClick={() => { setStats([...stats, { id: crypto.randomUUID(), label: 'New statistic', value: 0, visible: true, order: stats.length + 1 }]); setDirty(true) }}>Add statistic</button>
          </div>
        </section>
        <section className="rounded-lg bg-white p-5">
          <h2 className="font-display font-bold text-brand">Homepage sections</h2>
          <p className="mt-1 text-sm text-muted">Order, enable, and choose a visual variant. These control the public homepage for this school only.</p>
          <ul className="mt-4 space-y-2">
            {sections.map((s, i) => (
              <li key={s.id} className="grid items-center gap-2 rounded border border-brand/10 px-3 py-2 md:grid-cols-[1fr_10rem_auto]">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={s.enabled} onChange={(e) => { setSections(sections.map((x) => x.id === s.id ? { ...x, enabled: e.target.checked } : x)); setDirty(true) }} />
                  {s.label || s.section_type}
                </label>
                <select className={adminInput} value={s.variant || 'default'} onChange={(e) => { setSections(sections.map((x) => x.id === s.id ? { ...x, variant: e.target.value } : x)); setDirty(true) }}>
                  {variantsFor(s.section_type).map((option) => <option key={option}>{option}</option>)}
                </select>
                <span className="flex gap-2 text-xs">
                  <button type="button" onClick={() => move(i, -1)}>Up</button>
                  <button type="button" onClick={() => move(i, 1)}>Down</button>
                  <button type="button" className="text-red-700" onClick={() => { setSections(sections.filter((x) => x.id !== s.id)); setDirty(true) }}>Remove</button>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <label className="text-sm font-medium text-brand">Add section
              <select className={`${adminInput} mt-1`} defaultValue="" onChange={(e) => {
                const type = e.target.value
                if (!type) return
                const meta = SECTION_CATALOG.find((item) => item.id === type)
                setSections([...sections, { id: crypto.randomUUID(), section_type: type, label: meta?.label || type, variant: meta?.variants[0] || 'default', enabled: true, position: sections.length }])
                setDirty(true)
                e.target.value = ''
              }}>
                <option value="">Select a section type</option>
                {SECTION_CATALOG.filter((item) => !used.has(item.id)).map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
            </label>
          </div>
        </section>
      </div>
    </EditorShell>
  )
}

export function MediaLibraryPage() {
  const { mediaLibrary } = useContent()
  const toast = useToast()
  const [kind, setKind] = useState('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const filtered = mediaLibrary.filter((m) => kind === 'all' || m.kind === kind)
  const { query, setQuery, page, setPage, paged } = useAdminList(
    filtered,
    18,
    (m, q) => m.name.toLowerCase().includes(q) || (m.alt || '').toLowerCase().includes(q),
  )
  return (
    <div>
      <AdminHeader title="Media library" description="Reuse uploaded images and documents across the website." />
      <div className="mb-4 flex gap-3">
        <AdminSearch value={query} onChange={setQuery} placeholder="Search media..." />
        <select className="rounded-md border px-3 py-2 text-sm" value={kind} onChange={(e) => { setKind(e.target.value); setPage(1) }}>
          <option value="all">All</option>
          <option value="image">Images</option>
          <option value="document">Documents</option>
        </select>
      </div>
      {paged.total === 0 ? <AdminEmpty title="No media yet" body="Files you upload in News, Staff or Documents will appear here." /> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {paged.items.map((m) => (
            <article key={m.id} className="rounded-lg bg-white p-2 shadow-[var(--shadow-card)]">
              {m.kind === 'image' ? <img src={m.url} alt={m.alt} className="h-24 w-full rounded object-cover" loading="lazy" /> : <div className="flex h-24 items-center justify-center bg-cream text-xs">{m.mimeType}</div>}
              <p className="mt-1 truncate text-xs">{m.name}</p>
              <button type="button" className="text-xs text-red-700" onClick={() => setDeleteId(m.id)}>Delete</button>
            </article>
          ))}
        </div>
      )}
      <AdminPager page={paged.page} totalPages={paged.totalPages} total={paged.total} perPage={18} onChange={setPage} />
      <ConfirmDialog open={Boolean(deleteId)} title="Delete this file?" body="Pages still using it may show a missing image." onCancel={() => setDeleteId(null)} onConfirm={() => { if (deleteId) mediaLibraryService.remove(deleteId); toast.push('Media deleted.'); setDeleteId(null) }} />
    </div>
  )
}

export function ContactEditor() {
  const { contact } = useContent()
  const [form, setForm] = useState<ContactInfo>(contact)
  const [dirty, setDirty] = useState(false)
  const toast = useToast()
  return (
    <EditorShell title="Contact details" backTo="/admin" dirty={dirty} actions={<button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={async () => {
      try {
        const result = await settingsService.saveContact(form)
        setDirty(false)
        toast.push(writeMessage(result, 'Contact details saved.'))
      } catch (err) {
        toast.push(conflictText(err), 'error')
      }
    }}>{submitLabel()}</button>}>
      <div className="max-w-xl space-y-4 rounded-lg bg-white p-5">
        <Field label="School name"><input className={adminInput} value={form.schoolName} onChange={(e) => { setForm({ ...form, schoolName: e.target.value }); setDirty(true) }} /></Field>
        <Field label="Address"><textarea className={adminInput} rows={3} value={form.addressLines.join('\n')} onChange={(e) => { setForm({ ...form, addressLines: e.target.value.split('\n') }); setDirty(true) }} /></Field>
        <Field label="Phone numbers"><input className={adminInput} value={form.phone.join(', ')} onChange={(e) => { setForm({ ...form, phone: e.target.value.split(',').map((s) => s.trim()) }); setDirty(true) }} /></Field>
        <Field label="General email"><input className={adminInput} value={form.generalEmail ?? ''} onChange={(e) => { setForm({ ...form, generalEmail: e.target.value, email: [e.target.value, form.admissionsEmail ?? ''].filter(Boolean) }); setDirty(true) }} /></Field>
        <Field label="Admissions email"><input className={adminInput} value={form.admissionsEmail ?? ''} onChange={(e) => { setForm({ ...form, admissionsEmail: e.target.value }); setDirty(true) }} /></Field>
        <Field label="Office hours"><input className={adminInput} value={form.officeHours} onChange={(e) => { setForm({ ...form, officeHours: e.target.value }); setDirty(true) }} /></Field>
        <Field label="Google Maps embed URL"><textarea className={adminInput} rows={3} value={form.mapEmbedUrl} onChange={(e) => { setForm({ ...form, mapEmbedUrl: e.target.value }); setDirty(true) }} /></Field>
      </div>
    </EditorShell>
  )
}

export function SocialEditor() {
  const { contact } = useContent()
  const platforms = ['Facebook', 'Instagram', 'YouTube', 'TikTok', 'X/Twitter', 'LinkedIn']
  const [links, setLinks] = useState(() => platforms.map((p) => contact.social.find((s) => s.platform === p) ?? { platform: p, href: '', enabled: false }))
  const [dirty, setDirty] = useState(false)
  const toast = useToast()
  return (
    <EditorShell title="Social media" backTo="/admin" dirty={dirty} actions={<button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={async () => {
      try {
        const result = await settingsService.saveContact({ ...contact, social: links })
        setDirty(false)
        toast.push(writeMessage(result, 'Social links saved.'))
      } catch (err) {
        toast.push(conflictText(err), 'error')
      }
    }}>{submitLabel()}</button>}>
      <div className="max-w-xl space-y-4 rounded-lg bg-white p-5">
        {links.map((s, i) => (
          <div key={s.platform} className="grid gap-2 sm:grid-cols-[120px_1fr_auto] sm:items-center">
            <p className="text-sm font-medium">{s.platform}</p>
            <input className={adminInput} placeholder="https://" value={s.href} onChange={(e) => { const next = [...links]; next[i] = { ...s, href: e.target.value }; setLinks(next); setDirty(true) }} />
            <label className="text-sm"><input type="checkbox" checked={s.enabled} onChange={(e) => { const next = [...links]; next[i] = { ...s, enabled: e.target.checked }; setLinks(next); setDirty(true) }} /> Enabled</label>
          </div>
        ))}
      </div>
    </EditorShell>
  )
}

export function BrandingEditor() {
  const { branding } = useContent()
  const { refresh } = useTenant()
  const [form, setForm] = useState<BrandingSettings>(branding)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const contrastOk = (hex: string) => {
    const c = hex.replace('#', '')
    const r = parseInt(c.slice(0, 2), 16)
    const g = parseInt(c.slice(2, 4), 16)
    const b = parseInt(c.slice(4, 6), 16)
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return l < 0.65
  }
  return (
    <EditorShell title="Branding" backTo="/admin" dirty={dirty} actions={<button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark disabled:opacity-50" disabled={busy} onClick={async () => {
      if (!contrastOk(form.primaryColor)) { toast.push('Primary colour is too light for accessible text. Choose a darker shade.', 'error'); return }
      setBusy(true)
      try {
        const persistable = (url?: string) => url && !url.startsWith('blob:') && !url.startsWith('data:') ? url : undefined
        const result = await settingsService.saveBranding({
          ...form,
          crestUrl: persistable(form.crestUrl) || persistable(form.crestMedia?.url) || form.crestUrl,
          faviconUrl: persistable(form.faviconUrl) || persistable(form.faviconMedia?.url) || form.faviconUrl,
        })
        await refresh()
        setDirty(false)
        toast.push(writeMessage(result, 'Branding saved. The public site will use these colours and logos.'))
      } catch (err) {
        toast.push(conflictText(err), 'error')
      } finally {
        setBusy(false)
      }
    }}>{busy ? 'Saving…' : 'Save'}</button>}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg bg-white p-5">
          <Field label="School name"><input className={adminInput} value={form.schoolName} onChange={(e) => { setForm({ ...form, schoolName: e.target.value }); setDirty(true) }} /></Field>
          <Field label="Motto"><input className={adminInput} value={form.motto} onChange={(e) => { setForm({ ...form, motto: e.target.value }); setDirty(true) }} /></Field>
          <Field label="Motto translation"><input className={adminInput} value={form.mottoTranslation ?? ''} onChange={(e) => { setForm({ ...form, mottoTranslation: e.target.value }); setDirty(true) }} placeholder="Optional English rendering" /></Field>
          <Field label="Founded"><input className={adminInput} value={form.established ?? ''} onChange={(e) => { setForm({ ...form, established: e.target.value }); setDirty(true) }} placeholder="Optional year, if known" /></Field>
          <Field label="Primary colour"><input type="color" value={form.primaryColor} onChange={(e) => { setForm({ ...form, primaryColor: e.target.value }); setDirty(true) }} /></Field>
          <Field label="Secondary colour"><input type="color" value={form.secondaryColor} onChange={(e) => { setForm({ ...form, secondaryColor: e.target.value }); setDirty(true) }} /></Field>
          <Field label="Accent colour"><input type="color" value={form.accentColor} onChange={(e) => { setForm({ ...form, accentColor: e.target.value }); setDirty(true) }} /></Field>
          <ImageUploader folder="logos" label="School crest / logo" value={form.crestMedia || form.crestUrl} onChange={(file, url) => { setForm({ ...form, crestMedia: file, crestUrl: url }); setDirty(true) }} />
          <ImageUploader folder="logos" label="Favicon" value={form.faviconMedia || form.faviconUrl} onChange={(file, url) => { setForm({ ...form, faviconMedia: file, faviconUrl: url }); setDirty(true) }} />
          <ImageUploader folder="logos" label="Footer logo" value={form.footerLogoMedia || form.footerLogoUrl} onChange={(file, url) => { setForm({ ...form, footerLogoMedia: file, footerLogoUrl: url }); setDirty(true) }} />
        </div>
        <div className="rounded-lg p-6 text-white" style={{ background: form.primaryColor }}>
          <p className="font-display text-xl font-bold">{form.schoolName}</p>
          <p style={{ color: form.secondaryColor }}>{form.motto}</p>
          <button type="button" className="mt-4 rounded-md px-4 py-2 text-sm font-semibold" style={{ background: form.secondaryColor, color: '#1A1A1A' }}>Sample button</button>
        </div>
      </div>
    </EditorShell>
  )
}

export function UsersEditor() {
  const toast = useToast()
  const navigate = useNavigate()
  const principal = isPrincipal()
  const schoolAdmin = isSchoolAdmin()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [busy, setBusy] = useState(false)
  const blankUser = (): AdminUser => ({ id: crypto.randomUUID(), name: '', email: '', role: principal ? 'Administrator' : 'Content Editor', status: 'active', password: '' })
  const roleOptions: UserRole[] = principal ? ['Administrator', 'Principal', 'Content Editor'] : ['Content Editor']
  const canEditUser = (user: AdminUser) => principal || (schoolAdmin && user.role === 'Content Editor')
  const actionsFor = (user: AdminUser) => {
    const items = principal ? [{ label: 'View activity', onClick: () => navigate(`/admin/activity/user/${user.id}`) }] : []
    if (!canEditUser(user)) return items
    items.push(
      { label: 'Edit', onClick: () => setEditing({ ...user, password: '' }) },
      { label: user.status === 'active' ? 'Disable' : 'Enable', onClick: () => { void persist({ ...user, status: user.status === 'active' ? 'disabled' : 'active', password: '' }, false) } },
      { label: 'Reset password', onClick: () => {
        const pw = window.prompt('New password (at least 8 characters)')
        if (pw) void persist({ ...user, password: pw }, false)
      } },
    )
    if (principal && user.role !== 'Principal') {
      items.splice(principal ? 2 : 1, 0, { label: 'Make Principal', onClick: () => { void persist({ ...user, role: 'Principal', password: '' }, false) } })
    }
    return items
  }

  const load = async () => {
    setLoading(true)
    try {
      setUsers(await usersService.list())
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Unable to load users.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const persist = async (next: AdminUser, isNew: boolean) => {
    if (!next.name.trim() || !next.email.trim()) {
      toast.push('Name and email are required.', 'error')
      return
    }
    if (isNew && next.password.trim().length < 8) {
      toast.push('Password must be at least 8 characters.', 'error')
      return
    }
    if (!principal) {
      next = { ...next, role: 'Content Editor' }
    }
    setBusy(true)
    try {
      await usersService.save(next, isNew)
      toast.push(isNew ? 'User created.' : 'User updated.')
      setEditing(null)
      await load()
    } catch (err) {
      toast.push(conflictText(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!canManageUsers()) return <Navigate to="/admin" replace />

  return (
    <div>
      <AdminHeader
        title="Users"
        description={principal
          ? 'Add administrators, editors and principals for this school. School administrators can manage editors only.'
          : 'You can add editors and change an editor’s password or role. Principal accounts cannot be changed from here.'}
        extra={<button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={() => setEditing(blankUser())}>+ Add user</button>}
      />
      {loading ? (
        <p className="text-sm text-muted">Loading users…</p>
      ) : users.length === 0 ? (
        <AdminEmpty title="No users yet" body={principal ? 'Add an administrator, principal or editor for this school.' : 'Add a content editor for this school.'} actionLabel="Add user" />
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-brand text-white"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead>
            <tbody>{users.map((u) => {
              const items = actionsFor(u)
              return (
              <tr key={u.id} className="border-b border-brand/10">
                <td className="px-3 py-2 font-medium text-brand">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2"><StatusBadge status={u.status} /></td>
                <td className="px-3 py-2">{items.length ? <ActionsMenu items={items} /> : <span className="text-muted">—</span>}</td>
              </tr>
              )
            })}</tbody>
          </table>
        </div>
      )}
      {editing && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-brand-dark/70" onClick={() => setEditing(null)} />
          <form
            className="relative w-full max-w-md space-y-3 rounded-lg bg-white p-5"
            onSubmit={(e) => {
              e.preventDefault()
              void persist(editing, !users.some((u) => u.id === editing.id))
            }}
          >
            <h2 className="font-display font-bold text-brand">{users.some((u) => u.id === editing.id) ? 'Edit user' : 'Add user'}</h2>
            <Field label="Name"><input className={adminInput} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Email"><input className={adminInput} value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
            <Field label="Role">
              <select className={adminInput} value={principal ? editing.role : 'Content Editor'} disabled={!principal} onChange={(e) => setEditing({ ...editing, role: e.target.value as UserRole })}>
                {roleOptions.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label={users.some((u) => u.id === editing.id) ? 'New password (optional)' : 'Password'} hint={users.some((u) => u.id === editing.id) ? 'Leave blank to keep the current password.' : 'At least 8 characters.'}>
              <input className={adminInput} type="password" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" disabled={busy} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
