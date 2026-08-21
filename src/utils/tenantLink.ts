import { allowTenantQuery } from '../config/tenantQuery.ts'

export function isExternalHref(href: string) {
  return /^(https?:|mailto:|tel:|sms:|\/\/)/i.test(href.trim())
}

export function isAdminOrPlatformHref(href: string) {
  const path = href.split('?')[0].split('#')[0]
  return path === '/admin' || path.startsWith('/admin/') || path === '/platform' || path.startsWith('/platform/')
}

export function currentTenantSlug(search?: string) {
  if (!allowTenantQuery()) return null
  const query = search ?? (typeof window !== 'undefined' ? window.location.search : '')
  return new URLSearchParams(query).get('tenant')
}

export function withTenant(href: string, tenant?: string | null) {
  if (!href || !tenant) return href
  if (isExternalHref(href) || isAdminOrPlatformHref(href)) return href
  if (href.startsWith('#') || href.startsWith('?')) {
    const hashIndex = href.indexOf('#')
    const hash = hashIndex >= 0 ? href.slice(hashIndex) : ''
    const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href
    const params = new URLSearchParams(withoutHash.startsWith('?') ? withoutHash.slice(1) : withoutHash)
    if (!params.get('tenant')) params.set('tenant', tenant)
    const qs = params.toString()
    return `${href.startsWith('?') ? `?${qs}` : qs}${hash}`
  }

  const hashIndex = href.indexOf('#')
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href
  const queryIndex = withoutHash.indexOf('?')
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash
  const params = new URLSearchParams(queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '')
  if (!params.get('tenant')) params.set('tenant', tenant)
  return `${pathname}?${params.toString()}${hash}`
}

export function withCurrentTenant(href: string, fallback?: string | null) {
  const tenant = currentTenantSlug() || (allowTenantQuery() ? fallback ?? null : null)
  return withTenant(href, tenant)
}
