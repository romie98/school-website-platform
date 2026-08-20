import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Building2, Globe, HeartPulse, History, LayoutDashboard, LogOut, Menu, Shield, Users, X } from 'lucide-react'
import { logoutAdmin } from '@/services/content'
import { currentSessionUser } from '@/services/api'
import { DevTenantSwitcher } from '@/components/dev/DevTenantSwitcher'

const items = [
  { to: '/platform', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/platform/schools', label: 'Schools', icon: Building2 },
  { to: '/platform/domains', label: 'Domains', icon: Globe },
  { to: '/platform/users', label: 'Users', icon: Users },
  { to: '/platform/activity', label: 'Activity', icon: History },
  { to: '/platform/system', label: 'System', icon: HeartPulse },
]

export function PlatformLayout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const user = currentSessionUser()

  const nav = (
    <nav className="px-3 pb-8">
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-2 py-2 text-sm ${isActive ? 'bg-gold text-brand-dark' : 'text-white/85 hover:bg-white/10'}`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="mt-6 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-white/70 hover:bg-white/10"
        onClick={() => {
          logoutAdmin()
          navigate('/admin/login')
        }}
      >
        <LogOut className="h-4 w-4" /> Sign out
      </button>
    </nav>
  )

  return (
    <div className="flex min-h-svh bg-cream">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 overflow-y-auto bg-brand-dark text-white lg:block">
        <div className="flex items-center gap-2 px-4 py-5">
          <Shield className="h-8 w-8 text-gold" />
          <div>
            <p className="font-display text-sm font-bold">School Platform</p>
            <p className="text-[11px] text-gold">Super admin</p>
          </div>
        </div>
        {nav}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-brand-dark/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-64 overflow-y-auto bg-brand-dark text-white">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="font-display font-bold">School Platform</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"><X /></button>
            </div>
            {nav}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-brand/10 bg-white px-4 py-3 lg:px-8">
          <button type="button" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="text-brand" />
          </button>
          <p className="hidden text-sm text-muted sm:block">{user?.email || 'Platform owner'}</p>
          <span className="text-xs font-medium uppercase tracking-wide text-gold-dark">Platform console</span>
        </header>
        <div className="flex-1 p-4 lg:p-8">
          <Outlet />
        </div>
      </div>
      <DevTenantSwitcher />
    </div>
  )
}
