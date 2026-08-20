import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AdminHeader, Field, StatusBadge, adminInput } from '@/components/admin/AdminChrome'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { useToast } from '@/components/admin/Toast'
import { formatBytes, platformApi, type PlatformPlan, type PlatformSchool } from '@/services/platform'

const FEATURE_LABELS: Record<string, string> = {
  news: 'News',
  events: 'Events',
  gallery: 'Gallery',
  documents: 'Documents',
  online_admissions: 'Online admissions',
  student_portal: 'Student portal',
  analytics: 'Analytics',
}

export function PlatformSchoolDetail() {
  const { id = '' } = useParams()
  const toast = useToast()
  const [school, setSchool] = useState<PlatformSchool | null>(null)
  const [plans, setPlans] = useState<PlatformPlan[]>([])
  const [busy, setBusy] = useState(false)
  const [domain, setDomain] = useState('')
  const [admin, setAdmin] = useState({ name: '', email: '', password: '', role: 'school_admin' })
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)

  const load = () => platformApi.school(id).then(setSchool)

  useEffect(() => {
    Promise.all([platformApi.school(id), platformApi.plans()])
      .then(([next, planRows]) => {
        setSchool(next)
        setPlans(planRows)
      })
      .catch((err: Error) => toast.push(err.message, 'error'))
  }, [id, toast])

  if (!school) return <p className="text-sm text-muted">Loading school…</p>

  const save = async (body: Record<string, unknown>, message: string) => {
    setBusy(true)
    try {
      setSchool(await platformApi.updateSchool(school.id, body))
      toast.push(message)
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Unable to save.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <AdminHeader
        title={school.name}
        description={`${school.slug} · ${school.customDomain || school.domain || 'No custom domain'}`}
        extra={
          <div className="flex flex-wrap gap-2">
            <a href={`/?tenant=${encodeURIComponent(school.slug)}`} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark">
              Preview website
            </a>
            <Link to="/platform/schools" className="rounded-md border border-brand/20 px-4 py-2 text-sm font-medium text-brand">Back to schools</Link>
          </div>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={school.status} />
        <StatusBadge status={school.subscriptionStatus} />
        <span className="text-sm text-muted">{formatBytes(school.storageBytes)} used</span>
        {school.counts && (
          <span className="text-sm text-muted">
            {school.counts.news} news · {school.counts.events} events · {school.counts.users} users
          </span>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-lg bg-white p-5">
          <h2 className="font-display font-bold text-brand">School profile</h2>
          <Field label="Name"><input className={adminInput} value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} /></Field>
          <Field label="Motto"><input className={adminInput} value={school.motto || ''} onChange={(e) => setSchool({ ...school, motto: e.target.value })} /></Field>
          <Field label="Theme">
            <select className={adminInput} value={school.theme} onChange={(e) => setSchool({ ...school, theme: e.target.value })}>
              {['classic', 'modern', 'academic', 'heritage', 'minimal', 'sky'].map((theme) => <option key={theme}>{theme}</option>)}
            </select>
          </Field>
          <Field label="Plan">
            <select className={adminInput} value={school.plan?.id || ''} onChange={(e) => setSchool({ ...school, plan: plans.find((plan) => plan.id === e.target.value) || school.plan })}>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} ({plan.maxStorageMb} MB)</option>)}
            </select>
          </Field>
          <Field label="Subscription status">
            <select className={adminInput} value={school.subscriptionStatus} onChange={(e) => setSchool({ ...school, subscriptionStatus: e.target.value })}>
              <option value="trial">trial</option>
              <option value="active">active</option>
              <option value="past_due">past_due</option>
              <option value="cancelled">cancelled</option>
            </select>
          </Field>
          <button type="button" disabled={busy} className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark" onClick={() => save({
            name: school.name,
            motto: school.motto,
            theme: school.theme,
            subscriptionPlanId: school.plan?.id,
            subscriptionStatus: school.subscriptionStatus,
          }, 'School updated.')}>Save profile</button>
        </section>

        <section className="space-y-4 rounded-lg bg-white p-5">
          <h2 className="font-display font-bold text-brand">Status</h2>
          <p className="text-sm text-muted">Suspending a school blocks admin login and shows a maintenance response on the public site. Data is not deleted.</p>
          <div className="flex flex-wrap gap-2">
            {['trial', 'active', 'suspended', 'archived'].map((status) => (
              <button
                key={status}
                type="button"
                className={`rounded-md px-3 py-2 text-sm font-medium capitalize ${school.status === status ? 'bg-brand text-white' : 'border border-brand/20 text-brand'}`}
                onClick={() => setPendingStatus(status)}
              >
                {status}
              </button>
            ))}
          </div>
          <h3 className="pt-4 font-display font-bold text-brand">Features</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(school.features || {}).map(([key, enabled]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={enabled} onChange={(e) => setSchool({ ...school, features: { ...school.features, [key]: e.target.checked } })} />
                {FEATURE_LABELS[key] || key}
              </label>
            ))}
          </div>
          <button type="button" disabled={busy} className="rounded-md border border-brand/20 px-4 py-2 text-sm font-medium text-brand" onClick={() => save({ features: school.features }, 'Features updated.')}>Save features</button>
        </section>

        <section className="space-y-4 rounded-lg bg-white p-5">
          <h2 className="font-display font-bold text-brand">Domains</h2>
          <p className="text-sm text-muted">Point DNS to this deployment, then mark the hostname verified. The platform does not change DNS records.</p>
          <ul className="space-y-2 text-sm">
            {(school.domains || []).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-brand/10 px-3 py-2">
                <div>
                  <p className="font-medium">{item.domain}</p>
                  <p className="text-xs text-muted">{item.isPrimary ? 'Primary' : 'Alias'} · {item.verified ? 'Verified' : 'Unverified'}</p>
                </div>
                <span className="flex gap-2 text-xs">
                  {!item.isPrimary && <button type="button" onClick={async () => { await platformApi.updateDomain(school.id, item.id, { isPrimary: true }); await load(); toast.push('Primary domain updated.') }}>Make primary</button>}
                  <button type="button" onClick={async () => { await platformApi.updateDomain(school.id, item.id, { verified: !item.verified }); await load(); toast.push(item.verified ? 'Marked unverified.' : 'Marked verified.') }}>{item.verified ? 'Unverify' : 'Verify'}</button>
                  <button type="button" className="text-red-700" onClick={async () => { try { await platformApi.deleteDomain(school.id, item.id); await load(); toast.push('Domain removed.') } catch (err) { toast.push(err instanceof Error ? err.message : 'Unable to remove domain.', 'error') } }}>Remove</button>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input className={adminInput} placeholder="school.edu.jm" value={domain} onChange={(e) => setDomain(e.target.value)} />
            <button type="button" className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white" onClick={async () => {
              try {
                await platformApi.addDomain(school.id, { domain, isPrimary: !(school.customDomain) })
                setDomain('')
                await load()
                toast.push('Domain added. Configure DNS, then verify.')
              } catch (err) {
                toast.push(err instanceof Error ? err.message : 'Unable to add domain.', 'error')
              }
            }}>Add</button>
          </div>
        </section>

        <section className="space-y-4 rounded-lg bg-white p-5">
          <h2 className="font-display font-bold text-brand">School administrators</h2>
          <ul className="space-y-2 text-sm">
            {(school.users || []).map((user) => (
              <li key={user.id} className="flex items-center justify-between rounded border border-brand/10 px-3 py-2">
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted">{user.email} · {user.role.replace('_', ' ')}</p>
                </div>
                <StatusBadge status={user.isActive ? 'active' : 'inactive'} />
              </li>
            ))}
          </ul>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className={adminInput} placeholder="Name" value={admin.name} onChange={(e) => setAdmin({ ...admin, name: e.target.value })} />
            <input className={adminInput} placeholder="Email" value={admin.email} onChange={(e) => setAdmin({ ...admin, email: e.target.value })} />
            <input className={adminInput} placeholder="Password" type="password" value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} />
            <select className={adminInput} value={admin.role} onChange={(e) => setAdmin({ ...admin, role: e.target.value })}>
              <option value="school_admin">School admin</option>
              <option value="principal">Principal</option>
              <option value="editor">Editor</option>
            </select>
          </div>
          <button type="button" className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white" onClick={async () => {
            try {
              await platformApi.addAdmin(school.id, admin)
              setAdmin({ name: '', email: '', password: '', role: 'school_admin' })
              await load()
              toast.push('Administrator created.')
            } catch (err) {
              toast.push(err instanceof Error ? err.message : 'Unable to create administrator.', 'error')
            }
          }}>Add administrator</button>
        </section>
      </div>
      <ConfirmDialog
        open={Boolean(pendingStatus)}
        title={`Set status to ${pendingStatus}?`}
        body={pendingStatus === 'suspended' || pendingStatus === 'archived' ? 'School staff will be locked out. Public pages will be hidden or show maintenance. Existing content is kept.' : 'The school website and admin CMS will follow this status.'}
        confirmLabel="Update status"
        onCancel={() => setPendingStatus(null)}
        onConfirm={async () => {
          if (!pendingStatus) return
          await save({ status: pendingStatus }, `Status set to ${pendingStatus}.`)
          setPendingStatus(null)
        }}
      />
    </div>
  )
}
