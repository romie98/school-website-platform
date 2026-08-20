import { API_BASE_URL } from '@/config/api'

const TOKEN_KEY = 'bahs-jwt'
const USER_KEY = 'bahs-jwt-user'

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setSession(token: string, user: unknown) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearSession() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function currentSessionUser(): {
  id: string
  role: string
  school_id: string | null
  school_slug?: string | null
  school_name?: string | null
  name: string
  email: string
} | null {
  const raw = sessionStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const DEV_TENANT_KEY = 'bahs-dev-tenant'

export function rememberDevTenant(slug: string | null | undefined) {
  if (!import.meta.env.DEV) return
  if (slug) sessionStorage.setItem(DEV_TENANT_KEY, slug)
}

export function storedDevTenant() {
  if (!import.meta.env.DEV) return null
  return sessionStorage.getItem(DEV_TENANT_KEY)
}

export function tenantSlugFromLocation() {
  if (!import.meta.env.DEV) return null
  return new URLSearchParams(window.location.search).get('tenant') || storedDevTenant()
}

function clearLocalAuthFlags() {
  sessionStorage.removeItem('bahs-admin-auth')
  sessionStorage.removeItem('bahs-admin-user')
}

export function canPublishDirectly() {
  return currentSessionUser()?.role === 'principal'
}

export function isPrincipal() {
  return currentSessionUser()?.role === 'principal'
}

export function isSchoolAdmin() {
  return currentSessionUser()?.role === 'school_admin'
}

export function canManageUsers() {
  const role = currentSessionUser()?.role
  return role === 'principal' || role === 'school_admin'
}

function readErrorDetail(body: unknown): { message: string; detail: unknown } {
  if (!body || typeof body !== 'object' || !('detail' in body)) {
    return { message: 'Request failed', detail: undefined }
  }
  const detail = (body as { detail: unknown }).detail
  if (typeof detail === 'string') return { message: detail, detail }
  if (detail && typeof detail === 'object' && 'message' in detail && typeof (detail as { message: unknown }).message === 'string') {
    return { message: (detail as { message: string }).message, detail }
  }
  return { message: 'Request failed', detail }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const slug = tenantSlugFromLocation()
  if (slug && path.startsWith('/public')) headers.set('X-Tenant-Slug', slug)
  const response = await fetch(`${API_BASE_URL}/api${path}`, { ...init, headers })
  if (!response.ok) {
    let message = 'Request failed'
    let detail: unknown
    try {
      const parsed = readErrorDetail(await response.json())
      message = parsed.message
      detail = parsed.detail
    } catch {
      /* ignore */
    }
    if (response.status === 401 && !path.startsWith('/auth/login')) {
      clearSession()
      clearLocalAuthFlags()
      window.dispatchEvent(new CustomEvent('auth-expired'))
      message = token ? 'Your session expired. Please sign in again.' : 'Please sign in to save changes.'
    }
    const error = new Error(message) as Error & { status: number; detail: unknown; requestId?: string }
    error.status = response.status
    error.detail = detail
    const requestId = response.headers.get('X-Request-ID')
    if (requestId) error.requestId = requestId
    if (detail && typeof detail === 'object' && 'requestId' in detail && typeof (detail as { requestId: unknown }).requestId === 'string') {
      error.requestId = (detail as { requestId: string }).requestId
    }
    throw error
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
