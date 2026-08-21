import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api, currentSessionUser, rememberDevTenant, storedDevTenant } from '@/services/api'
import { hydrateFromRemote, getContent, clearContentMemory } from '@/services/content'
import { seed } from '@/data/seed'
import { allowSeedFallback } from '@/config/contentSource'
import { allowTenantQuery } from '@/config/tenantQuery'
import { applyTheme } from '@/themes/applyTheme'
import type { TenantBundle, TenantSchool, TenantSettings, TenantTheme } from '@/types/tenant'

export type { TenantBundle, TenantSchool, TenantSettings, TenantTheme }

interface TenantContextValue {
  bundle: TenantBundle | null
  loading: boolean
  error: string | null
  errorStatus: number | null
  school: TenantSchool | null
  theme: TenantTheme | null
  settings: TenantSettings | null
  features: Record<string, boolean>
  navigation: TenantBundle['navigation']
  homepage_sections: TenantBundle['homepage_sections']
  refresh: () => Promise<void>
}

const TenantContext = createContext<TenantContextValue | null>(null)

const fallbackTheme: TenantTheme = {
  primaryColor: '#0B3D2E',
  secondaryColor: '#FFD100',
  accentColor: '#145C45',
  headingFont: 'Montserrat',
  bodyFont: 'Inter',
  heroStyle: 'full-image',
  navbarStyle: 'classic',
  newsLayout: 'featured',
  eventsLayout: 'cards',
  footerStyle: 'classic',
  theme: 'classic',
  radius: '0.5rem',
}

function isAdminCmsPath(pathname: string) {
  return pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [bundle, setBundle] = useState<TenantBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const onAdminCms = isAdminCmsPath(location.pathname)
  const allowTenantQueryParam = allowTenantQuery()

  const tenantFromUrl = allowTenantQueryParam
    ? new URLSearchParams(location.search).get('tenant')
    : null
  const tenantSlug = tenantFromUrl || storedDevTenant()

  const refresh = useCallback(async () => {
    try {
      const session = currentSessionUser()
      const path =
        onAdminCms && session?.school_id
          ? '/admin/site'
          : tenantSlug
            ? `/public/site?tenant=${encodeURIComponent(tenantSlug)}`
            : '/public/site'
      const data = await api<TenantBundle>(path)
      hydrateFromRemote(data.content, { persist: onAdminCms && Boolean(session?.school_id) })
      setBundle(data)
      setError(null)
      setErrorStatus(null)
    } catch (err) {
      const status = typeof err === 'object' && err && 'status' in err ? Number((err as { status: number }).status) : 0
      const message = err instanceof Error ? err.message : 'Unable to load school site'
      setError(message)
      setErrorStatus(status || 0)
      if (allowSeedFallback() && status !== 503 && status !== 404) {
        setBundle((current) => {
          if (current) return current
          hydrateFromRemote(seed, { persist: false })
          return {
            school: { id: 'local', name: 'Bel-Air High School', slug: 'belair-high', status: 'active', theme: 'classic' },
            theme: fallbackTheme,
            settings: { schoolName: 'Bel-Air High School', motto: 'Unity Through Friendship and Knowledge' },
            features: { news: true, events: true, gallery: true, documents: true },
            navigation: [],
            homepage_sections: [],
            content: getContent(),
          }
        })
        return
      }
      setBundle(null)
    } finally {
      setLoading(false)
    }
  }, [onAdminCms, tenantSlug])

  useEffect(() => {
    if (tenantFromUrl) rememberDevTenant(tenantFromUrl)
  }, [tenantFromUrl])

  useEffect(() => {
    if (!import.meta.env.DEV || location.pathname.startsWith('/platform')) return
    const stored = storedDevTenant()
    if (!stored || tenantFromUrl === stored) return
    const params = new URLSearchParams(location.search)
    params.set('tenant', stored)
    navigate({ pathname: location.pathname, search: `?${params.toString()}`, hash: location.hash }, { replace: true })
  }, [location.hash, location.pathname, location.search, navigate, tenantFromUrl])

  useEffect(() => {
    const session = currentSessionUser()
    if (onAdminCms && session?.school_id) {
      setLoading(true)
      clearContentMemory()
    }
    void refresh()
  }, [refresh, onAdminCms])

  useEffect(() => {
    if (bundle?.theme) {
      applyTheme(bundle.theme, {
        faviconUrl: bundle.settings?.faviconUrl || bundle.school.faviconUrl,
        schoolName: bundle.settings?.schoolName || bundle.school.name,
      })
    }
  }, [bundle])

  const value = useMemo<TenantContextValue>(() => ({
    bundle,
    loading,
    error,
    errorStatus,
    school: bundle?.school ?? null,
    theme: bundle?.theme ?? null,
    settings: bundle?.settings ?? null,
    features: bundle?.features ?? {},
    navigation: bundle?.navigation ?? [],
    homepage_sections: bundle?.homepage_sections ?? [],
    refresh,
  }), [bundle, loading, error, errorStatus, refresh])

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within TenantProvider')
  return ctx
}
