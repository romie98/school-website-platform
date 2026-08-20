import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAdminAuthenticated } from '@/services/content'
import { currentSessionUser } from '@/services/api'

export function RequireAdmin() {
  const location = useLocation()
  const [ok, setOk] = useState(isAdminAuthenticated())

  useEffect(() => {
    const sync = () => setOk(isAdminAuthenticated())
    window.addEventListener('auth-expired', sync)
    return () => window.removeEventListener('auth-expired', sync)
  }, [])

  if (!ok) return <Navigate to={{ pathname: '/admin/login', search: location.search }} replace />
  if (currentSessionUser()?.role === 'super_admin') return <Navigate to={{ pathname: '/platform', search: location.search }} replace />
  return <Outlet />
}
