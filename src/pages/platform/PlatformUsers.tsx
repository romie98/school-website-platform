import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminHeader, AdminSearch, StatusBadge } from '@/components/admin/AdminChrome'
import { useToast } from '@/components/admin/Toast'
import { platformApi, type PlatformUser } from '@/services/platform'

export function PlatformUsers() {
  const toast = useToast()
  const [rows, setRows] = useState<PlatformUser[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const load = () => platformApi.users().then(setRows)

  useEffect(() => {
    load().catch((err: Error) => setError(err.message))
  }, [])

  const filtered = rows.filter((row) => `${row.name} ${row.email} ${row.schoolName || ''} ${row.role}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div>
      <AdminHeader title="Platform users" description="School staff and platform owners. Super admin cannot be assigned from a school CMS." />
      <div className="mb-4"><AdminSearch value={query} onChange={setQuery} placeholder="Search users…" /></div>
      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto rounded-lg bg-white shadow-[var(--shadow-card)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand text-white">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">School</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-brand/10">
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2">{row.email}</td>
                <td className="px-3 py-2">{row.role.replace('_', ' ')}</td>
                <td className="px-3 py-2">
                  {row.schoolId ? <Link to={`/platform/schools/${row.schoolId}`} className="text-brand hover:underline">{row.schoolName}</Link> : row.schoolName || 'Platform'}
                </td>
                <td className="px-3 py-2"><StatusBadge status={row.isActive ? 'active' : 'inactive'} /></td>
                <td className="px-3 py-2">
                  {row.role !== 'super_admin' && (
                    <button
                      type="button"
                      className="text-sm font-medium text-brand"
                      onClick={async () => {
                        try {
                          const updated = await platformApi.updateUser(row.id, { isActive: !row.isActive })
                          setRows((current) => current.map((item) => item.id === updated.id ? updated : item))
                          toast.push(updated.isActive ? 'User reactivated.' : 'User deactivated.')
                        } catch (err) {
                          toast.push(err instanceof Error ? err.message : 'Unable to update user.', 'error')
                        }
                      }}
                    >
                      {row.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
