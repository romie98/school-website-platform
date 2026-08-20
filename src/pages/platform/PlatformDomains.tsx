import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminHeader, AdminSearch, StatusBadge } from '@/components/admin/AdminChrome'
import { platformApi, type PlatformDomain } from '@/services/platform'

export function PlatformDomains() {
  const [rows, setRows] = useState<PlatformDomain[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    platformApi.domains().then(setRows).catch((err: Error) => setError(err.message))
  }, [])

  const filtered = rows.filter((row) => `${row.domain} ${row.schoolName || ''}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div>
      <AdminHeader title="Domains" description="Hostnames assigned to schools. Verification is a stored flag after DNS is pointed at this deployment — the platform never changes DNS." />
      <div className="mb-4"><AdminSearch value={query} onChange={setQuery} placeholder="Search domains…" /></div>
      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto rounded-lg bg-white shadow-[var(--shadow-card)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand text-white">
            <tr>
              <th className="px-3 py-2">Domain</th>
              <th className="px-3 py-2">School</th>
              <th className="px-3 py-2">Primary</th>
              <th className="px-3 py-2">Verified</th>
              <th className="px-3 py-2">School status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-brand/10">
                <td className="px-3 py-2 font-medium">{row.domain}</td>
                <td className="px-3 py-2">
                  {row.schoolId ? <Link to={`/platform/schools/${row.schoolId}`} className="text-brand hover:underline">{row.schoolName}</Link> : '—'}
                </td>
                <td className="px-3 py-2">{row.isPrimary ? 'Yes' : 'No'}</td>
                <td className="px-3 py-2">{row.verified ? 'Verified' : 'Pending'}</td>
                <td className="px-3 py-2">{row.schoolStatus ? <StatusBadge status={row.schoolStatus} /> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
