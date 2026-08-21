import { useEffect, useId, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { TenantLink as Link, TenantNavLink as NavLink } from '@/components/common/TenantLink'
import { ChevronDown, Menu, X } from 'lucide-react'
import { SchoolCrest } from '@/components/common/SchoolCrest'
import { Button } from '@/components/common/Button'
import { useContent } from '@/hooks/useContent'
import { useTenant } from '@/contexts/TenantContext'
import type { NavLink as NavItem } from '@/types'

export const navItems: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'About',
    href: '/about',
    children: [
      { label: 'School Overview', href: '/about' },
      { label: "Principal's Message", href: '/about/principal' },
      { label: 'Administration', href: '/about/administration' },
      { label: 'Staff Directory', href: '/about/staff' },
    ],
  },
  {
    label: 'Academics',
    href: '/academics',
    children: [
      { label: 'Overview', href: '/academics' },
      { label: 'Departments', href: '/academics/departments' },
    ],
  },
  { label: 'Admissions', href: '/admissions' },
  {
    label: 'School Life',
    href: '/school-life',
    children: [
      { label: 'Overview', href: '/school-life' },
      { label: 'Clubs & Societies', href: '/school-life/clubs' },
      { label: 'Sports', href: '/school-life/sports' },
      { label: 'Houses', href: '/school-life/houses' },
    ],
  },
  { label: 'Students', href: '/students' },
  { label: 'Parents', href: '/parents' },
  {
    label: 'News & Events',
    href: '/news',
    children: [
      { label: 'News', href: '/news' },
      { label: 'Calendar', href: '/events' },
    ],
  },
  { label: 'Contact', href: '/contact' },
]

const heritageNav: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Academics', href: '/academics' },
  { label: 'Students', href: '/students' },
  { label: 'News', href: '/news' },
  { label: 'Events', href: '/events' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'Contact', href: '/contact' },
]

const heritageUtility = [
  { label: 'Contact', href: '/contact' },
  { label: 'Student Resources', href: '/students' },
  { label: 'Staff', href: '/about/staff' },
  { label: 'Alumni', href: '/about' },
]

const lightNav: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'About',
    href: '/about',
    children: [
      { label: 'Our History', href: '/about' },
      { label: 'Mission & Vision', href: '/about' },
      { label: "Principal's Message", href: '/about/principal' },
      { label: 'Leadership', href: '/about/administration' },
      { label: 'Staff Directory', href: '/about/staff' },
    ],
  },
  {
    label: 'Academics',
    href: '/academics',
    children: [
      { label: 'Overview', href: '/academics' },
      { label: 'Departments', href: '/academics/departments' },
      { label: 'Academic Resources', href: '/resources' },
    ],
  },
  { label: 'Admissions', href: '/admissions' },
  {
    label: 'Student Life',
    href: '/school-life',
    children: [
      { label: 'Overview', href: '/school-life' },
      { label: 'Clubs & Societies', href: '/school-life/clubs' },
      { label: 'Sports', href: '/school-life/sports' },
      { label: 'Student Leadership', href: '/students' },
    ],
  },
  { label: 'News', href: '/news' },
  { label: 'Events', href: '/events' },
  { label: 'Resources', href: '/resources' },
  { label: 'Contact', href: '/contact' },
]

function DesktopDropdown({ item, light = false }: { item: NavItem; light?: boolean }) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <li
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <NavLink
        to={item.href}
        className={({ isActive }) =>
          `inline-flex items-center gap-1 px-2 py-2 text-[13px] font-semibold tracking-wide ${
            light
              ? isActive ? 'text-gold-dark' : 'text-brand hover:text-gold-dark'
              : isActive ? 'text-gold-dark' : 'text-white hover:text-gold'
          }`
        }
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={id}
      >
        {item.label}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </NavLink>
      {open && item.children && (
        <ul
          id={id}
          className="absolute left-0 top-full z-50 min-w-52 rounded-md bg-white py-2 shadow-[var(--shadow-nav)] ring-1 ring-brand/10"
        >
          {item.children.map((child) => (
            <li key={child.href}>
              <NavLink
                to={child.href}
                className="block px-4 py-2 text-sm text-brand hover:bg-cream hover:text-brand-mid"
              >
                {child.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const { branding, contact } = useContent()
  const { school, theme, navigation } = useTenant()
  const crest = branding.crestMedia?.url || branding.crestUrl || school?.logoUrl
  const schoolName = branding.schoolName || school?.name || contact.schoolName
  const locationLabel = (contact.addressLines ?? []).slice(-2).join(', ') || ''

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const variant = theme?.navbarStyle || 'classic'
  const motto = branding.motto || school?.name || ''
  const menu = navigation.length ? navigation : variant === 'light' ? lightNav : navItems

  if (variant === 'heritage') {
    return (
      <header data-navbar="heritage" className={`sticky top-0 z-50 bg-brand text-white ${scrolled ? 'shadow-[var(--shadow-nav)]' : ''}`}>
        <div className="border-b border-gold/30 bg-brand-dark">
          <div className="page-wrap flex flex-wrap items-center justify-end gap-x-5 gap-y-1 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">
            {heritageUtility.map((item) => (
              <Link key={item.href + item.label} to={item.href} className="hover:text-white focus-visible:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="page-wrap flex items-center justify-between gap-4 py-3 lg:py-2">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <SchoolCrest className="h-14 w-14 shrink-0 lg:h-16 lg:w-16" src={crest} title={`${schoolName} crest`} />
            <span className="leading-tight">
              <span className="block font-display text-base font-semibold tracking-[0.08em] text-white lg:text-lg">{schoolName}</span>
              {motto ? <span className="mt-0.5 block font-display text-[11px] italic tracking-[0.18em] text-gold">{motto}</span> : null}
            </span>
          </Link>
          <nav className="hidden lg:block" aria-label="Primary">
            <ul className="flex items-center gap-1">
              {heritageNav.map((item) => (
                <li key={item.label}>
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    className={({ isActive }) =>
                      `px-2.5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                        isActive ? 'border-b-2 border-gold text-gold' : 'text-white/90 hover:text-gold'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <button
            type="button"
            className="rounded-sm p-2 lg:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-gold/25 bg-brand-dark lg:hidden">
            <nav aria-label="Mobile" className="page-wrap max-h-[80vh] overflow-y-auto py-4">
              <ul className="space-y-1">
                {heritageNav.map((item) => (
                  <li key={item.label}>
                    <NavLink to={item.href} className="block px-2 py-2 font-display text-sm tracking-wide text-white hover:text-gold">
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        )}
      </header>
    )
  }

  if (variant === 'light') {
    return (
      <header data-navbar="light" className={`sticky top-0 z-50 border-b border-brand/10 bg-white text-brand ${scrolled ? 'shadow-[var(--shadow-nav)]' : ''}`}>
        <div className="page-wrap flex items-center justify-between gap-4 py-2.5 lg:py-0">
          <Link to="/" className="flex min-w-0 items-center gap-3 py-2">
            <SchoolCrest className="h-12 w-12 shrink-0 lg:h-14 lg:w-14" src={crest} title={`${schoolName} crest`} />
            <span className="leading-tight">
              <span className="block font-display text-sm font-bold tracking-wide text-brand lg:text-base">{schoolName}</span>
              {motto ? <span className="block text-[11px] text-gold-dark">{motto}</span> : null}
            </span>
          </Link>
          <nav className="hidden lg:block" aria-label="Primary">
            <ul className="flex items-center gap-0.5">
              {menu.map((item) =>
                item.children ? (
                  <DesktopDropdown key={item.label} item={item} light />
                ) : (
                  <li key={item.label}>
                    <NavLink
                      to={item.href}
                      end={item.href === '/'}
                      className={({ isActive }) =>
                        `px-2 py-5 text-[13px] font-semibold tracking-wide ${
                          isActive ? 'border-b-2 border-gold text-gold-dark' : 'text-brand hover:text-gold-dark'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ),
              )}
            </ul>
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <Button href="/admissions" className="!py-2 text-xs">Admissions</Button>
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-brand lg:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X /> : <Menu />}
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-brand/10 bg-white lg:hidden">
            <nav aria-label="Mobile" className="page-wrap max-h-[80vh] overflow-y-auto py-4">
              <ul className="space-y-1">
                {menu.map((item) => (
                  <li key={item.label}>
                    <NavLink to={item.href} className="block rounded px-2 py-2 font-semibold text-brand hover:bg-cream">
                      {item.label}
                    </NavLink>
                    {item.children && (
                      <ul className="mb-2 ml-3 border-l border-gold/50 pl-3">
                        {item.children.map((child) => (
                          <li key={child.href + child.label}>
                            <NavLink to={child.href} className="block py-1.5 text-sm text-muted hover:text-brand">
                              {child.label}
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <Button href="/admissions" className="mt-4 w-full">Admissions</Button>
            </nav>
          </div>
        )}
      </header>
    )
  }

  const headerClass = {
    classic: `sticky top-0 z-50 bg-brand text-white ${scrolled ? 'shadow-[var(--shadow-nav)]' : ''}`,
    modern: `sticky top-0 z-50 border-b border-white/10 bg-brand/95 text-white backdrop-blur ${scrolled ? 'shadow-[var(--shadow-nav)]' : ''}`,
    floating: 'sticky top-3 z-50 mx-3 rounded-2xl bg-brand text-white shadow-[var(--shadow-nav)] lg:mx-auto lg:max-w-6xl',
    centered: `sticky top-0 z-50 bg-brand text-white ${scrolled ? 'shadow-[var(--shadow-nav)]' : ''}`,
  }[variant] || `sticky top-0 z-50 bg-brand text-white`

  const brand = (
        <Link to="/" className={`flex items-center gap-3 py-2 ${variant === 'centered' ? 'justify-center' : ''}`}>
          <SchoolCrest className="h-12 w-12 shrink-0 lg:h-14 lg:w-14" src={crest} />
          <span className="leading-tight">
            <span className="block font-display text-sm font-bold tracking-wide lg:text-base">{schoolName}</span>
            {locationLabel ? <span className="block text-[11px] text-gold">{locationLabel}</span> : null}
          </span>
        </Link>
  )

  const desktopNav = (
        <nav className={`${variant === 'centered' ? 'hidden w-full justify-center border-t border-white/10 lg:flex' : 'hidden lg:block'}`} aria-label="Primary">
          <ul className="flex items-center gap-0.5">
            {menu.map((item) =>
              item.children ? (
                <DesktopDropdown key={item.label} item={item} />
              ) : (
                <li key={item.label}>
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    className={({ isActive }) =>
                      `px-1.5 py-5 text-[12px] font-semibold tracking-wide xl:px-2 xl:text-[13px] ${
                        isActive
                          ? variant === 'modern' ? 'text-gold' : 'border-b-2 border-gold text-gold'
                          : 'text-white hover:text-gold'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ),
            )}
          </ul>
        </nav>
  )

  return (
    <header data-navbar={variant} className={headerClass}>
      <div className={`page-wrap ${variant === 'centered' ? 'relative flex items-center justify-center py-2' : 'flex items-center justify-between gap-4 py-2.5 lg:py-0'}`}>
        {brand}
        {variant !== 'centered' && desktopNav}

        <div className={`${variant === 'centered' ? 'absolute right-0 top-1/2 hidden -translate-y-1/2 lg:flex' : 'hidden lg:flex'} items-center gap-2`}>
          <Button href="/admissions" className="!py-2 text-xs">
            Admissions
          </Button>
        </div>

        <button
          type="button"
          className={`${variant === 'centered' ? 'absolute right-0 top-1/2 -translate-y-1/2' : ''} rounded-md p-2 lg:hidden`}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>
      {variant === 'centered' && desktopNav}

      {mobileOpen && (
        <div className="border-t border-white/10 bg-brand-dark lg:hidden">
          <nav aria-label="Mobile" className="page-wrap max-h-[80vh] overflow-y-auto py-4">
            <ul className="space-y-1">
              {menu.map((item) => (
                <li key={item.label}>
                  <NavLink
                    to={item.href}
                    className="block rounded px-2 py-2 font-semibold text-white hover:bg-white/10"
                  >
                    {item.label}
                  </NavLink>
                  {item.children && (
                    <ul className="mb-2 ml-3 border-l border-gold/40 pl-3">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <NavLink to={child.href} className="block py-1.5 text-sm text-white/80 hover:text-gold">
                            {child.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            <Button href="/admissions" className="mt-4 w-full">
              Admissions
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
