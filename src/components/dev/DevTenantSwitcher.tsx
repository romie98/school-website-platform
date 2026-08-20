import { useEffect, useState } from 'react'
import { api, currentSessionUser, rememberDevTenant, tenantSlugFromLocation } from '@/services/api'
import { platformApi } from '@/services/platform'

type TenantOption = { slug: string; name: string }

export function DevTenantSwitcher() {
  if (!import.meta.env.DEV) return null
  return <TenantSelect />
}

function TenantSelect() {
  const current = tenantSlugFromLocation() || 'belair-high'
  const [schools, setSchools] = useState<TenantOption[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        if (currentSessionUser()?.role === 'super_admin') {
          const rows = await platformApi.schools()
          setSchools(rows.map((school) => ({ slug: school.slug, name: school.name })))
          return
        }
      } catch {
        /* use the public catalogue */
      }
      const rows = await api<TenantOption[]>('/public/tenants')
      setSchools(rows)
    }
    void load()
  }, [])

  if (!schools.length) return null

  return (
    <div className="fixed bottom-3 left-3 z-[80] rounded-md bg-brand px-3 py-2 text-xs text-white shadow-lg">
      <label className="flex items-center gap-2">
        Preview school
        <select
          className="max-w-48 rounded bg-white px-2 py-1 text-brand"
          value={schools.some((school) => school.slug === current) ? current : schools[0].slug}
          onChange={(e) => {
            rememberDevTenant(e.target.value)
            const url = new URL(window.location.href)
            url.searchParams.set('tenant', e.target.value)
            window.location.assign(url.toString())
          }}
        >
          {schools.map((school) => (
            <option key={school.slug} value={school.slug}>{school.name}</option>
          ))}
        </select>
      </label>
    </div>
  )
}
