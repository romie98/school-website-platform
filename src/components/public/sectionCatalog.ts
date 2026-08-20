export interface HomepageSectionConfig {
  id: string
  section_type: string
  label: string
  variant: string
  enabled: boolean
  position: number
  configuration?: Record<string, unknown>
}

export const SECTION_CATALOG = [
  { id: 'hero', label: 'Hero', variants: ['full-image', 'split', 'slideshow', 'compact', 'cinematic', 'spotlight'] },
  { id: 'identity', label: 'Heritage strip', variants: ['default', 'gold'] },
  { id: 'quick_links', label: 'Quick links', variants: ['default', 'panels', 'compact'] },
  { id: 'announcement', label: 'Announcements', variants: ['banner', 'cards'] },
  { id: 'welcome', label: 'Welcome', variants: ['default', 'split'] },
  { id: 'principal', label: "Principal's message", variants: ['default', 'quote', 'card', 'editorial', 'asymmetric'] },
  { id: 'news', label: 'News', variants: ['grid', 'featured', 'cards', 'list', 'editorial'] },
  { id: 'events', label: 'Events', variants: ['calendar', 'cards', 'timeline', 'list', 'date-list'] },
  { id: 'statistics', label: 'Statistics', variants: ['default', 'light', 'band'] },
  { id: 'academics', label: 'Academics', variants: ['default', 'levels'] },
  { id: 'school-life', label: 'School life', variants: ['default', 'split'] },
  { id: 'gallery', label: 'Gallery', variants: ['grid', 'featured', 'masonry'] },
  { id: 'staff', label: 'Staff', variants: ['grid', 'featured'] },
  { id: 'cta', label: 'Call to action', variants: ['default', 'split', 'connect'] },
  { id: 'achievements', label: 'Achievements', variants: ['default'] },
  { id: 'motto', label: 'Motto statement', variants: ['default'] },
  { id: 'documents', label: 'Documents', variants: ['list', 'cards'] },
  { id: 'contact', label: 'Contact', variants: ['default', 'split'] },
] as const

export function variantsFor(type: string) {
  const id = type === 'principal_message' ? 'principal' : type
  return SECTION_CATALOG.find((item) => item.id === id)?.variants ?? ['default']
}

export function resolveVariant(section: HomepageSectionConfig, theme?: { heroStyle?: string; newsLayout?: string; eventsLayout?: string } | null) {
  const type = section.section_type === 'principal_message' ? 'principal' : section.section_type
  if (section.variant && section.variant !== 'default') return section.variant
  if (type === 'hero') return theme?.heroStyle || 'full-image'
  if (type === 'news') return theme?.newsLayout || 'featured'
  if (type === 'events') return theme?.eventsLayout || 'cards'
  return 'default'
}
