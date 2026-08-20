import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { SchoolCrest } from '@/components/common/SchoolCrest'
import { Button } from '@/components/common/Button'
import { isAdminAuthenticated, loginAdmin } from '@/services/content'
import { currentSessionUser } from '@/services/api'
import { PageMeta } from '@/components/common/PageMeta'
import { useTenant } from '@/contexts/TenantContext'

export function AdminLogin() {
  const navigate = useNavigate()
  const { school } = useTenant()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (isAdminAuthenticated()) {
    const user = currentSessionUser()
    return <Navigate to={user?.role === 'super_admin' ? '/platform' : user?.school_slug ? `/admin?tenant=${encodeURIComponent(user.school_slug)}` : '/admin'} replace />
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-brand px-4">
      <PageMeta title="Admin Login" description="School content management login." path="/admin/login" />
      <form
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow-xl"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError('')
          try {
            await loginAdmin(username, password)
            const user = currentSessionUser()
            navigate(user?.role === 'super_admin' ? '/platform' : user?.school_slug ? `/admin?tenant=${encodeURIComponent(user.school_slug)}` : '/admin')
          } catch (err) {
            const status = err instanceof Error && 'status' in err ? (err as Error & { status?: number }).status : undefined
            setError(status === 401 ? 'Incorrect username or password.' : 'Unable to reach the server. Check that the API is running, then try again.')
          } finally {
            setBusy(false)
          }
        }}
      >
        <SchoolCrest className="mx-auto h-16 w-16" />
        <h1 className="mt-4 text-center font-display text-xl font-bold text-brand">{school?.name || 'School CMS'}</h1>
        <p className="text-center text-sm text-muted">Content management</p>
        <label className="mt-6 block text-sm font-medium text-brand">
          Username
          <input className="mt-1 w-full rounded-md border border-brand/20 px-3 py-2" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label className="mt-4 block text-sm font-medium text-brand">
          Password
          <input type="password" className="mt-1 w-full rounded-md border border-brand/20 px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <Button type="submit" className="mt-5 w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
        <p className="mt-4 text-center text-xs text-muted">Use the email and password issued for your school or platform account.</p>
      </form>
    </div>
  )
}
