import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Department, SchoolEvent, EventCategory, EventStatus, Announcement, AnnouncementType, AnnouncementPlacement } from '@/types'
import { ActionsMenu, AdminEmpty, AdminHeader, AdminPager, AdminSearch, EditorShell, Field, StatusBadge, StringList, adminInput, useAdminList } from '@/components/admin/AdminChrome'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { useContent } from '@/hooks/useContent'
import { announcementService, departmentService, eventService, writeMessage, conflictText } from '@/services/collections'
import { nowIso } from '@/services/normalize'
import { slugify, formatDate } from '@/utils'
import { useToast } from '@/components/admin/Toast'
import { deleteConfirmCopy, submitLabel } from '@/services/approvals'

export function DepartmentList() {
  const { departments, staff } = useContent()
  const navigate = useNavigate()
  const toast = useToast()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { query, setQuery, page, setPage, paged } = useAdminList(departments, 12, (d, q) => d.name.toLowerCase().includes(q))
  return (
    <div>
      <AdminHeader title="Departments" description="Edit department pages, heads of department and subject lists." addLabel="Add Department" addTo="/admin/departments/new" />
      <AdminSearch value={query} onChange={setQuery} placeholder="Search departments..." />
      <div className="mt-4 overflow-x-auto rounded-lg bg-white shadow-[var(--shadow-card)]">
        {paged.total === 0 ? <AdminEmpty title="No departments" body="Add a department to display it on the academics pages." actionLabel="Add Department" actionTo="/admin/departments/new" /> : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-brand text-white"><tr><th className="px-3 py-2">Department</th><th className="px-3 py-2">Head</th><th className="px-3 py-2">Staff</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead>
            <tbody>
              {paged.items.map((d) => (
                <tr key={d.id} className="border-b border-brand/10">
                  <td className="px-3 py-2 font-medium text-brand">{d.name}</td>
                  <td className="px-3 py-2">{d.headOfDepartment}</td>
                  <td className="px-3 py-2">{staff.filter((s) => s.department === d.name || d.teacherIds.includes(s.id)).length}</td>
                  <td className="px-3 py-2"><StatusBadge status={d.status} /></td>
                  <td className="px-3 py-2"><ActionsMenu items={[
                    { label: 'View', onClick: () => navigate(`/admin/departments/${d.id}`) },
                    { label: 'Edit', onClick: () => navigate(`/admin/departments/${d.id}/edit`) },
                    { label: 'Delete', danger: true, onClick: () => setDeleteId(d.id) },
                  ]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <AdminPager page={paged.page} totalPages={paged.totalPages} total={paged.total} perPage={12} onChange={setPage} />
      <ConfirmDialog open={Boolean(deleteId)} title="Delete this department?" body="This action cannot be undone." onCancel={() => setDeleteId(null)} onConfirm={() => { if (deleteId) departmentService.remove(deleteId); toast.push('Department deleted.'); setDeleteId(null) }} />
    </div>
  )
}

export function DepartmentEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const existing = isNew ? undefined : departmentService.get(id)
  const { staff } = useContent()
  const [form, setForm] = useState<Department>(existing ?? {
    id: crypto.randomUUID(), slug: '', name: '', overview: '', headOfDepartment: '', subjects: [], programmes: [], achievements: '', resources: [], image: '', teacherIds: [], displayOnWebsite: true, displayOrder: 99, status: 'active', createdAt: nowIso(), updatedAt: nowIso(),
  })
  const [dirty, setDirty] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const set = (p: Partial<Department>) => { setForm((f) => ({ ...f, ...p })); setDirty(true) }
  const save = () => {
    if (!form.name.trim()) { toast.push('Please enter a department name.', 'error'); return }
    const next = { ...form, slug: form.slug || slugify(form.name) }
    departmentService.save(next)
    setDirty(false)
    toast.push('Department saved.')
    if (isNew) navigate(`/admin/departments/${next.id}/edit`, { replace: true })
  }
  return (
    <EditorShell title={isNew ? 'Add department' : 'Edit department'} backTo="/admin/departments" lastSaved={form.updatedAt} dirty={dirty} actions={<button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={save}>Save</button>}>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4 rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
          <Field label="Department name"><input className={adminInput} value={form.name} onChange={(e) => set({ name: e.target.value, slug: slugify(e.target.value) })} /></Field>
          <Field label="Short name"><input className={adminInput} value={form.shortName ?? ''} onChange={(e) => set({ shortName: e.target.value })} /></Field>
          <RichTextEditor label="Overview" value={form.overview} onChange={(overview) => set({ overview })} />
          <Field label="Head of department">
            <select className={adminInput} value={form.headOfDepartmentId ?? ''} onChange={(e) => {
              const person = staff.find((s) => s.id === e.target.value)
              set({ headOfDepartmentId: e.target.value, headOfDepartment: person?.name ?? '' })
            }}>
              <option value="">Select staff member</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Subjects offered"><StringList values={form.subjects} onChange={(subjects) => set({ subjects })} placeholder="Type a subject and press Enter" /></Field>
          <Field label="Programmes"><StringList values={form.programmes} onChange={(programmes) => set({ programmes })} placeholder="Type a programme and press Enter" /></Field>
          <RichTextEditor label="Achievements" value={form.achievements} onChange={(achievements) => set({ achievements })} minHeight="120px" />
          <Field label="Contact email"><input className={adminInput} value={form.email ?? ''} onChange={(e) => set({ email: e.target.value })} /></Field>
        </div>
        <div className="space-y-4 rounded-lg bg-white p-5">
          <ImageUploader label="Department image" value={form.imageMedia || form.image} onChange={(file, url) => set({ imageMedia: file, image: url })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.displayOnWebsite} onChange={(e) => set({ displayOnWebsite: e.target.checked })} /> Show on website</label>
          <Field label="Display order"><input type="number" className={adminInput} value={form.displayOrder} onChange={(e) => set({ displayOrder: Number(e.target.value) })} /></Field>
          <Field label="Status"><select className={adminInput} value={form.status} onChange={(e) => set({ status: e.target.value as Department['status'] })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
        </div>
      </div>
    </EditorShell>
  )
}

export function EventList() {
  const { events } = useContent()
  const navigate = useNavigate()
  const toast = useToast()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { query, setQuery, page, setPage, paged } = useAdminList(events, 12, (e, q) => e.title.toLowerCase().includes(q))
  return (
    <div>
      <AdminHeader title="Events" description="School calendar items appear on /events and can be featured on the homepage." addLabel="Add Event" addTo="/admin/events/new" />
      <AdminSearch value={query} onChange={setQuery} placeholder="Search events..." />
      <div className="mt-4 overflow-x-auto rounded-lg bg-white shadow-[var(--shadow-card)]">
        {paged.total === 0 ? <AdminEmpty title="No events" body="Add an event to populate the school calendar." actionLabel="Add Event" actionTo="/admin/events/new" /> : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-brand text-white"><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Event</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Location</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead>
            <tbody>
              {paged.items.map((e) => (
                <tr key={e.id} className="border-b border-brand/10">
                  <td className="px-3 py-2">{formatDate(e.date)}</td>
                  <td className="max-w-xs break-words px-3 py-2 font-medium text-brand">{e.title}</td>
                  <td className="px-3 py-2">{e.category}</td>
                  <td className="px-3 py-2">{e.location}</td>
                  <td className="px-3 py-2"><StatusBadge status={e.status} /></td>
                  <td className="px-3 py-2"><ActionsMenu items={[
                    { label: 'View', onClick: () => navigate(`/admin/events/${e.id}`) },
                    { label: 'Edit', onClick: () => navigate(`/admin/events/${e.id}/edit`) },
                    { label: 'Duplicate', onClick: () => { eventService.duplicate(e.id); toast.push('Event duplicated.') } },
                    { label: 'Delete', danger: true, onClick: () => setDeleteId(e.id) },
                  ]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <AdminPager page={paged.page} totalPages={paged.totalPages} total={paged.total} perPage={12} onChange={setPage} />
      <ConfirmDialog open={Boolean(deleteId)} title={deleteConfirmCopy().title} body={deleteConfirmCopy().body} confirmLabel={deleteConfirmCopy().confirmLabel} onCancel={() => setDeleteId(null)} onConfirm={async () => {
        if (!deleteId) return
        try {
          const result = await eventService.remove(deleteId)
          toast.push(writeMessage(result, 'Event deleted.'))
        } catch (err) {
          toast.push(conflictText(err), 'error')
        }
        setDeleteId(null)
      }} />
    </div>
  )
}

export function EventEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const existing = isNew ? undefined : eventService.get(id)
  const [form, setForm] = useState<SchoolEvent>(existing ?? {
    id: crypto.randomUUID(), slug: '', title: '', description: '', date: nowIso().slice(0, 10), startTime: '8:30 a.m.', allDay: false, location: '', category: 'Academic', featured: false, showOnHomepage: true, status: 'draft', createdAt: nowIso(), updatedAt: nowIso(),
  })
  const [dirty, setDirty] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const set = (p: Partial<SchoolEvent>) => { setForm((f) => ({ ...f, ...p })); setDirty(true) }
  const save = async (status?: EventStatus) => {
    if (!form.title.trim()) { toast.push('Please enter an event name.', 'error'); return }
    const next = { ...form, slug: form.slug || slugify(form.title), status: status ?? form.status, image: form.featuredImage?.url || form.image }
    try {
      const result = await eventService.save(next)
      setDirty(false)
      toast.push(writeMessage(result, 'Event saved.'))
      if (result.mode === 'pending') navigate('/admin/changes', { replace: true })
      else if (isNew) navigate(`/admin/events/${next.id}/edit`, { replace: true })
    } catch (err) {
      toast.push(conflictText(err), 'error')
    }
  }
  const cats: EventCategory[] = ['Academic', 'Examinations', 'Sports', 'PTA', 'Holidays', 'Staff', 'Student activities', 'Graduation']
  return (
    <EditorShell title={isNew ? 'Add event' : 'Edit event'} backTo="/admin/events" lastSaved={form.updatedAt} dirty={dirty} actions={
      <>
        <button type="button" className="rounded-md border px-4 py-2 text-sm" onClick={() => save('draft')}>Save draft</button>
        <button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={() => save('published')}>{submitLabel()}</button>
      </>
    }>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4 rounded-lg bg-white p-5">
          <Field label="Event name"><input className={adminInput} value={form.title} onChange={(e) => set({ title: e.target.value, slug: slugify(e.target.value) })} /></Field>
          <RichTextEditor label="Description" value={form.description} onChange={(description) => set({ description })} minHeight="160px" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date"><input type="date" className={adminInput} value={form.date} onChange={(e) => set({ date: e.target.value })} /></Field>
            <Field label="End date"><input type="date" className={adminInput} value={form.endDate ?? ''} onChange={(e) => set({ endDate: e.target.value })} /></Field>
            <Field label="Start time"><input className={adminInput} value={form.startTime} onChange={(e) => set({ startTime: e.target.value })} /></Field>
            <Field label="End time"><input className={adminInput} value={form.endTime ?? ''} onChange={(e) => set({ endTime: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.allDay} onChange={(e) => set({ allDay: e.target.checked })} /> All-day event</label>
          <Field label="Venue / location"><input className={adminInput} value={form.location} onChange={(e) => set({ location: e.target.value })} /></Field>
          <Field label="Contact person"><input className={adminInput} value={form.contactPerson ?? ''} onChange={(e) => set({ contactPerson: e.target.value })} /></Field>
          <Field label="Registration URL"><input className={adminInput} value={form.registrationUrl ?? ''} onChange={(e) => set({ registrationUrl: e.target.value })} /></Field>
        </div>
        <div className="space-y-4 rounded-lg bg-white p-5">
          <ImageUploader label="Featured image" value={form.featuredImage || form.image} onChange={(file, url) => set({ featuredImage: file, image: url })} />
          <Field label="Category"><select className={adminInput} value={form.category} onChange={(e) => set({ category: e.target.value as EventCategory })}>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Status"><select className={adminInput} value={form.status} onChange={(e) => set({ status: e.target.value as EventStatus })}>{['draft', 'published', 'cancelled', 'completed'].map((s) => <option key={s}>{s}</option>)}</select></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} /> Featured event</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.showOnHomepage} onChange={(e) => set({ showOnHomepage: e.target.checked })} /> Show on homepage</label>
        </div>
      </div>
    </EditorShell>
  )
}

export function AnnouncementList() {
  const { announcements } = useContent()
  const navigate = useNavigate()
  const toast = useToast()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  return (
    <div>
      <AdminHeader title="Announcements" description="Control the top announcement bar and homepage notices." addLabel="Add Announcement" addTo="/admin/announcements/new" />
      <div className="overflow-x-auto rounded-lg bg-white shadow-[var(--shadow-card)]">
        {announcements.length === 0 ? <AdminEmpty title="No announcements" body="Create an announcement to display it on the website." actionLabel="Add Announcement" actionTo="/admin/announcements/new" /> : (
          <table className="w-full text-left text-sm">
            <thead className="bg-brand text-white"><tr><th className="px-3 py-2">Title</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Placement</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th></tr></thead>
            <tbody>
              {announcements.map((a) => (
                <tr key={a.id} className="border-b border-brand/10">
                  <td className="px-3 py-2 font-medium">{a.title}</td>
                  <td className="px-3 py-2"><StatusBadge status={a.type} /></td>
                  <td className="px-3 py-2">{a.placement}</td>
                  <td className="px-3 py-2"><StatusBadge status={a.active ? 'active' : 'inactive'} /></td>
                  <td className="px-3 py-2"><ActionsMenu items={[
                    { label: 'Edit', onClick: () => navigate(`/admin/announcements/${a.id}/edit`) },
                    { label: a.active ? 'Deactivate' : 'Activate', onClick: () => { announcementService.save({ ...a, active: !a.active }); toast.push(a.active ? 'Announcement deactivated.' : 'Announcement activated.') } },
                    { label: 'Delete', danger: true, onClick: () => setDeleteId(a.id) },
                  ]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <ConfirmDialog open={Boolean(deleteId)} title="Delete this announcement?" body="This action cannot be undone." onCancel={() => setDeleteId(null)} onConfirm={() => { if (deleteId) announcementService.remove(deleteId); toast.push('Announcement deleted.'); setDeleteId(null) }} />
    </div>
  )
}

export function AnnouncementEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const existing = isNew ? undefined : announcementService.get(id)
  const [form, setForm] = useState<Announcement>(existing ?? {
    id: crypto.randomUUID(), title: '', message: '', type: 'General', active: false, dismissible: true, priority: 1, placement: 'bar', createdAt: nowIso(), updatedAt: nowIso(),
  })
  const [dirty, setDirty] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const set = (p: Partial<Announcement>) => { setForm((f) => ({ ...f, ...p })); setDirty(true) }
  const save = () => {
    if (!form.message.trim()) { toast.push('Please enter a message.', 'error'); return }
    announcementService.save({ ...form, title: form.title || form.message.slice(0, 60) })
    setDirty(false)
    toast.push('Announcement saved.')
    if (isNew) navigate(`/admin/announcements/${form.id}/edit`, { replace: true })
  }
  return (
    <EditorShell title={isNew ? 'Add announcement' : 'Edit announcement'} backTo="/admin/announcements" dirty={dirty} actions={<button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={save}>Save</button>}>
      <div className="max-w-2xl space-y-4 rounded-lg bg-white p-5">
        <Field label="Title"><input className={adminInput} value={form.title} onChange={(e) => set({ title: e.target.value })} /></Field>
        <Field label="Message"><textarea className={adminInput} rows={4} value={form.message} onChange={(e) => set({ message: e.target.value })} /></Field>
        <Field label="Type"><select className={adminInput} value={form.type} onChange={(e) => set({ type: e.target.value as AnnouncementType })}>{['General', 'Important', 'Emergency', 'Academic', 'Event'].map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Link URL"><input className={adminInput} value={form.linkHref ?? ''} onChange={(e) => set({ linkHref: e.target.value })} /></Field>
        <Field label="Link text"><input className={adminInput} value={form.linkLabel ?? ''} onChange={(e) => set({ linkLabel: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date"><input type="datetime-local" className={adminInput} value={form.startsAt ?? ''} onChange={(e) => set({ startsAt: e.target.value })} /></Field>
          <Field label="End date"><input type="datetime-local" className={adminInput} value={form.endsAt ?? ''} onChange={(e) => set({ endsAt: e.target.value })} /></Field>
        </div>
        <Field label="Priority"><input type="number" className={adminInput} value={form.priority} onChange={(e) => set({ priority: Number(e.target.value) })} /></Field>
        <Field label="Show on"><select className={adminInput} value={form.placement} onChange={(e) => set({ placement: e.target.value as AnnouncementPlacement })}>
          <option value="bar">Top announcement bar</option>
          <option value="homepage">Homepage only</option>
          <option value="both">Bar and homepage</option>
        </select></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => set({ active: e.target.checked })} /> Active</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.dismissible} onChange={(e) => set({ dismissible: e.target.checked })} /> Dismissible</label>
      </div>
    </EditorShell>
  )
}
