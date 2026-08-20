import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AdminEmpty, AdminHeader, AdminSearch, StatusBadge } from '@/components/admin/AdminChrome'
import { formatBytes, platformApi, type PlatformSchool } from '@/services/platform'

export function PlatformSchools() {
  const navigate = useNavigate()
  const [schools, setSchools] = useState<PlatformSchool[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    platformApi.schools().then(setSchools).catch((err: Error) => setError(err.message))
  }, [])

  const filtered = schools.filter((school) => {
    const haystack = `${school.name} ${school.slug} ${school.customDomain || ''} ${school.domain || ''}`.toLowerCase()
    return haystack.includes(query.toLowerCase())
  })

  return (
    <div>
      <AdminHeader
        title="Schools"
        description="Every tenant on this platform. Create a school, then assign a domain and first administrator."
        addLabel="Create school"
        addTo="/platform/schools/new"
      />
      <div className="mb-4">
        <AdminSearch value={query} onChange={setQuery} placeholder="Search schools…" />
      </div>
      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      {filtered.length === 0 ? (
        <AdminEmpty title="No schools yet" body="Create the first tenant to start serving a public school website." actionLabel="Create school" actionTo="/platform/schools/new" />
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-[var(--shadow-card)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand text-white">
              <tr>
                <th className="px-3 py-2">School</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Domain</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Storage</th>
                <th className="px-3 py-2">Theme</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((school) => (
                <tr key={school.id} className="cursor-pointer border-b border-brand/10 hover:bg-cream" onClick={() => navigate(`/platform/schools/${school.id}`)}>
                  <td className="px-3 py-2 font-medium">
                    {school.name}
                    <div className="text-xs text-muted">{school.slug}</div>
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={school.status} /></td>
                  <td className="px-3 py-2">{school.customDomain || school.domain || '—'}</td>
                  <td className="px-3 py-2">{school.plan?.name || school.subscriptionStatus}</td>
                  <td className="px-3 py-2">{formatBytes(school.storageBytes)}</td>
                  <td className="px-3 py-2 capitalize">{school.theme}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-xs text-muted">
        Preview a public site in development with <code>?tenant=slug</code>. <Link to="/platform/domains" className="font-medium text-brand">Manage domains</Link>
      </p>
    </div>
  )
}
