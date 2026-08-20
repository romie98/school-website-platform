import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { StaffMember, StaffType } from '@/types'
import { ActionsMenu, AdminEmpty, AdminHeader, AdminPager, AdminSearch, EditorShell, Field, StatusBadge, adminInput, useAdminList } from '@/components/admin/AdminChrome'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { ImageUploader } from '@/components/admin/ImageUploader'
import { RichTextEditor } from '@/components/admin/RichTextEditor'
import { useContent } from '@/hooks/useContent'
import { departmentService, staffService, writeMessage, conflictText } from '@/services/collections'
import { nowIso } from '@/services/normalize'
import { useToast } from '@/components/admin/Toast'
import { deleteConfirmCopy, submitLabel } from '@/services/approvals'

const types: StaffType[] = ['Administration', 'Teaching Staff', 'Support Staff', 'Guidance', 'Other']
const titles = ['Mr.', 'Mrs.', 'Miss', 'Ms.', 'Dr.', 'Professor']

function composeName(p: StaffMember) {
  return [p.honorific, p.firstName, p.lastName].filter(Boolean).join(' ')
}

function blankStaff(): StaffMember {
  return {
    id: crypto.randomUUID(),
    honorific: 'Mr.',
    firstName: '',
    lastName: '',
    name: '',
    role: 'Teacher',
    department: 'Mathematics',
    staffType: 'Teaching Staff',
    photo: '',
    displayOnWebsite: true,
    displayOrder: 99,
    status: 'active',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
}

export function StaffList() {
  const { staff, departments } = useContent()
  const navigate = useNavigate()
  const toast = useToast()
  const [dept, setDept] = useState('All')
  const [type, setType] = useState('All')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const filtered = staff.filter((s) => (dept === 'All' || s.department === dept) && (type === 'All' || s.staffType === type))
  const { query, setQuery, page, setPage, paged } = useAdminList(
    filtered,
    12,
    (s, q) => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q),
  )
  return (
    <div>
      <AdminHeader title="Staff" description="Manage staff profiles, photographs and departments. Updates appear on the public staff directory." addLabel="Add Staff Member" addTo="/admin/staff/new" />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row">
        <AdminSearch value={query} onChange={setQuery} placeholder="Search staff..." />
        <select className="rounded-md border border-brand/20 px-3 py-2 text-sm" value={dept} onChange={(e) => setDept(e.target.value)}>
          <option>All</option>
          {[...new Set(staff.map((s) => s.department))].map((d) => <option key={d}>{d}</option>)}
        </select>
        <select className="rounded-md border border-brand/20 px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
          <option>All</option>
          {types.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      {paged.total === 0 ? <AdminEmpty title="No staff records" body="Add a staff member to populate the public directory." actionLabel="Add Staff Member" actionTo="/admin/staff/new" /> : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-brand text-white"><tr>
              <th className="px-3 py-2">Photo</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Position</th><th className="px-3 py-2">Department</th><th className="px-3 py-2">Staff type</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Actions</th>
            </tr></thead>
            <tbody>
              {paged.items.map((person) => (
                <tr key={person.id} className="border-b border-brand/10">
                  <td className="px-3 py-2">{person.photo ? <img src={person.photo} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-cream" />}</td>
                  <td className="max-w-[220px] break-words px-3 py-2 font-medium text-brand">{person.name}</td>
                  <td className="max-w-[180px] break-words px-3 py-2">{person.role}</td>
                  <td className="px-3 py-2">{person.department}</td>
                  <td className="px-3 py-2">{person.staffType}</td>
                  <td className="px-3 py-2"><StatusBadge status={person.status} /></td>
                  <td className="px-3 py-2"><ActionsMenu items={[
                    { label: 'View', onClick: () => navigate(`/admin/staff/${person.id}`) },
                    { label: 'Edit', onClick: () => navigate(`/admin/staff/${person.id}/edit`) },
                    { label: 'Remove', danger: true, onClick: () => setDeleteId(person.id) },
                  ]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AdminPager page={paged.page} totalPages={paged.totalPages} total={paged.total} perPage={12} onChange={setPage} />
      <ConfirmDialog open={Boolean(deleteId)} title={deleteConfirmCopy().title} body={deleteConfirmCopy().body} confirmLabel={deleteConfirmCopy().confirmLabel} onCancel={() => setDeleteId(null)} onConfirm={async () => {
        if (!deleteId) return
        try {
          const result = await staffService.remove(deleteId)
          toast.push(writeMessage(result, 'Staff member removed.'))
        } catch (err) {
          toast.push(conflictText(err), 'error')
        }
        setDeleteId(null)
      }} />
    </div>
  )
}

export function StaffEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const existing = isNew ? undefined : staffService.get(id)
  const { departments } = useContent()
  const [form, setForm] = useState<StaffMember>(existing ?? blankStaff())
  const [dirty, setDirty] = useState(false)
  const toast = useToast()
  const navigate = useNavigate()
  const set = (patch: Partial<StaffMember>) => { setForm((f) => ({ ...f, ...patch })); setDirty(true) }

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) { toast.push('Please enter first and last name.', 'error'); return }
    const next = { ...form, name: composeName(form), administration: form.staffType === 'Administration' || form.role.toLowerCase().includes('principal') || form.role.toLowerCase().includes('bursar') || form.role.toLowerCase().includes('dean') }
    try {
      const result = await staffService.save(next)
      setDirty(false)
      toast.push(writeMessage(result, 'Staff member saved.'))
      if (result.mode === 'pending') navigate('/admin/changes', { replace: true })
      else if (isNew) navigate(`/admin/staff/${next.id}/edit`, { replace: true })
    } catch (err) {
      toast.push(conflictText(err), 'error')
    }
  }

  return (
    <EditorShell title={isNew ? 'Add staff member' : 'Edit staff member'} backTo="/admin/staff" lastSaved={form.updatedAt} dirty={dirty} actions={
      <button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={save}>{submitLabel()}</button>
    }>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4 rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Title"><select className={adminInput} value={form.honorific} onChange={(e) => set({ honorific: e.target.value })}>{titles.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="First name"><input className={adminInput} value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} /></Field>
            <Field label="Last name"><input className={adminInput} value={form.lastName} onChange={(e) => set({ lastName: e.target.value })} /></Field>
          </div>
          <Field label="Position"><input className={adminInput} value={form.role} onChange={(e) => set({ role: e.target.value })} /></Field>
          <Field label="Department">
            <select className={adminInput} value={form.department} onChange={(e) => {
              const dept = departments.find((d) => d.name === e.target.value)
              set({ department: e.target.value, departmentId: dept?.id })
            }}>
              {[...new Set(['Administration', ...departments.map((d) => d.name), form.department])].map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Staff type"><select className={adminInput} value={form.staffType} onChange={(e) => set({ staffType: e.target.value as StaffType })}>{types.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Email"><input className={adminInput} value={form.email ?? ''} onChange={(e) => set({ email: e.target.value })} /></Field>
          <Field label="Phone extension"><input className={adminInput} value={form.phoneExtension ?? ''} onChange={(e) => set({ phoneExtension: e.target.value })} /></Field>
          <Field label="Qualifications"><input className={adminInput} value={form.qualifications ?? ''} onChange={(e) => set({ qualifications: e.target.value })} /></Field>
          <RichTextEditor label="Biography" value={form.bio ?? ''} onChange={(bio) => set({ bio })} minHeight="140px" />
        </div>
        <div className="space-y-4 rounded-lg bg-white p-5 shadow-[var(--shadow-card)]">
          <ImageUploader label="Profile photo" value={form.photoMedia || form.photo} onChange={(file, url) => set({ photoMedia: file, photo: url })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.displayOnWebsite} onChange={(e) => set({ displayOnWebsite: e.target.checked })} /> Display on website</label>
          <Field label="Display order"><input type="number" className={adminInput} value={form.displayOrder} onChange={(e) => set({ displayOrder: Number(e.target.value) })} /></Field>
          <Field label="Status"><select className={adminInput} value={form.status} onChange={(e) => set({ status: e.target.value as StaffMember['status'] })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
        </div>
      </div>
    </EditorShell>
  )
}

export function StaffView() {
  const { id } = useParams()
  const person = staffService.get(id ?? '')
  const navigate = useNavigate()
  if (!person) return <p>Staff member not found.</p>
  return (
    <EditorShell title={person.name} backTo="/admin/staff" actions={<button type="button" className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={() => navigate(`/admin/staff/${person.id}/edit`)}>Edit</button>}>
      <div className="flex gap-6 rounded-lg bg-white p-6">
        {person.photo && <img src={person.photo} alt={person.name} className="h-40 w-32 rounded object-cover" />}
        <div>
          <p className="font-medium text-gold-dark">{person.role}</p>
          <p className="text-sm text-muted">{person.department} · {person.staffType}</p>
          {person.email && <p className="mt-2 text-sm">{person.email}</p>}
          <div className="cms-prose mt-4" dangerouslySetInnerHTML={{ __html: person.bio || '' }} />
        </div>
      </div>
    </EditorShell>
  )
}
