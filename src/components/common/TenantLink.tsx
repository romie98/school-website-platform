import { Link, NavLink, useSearchParams, type LinkProps, type NavLinkProps } from 'react-router-dom'
import { allowTenantQuery } from '@/config/tenantQuery'
import { isExternalHref, withTenant } from '@/utils/tenantLink'

function resolveTo(to: LinkProps['to'], tenant: string | null) {
  if (typeof to === 'string') return withTenant(to, tenant)
  if (typeof to === 'number') return to
  const pathname = to.pathname ?? ''
  const search = to.search ? (to.search.startsWith('?') ? to.search : `?${to.search}`) : ''
  const hash = to.hash ? (to.hash.startsWith('#') ? to.hash : `#${to.hash}`) : ''
  return withTenant(`${pathname}${search}${hash}`, tenant)
}

function useLinkTenant() {
  const [params] = useSearchParams()
  return allowTenantQuery() ? params.get('tenant') : null
}

export function TenantLink({ to, ...props }: LinkProps) {
  const tenant = useLinkTenant()
  if (typeof to === 'string' && isExternalHref(to)) {
    return (
      <a href={to} className={props.className} onClick={props.onClick} target={props.target} rel={props.rel}>
        {props.children}
      </a>
    )
  }
  return <Link to={resolveTo(to, tenant)} {...props} />
}

export function TenantNavLink({ to, ...props }: NavLinkProps) {
  const tenant = useLinkTenant()
  return <NavLink to={resolveTo(to, tenant)} {...props} />
}
