import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EditorShell, Field, adminInput } from '@/components/admin/AdminChrome'
import { useToast } from '@/components/admin/Toast'
import { platformApi, type PlatformPlan } from '@/services/platform'

const FEATURE_LABELS: Record<string, string> = {
  news: 'News',
  events: 'Events',
  gallery: 'Gallery',
  documents: 'Documents',
  online_admissions: 'Online admissions',
  student_portal: 'Student portal',
  analytics: 'Analytics',
}

export function PlatformSchoolCreate() {
  const navigate = useNavigate()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [plans, setPlans] = useState<PlatformPlan[]>([])
  const [themes, setThemes] = useState<{ id: string; label: string; description: string; primaryColor?: string; secondaryColor?: string; accentColor?: string }[]>([])
  const [features, setFeatures] = useState<Record<string, boolean>>({})
  const [slugTouched, setSlugTouched] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    motto: '',
    customDomain: '',
    theme: 'classic',
    status: 'trial',
    subscriptionPlanId: 'plan-professional',
    primaryColor: '#0B3D2E',
    secondaryColor: '#FFD100',
    accentColor: '#145C45',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  })
  const [coloursTouched, setColoursTouched] = useState(false)

  useEffect(() => {
    Promise.all([platformApi.plans(), platformApi.themes(), platformApi.features()]).then(([planRows, themeRows, featureRows]) => {
      setPlans(planRows)
      setThemes(themeRows)
      setFeatures(Object.fromEntries(featureRows.map((item) => [item.id, item.enabled])))
      if (planRows[0] && !planRows.some((plan) => plan.id === 'plan-professional')) {
        setForm((current) => ({ ...current, subscriptionPlanId: planRows[0].id }))
      }
    }).catch((err: Error) => toast.push(err.message, 'error'))
  }, [toast])

  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }))

  return (
    <EditorShell
      title="Create school"
      backTo="/platform/schools"
      dirty={Boolean(form.name || form.slug)}
      actions={
          <button
            type="button"
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-brand-dark disabled:opacity-50"
            disabled={busy || !form.name.trim() || !form.slug.trim()}
          onClick={async () => {
            setBusy(true)
            try {
              const created = await platformApi.createSchool({ ...form, features })
              toast.push(`${created.name} is ready.`)
              navigate(`/platform/schools/${created.id}`)
            } catch (err) {
              toast.push(err instanceof Error ? err.message : 'Unable to create school.', 'error')
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Creating…' : 'Create school'}
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-lg bg-white p-5">
          <h2 className="font-display font-bold text-brand">School</h2>
          <Field label="School name"><input className={adminInput} autoComplete="off" value={form.name} onChange={(e) => {
            const name = e.target.value
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            set(slugTouched ? { name } : { name, slug })
          }} /></Field>
          <Field label="Slug" hint="Used as the platform subdomain, e.g. slug.schoolplatform.com">
            <input className={adminInput} value={form.slug} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase() }) }} />
          </Field>
          <Field label="Motto"><input className={adminInput} value={form.motto} onChange={(e) => set({ motto: e.target.value })} /></Field>
          <Field label="Custom domain" hint="Optional. DNS is not changed automatically; mark verified after pointing the hostname.">
            <input className={adminInput} placeholder="school.edu.jm" value={form.customDomain} onChange={(e) => set({ customDomain: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <select className={adminInput} value={form.status} onChange={(e) => set({ status: e.target.value })}>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field label="Plan">
              <select className={adminInput} value={form.subscriptionPlanId} onChange={(e) => set({ subscriptionPlanId: e.target.value })}>
                {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </select>
            </Field>
          </div>
        </section>
        <section className="space-y-4 rounded-lg bg-white p-5">
          <h2 className="font-display font-bold text-brand">Theme and first admin</h2>
          <Field label="Initial theme">
            <select className={adminInput} value={form.theme} onChange={(e) => {
              const theme = e.target.value
              const preset = themes.find((item) => item.id === theme)
              set(coloursTouched ? { theme } : {
                theme,
                primaryColor: preset?.primaryColor || form.primaryColor,
                secondaryColor: preset?.secondaryColor || form.secondaryColor,
                accentColor: preset?.accentColor || form.accentColor,
              })
            }}>
              {themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Primary"><input type="color" className="h-10 w-full" value={form.primaryColor} onChange={(e) => { setColoursTouched(true); set({ primaryColor: e.target.value }) }} /></Field>
            <Field label="Secondary"><input type="color" className="h-10 w-full" value={form.secondaryColor} onChange={(e) => { setColoursTouched(true); set({ secondaryColor: e.target.value }) }} /></Field>
            <Field label="Accent"><input type="color" className="h-10 w-full" value={form.accentColor} onChange={(e) => { setColoursTouched(true); set({ accentColor: e.target.value }) }} /></Field>
          </div>
          <Field label="Administrator name"><input className={adminInput} value={form.adminName} onChange={(e) => set({ adminName: e.target.value })} /></Field>
          <Field label="Administrator email"><input className={adminInput} type="email" value={form.adminEmail} onChange={(e) => set({ adminEmail: e.target.value })} /></Field>
          <Field label="Temporary password" hint="Minimum 8 characters. Share this with the school, then ask them to change it.">
            <input className={adminInput} type="password" value={form.adminPassword} onChange={(e) => set({ adminPassword: e.target.value })} />
          </Field>
        </section>
        <section className="rounded-lg bg-white p-5 lg:col-span-2">
          <h2 className="font-display font-bold text-brand">Features</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.keys(features).map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={Boolean(features[key])} onChange={(e) => setFeatures((current) => ({ ...current, [key]: e.target.checked }))} />
                {FEATURE_LABELS[key] || key}
              </label>
            ))}
          </div>
        </section>
      </div>
    </EditorShell>
  )
}
