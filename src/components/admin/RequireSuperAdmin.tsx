import { Navigate, Outlet } from 'react-router-dom'
import { isAdminAuthenticated } from '@/services/content'
import { currentSessionUser } from '@/services/api'

export function RequireSuperAdmin() {
  if (!isAdminAuthenticated()) return <Navigate to="/admin/login" replace />
  if (currentSessionUser()?.role !== 'super_admin') return <Navigate to="/admin" replace />
  return <Outlet />
}
