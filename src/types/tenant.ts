import type { SiteContent } from '@/types'

export interface TenantSchool {
  id: string
  name: string
  slug: string
  status: string
  theme: string
  logoUrl?: string | null
  faviconUrl?: string | null
  customDomain?: string | null
  domain?: string | null
}

export interface TenantTheme {
  id?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  headingFont: string
  bodyFont: string
  heroStyle: string
  navbarStyle: string
  newsLayout: string
  eventsLayout: string
  footerStyle: string
  theme: string
  radius?: string
  logoUrl?: string | null
  faviconUrl?: string | null
  label?: string
}

export interface TenantSettings {
  schoolName: string
  shortName?: string | null
  motto?: string | null
  logoUrl?: string | null
  faviconUrl?: string | null
  principalName?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  facebookUrl?: string | null
  instagramUrl?: string | null
  youtubeUrl?: string | null
  tiktokUrl?: string | null
  headingFont?: string
  bodyFont?: string
  theme?: string
}

export interface TenantBundle {
  school: TenantSchool
  theme: TenantTheme
  settings?: TenantSettings
  features: Record<string, boolean>
  navigation: { label: string; href: string; children?: { label: string; href: string }[] }[]
  homepage_sections: { id: string; section_type: string; label: string; enabled: boolean; variant: string; position: number }[]
  content: SiteContent
}
