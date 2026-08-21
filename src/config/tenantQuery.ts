export function allowTenantQuery() {
  const env = import.meta.env as { DEV?: boolean; VITE_ALLOW_TENANT_QUERY?: string } | undefined
  return Boolean(env?.DEV) || env?.VITE_ALLOW_TENANT_QUERY === 'true'
}
