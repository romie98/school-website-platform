import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Home, Megaphone, Newspaper, CalendarDays, Images, FileText,
  Users, Building2, BookOpen, Trophy, Dumbbell, Phone, Share2, Palette, Shield,
  LogOut, GraduationCap, Menu, X, FolderOpen, Paintbrush, ClipboardCheck, Bell, History,
} from 'lucide-react'
import { SchoolCrest } from '@/components/common/SchoolCrest'
import { logoutAdmin } from '@/services/content'
import { currentSessionUser, isPrincipal, canManageUsers } from '@/services/api'
import { useTenant } from '@/contexts/TenantContext'
import { useApprovalStats } from '@/pages/admin/approvals/ApprovalPages'

const groups = [
  {
    label: 'Website',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/homepage', label: 'Homepage', icon: Home },
      { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/admin/news', label: 'News', icon: Newspaper },
      { to: '/admin/events', label: 'Events', icon: CalendarDays },
      { to: '/admin/gallery', label: 'Gallery', icon: Images },
      { to: '/admin/documents', label: 'Documents', icon: FileText },
      { to: '/admin/media', label: 'Media Library', icon: FolderOpen },
    ],
  },
  {
    label: 'School',
    items: [
      { to: '/admin/staff', label: 'Staff', icon: Users },
      { to: '/admin/departments', label: 'Departments', icon: Building2 },
      { to: '/admin/academics', label: 'Academics', icon: BookOpen },
      { to: '/admin/principal', label: "Principal's Message", icon: GraduationCap },
      { to: '/admin/clubs', label: 'Clubs', icon: Trophy },
      { to: '/admin/sports', label: 'Sports', icon: Dumbbell },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/admin/settings/contact', label: 'Contact Details', icon: Phone },
      { to: '/admin/settings/social', label: 'Social Media', icon: Share2 },
      { to: '/admin/settings/branding', label: 'Branding', icon: Palette },
      { to: '/admin/settings/theme', label: 'Theme', icon: Paintbrush },
      { to: '/admin/settings/users', label: 'Users', icon: Shield },
    ],
  },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { school, settings, loading } = useTenant()
  const session = currentSessionUser()
  const principal = isPrincipal()
  const manageUsers = canManageUsers()
  const { pending, unread } = useApprovalStats()
  const waitingForOwnSchool = Boolean(
    loading || (session?.school_id && school?.id !== session.school_id),
  )
  const schoolName = waitingForOwnSchool
    ? session?.school_name || 'School CMS'
    : school?.name || 'School CMS'
  const logo = waitingForOwnSchool ? undefined : (settings?.logoUrl || school?.logoUrl)
  const previewHref = !waitingForOwnSchool && school?.slug ? `/?tenant=${encodeURIComponent(school.slug)}` : '/'
  const approvalItem = {
    to: principal ? '/admin/approvals' : '/admin/changes',
    label: principal ? (pending ? `Approvals (${pending})` : 'Approvals') : 'My Changes',
    icon: ClipboardCheck,
    end: false as boolean | undefined,
  }
  const activityItem = {
    to: '/admin/activity',
    label: 'Activity Log',
    icon: History,
    end: false as boolean | undefined,
  }
  const navGroups = [
    { ...groups[0], items: [groups[0].items[0], approvalItem, ...(manageUsers ? [activityItem] : []), ...groups[0].items.slice(1)] },
    groups[1],
    groups[2],
    {
      ...groups[3],
      items: manageUsers ? groups[3].items : groups[3].items.filter((item) => item.to !== '/admin/settings/users'),
    },
  ]

  const nav = (
        <nav className="px-3 pb-8">
          {navGroups.map((g) => (
            <div key={g.label} className="mb-5">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-gold">{g.label}</p>
              <ul className="mt-2 space-y-0.5">
                {g.items.map((item) => (
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
            </div>
          ))}
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-white/70 hover:bg-white/10"
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
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 overflow-y-auto bg-brand text-white lg:block">
        <div className="flex items-center gap-2 px-4 py-5">
          <SchoolCrest className="h-10 w-10" src={logo || undefined} title={`${schoolName} crest`} />
          <div>
            <p className="font-display text-sm font-bold">{schoolName}</p>
            <p className="text-[11px] text-gold">{principal ? 'Principal' : session?.role === 'school_admin' ? 'Administrator' : 'Editor'}</p>
          </div>
        </div>
        {nav}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-brand-dark/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-64 overflow-y-auto bg-brand text-white">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="font-display font-bold">{schoolName}</span>
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
          <p className="hidden text-sm text-muted sm:block">{schoolName} content management</p>
          <div className="flex items-center gap-3">
            {(unread > 0 || pending > 0) && (
              <a href={principal ? '/admin/approvals' : '/admin/changes'} className="inline-flex items-center gap-1 text-sm text-brand">
                <Bell className="h-4 w-4" />
                {principal ? `${pending} pending` : `${unread} notice${unread === 1 ? '' : 's'}`}
              </a>
            )}
            <a href={previewHref} className="text-sm font-medium text-brand hover:underline">View website</a>
          </div>
        </header>
        <div className="flex-1 p-4 lg:p-8">
          {waitingForOwnSchool ? (
            <p className="text-sm text-muted">Loading your school…</p>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  )
}
