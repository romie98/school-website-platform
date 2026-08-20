import { PageMeta } from '@/components/common/PageMeta'
import { SectionRenderer } from '@/components/public/SectionRenderer'
import { useContent } from '@/hooks/useContent'
import { useTenant } from '@/contexts/TenantContext'
import type { HomepageSectionConfig } from '@/components/public/sectionCatalog'

function fallbackSections(enabled: { id: string; enabled: boolean }[], hasQuickLinks: boolean): HomepageSectionConfig[] {
  const items: HomepageSectionConfig[] = [
    { id: 'hero', section_type: 'hero', label: 'Hero', variant: 'default', enabled: true, position: 0 },
  ]
  if (hasQuickLinks) {
    items.push({ id: 'quick_links', section_type: 'quick_links', label: 'Quick links', variant: 'default', enabled: true, position: 1 })
  }
  enabled.forEach((section, index) => {
    items.push({
      id: section.id,
      section_type: section.id,
      label: section.id,
      variant: 'default',
      enabled: section.enabled !== false,
      position: index + items.length,
    })
  })
  return items
}

export function Home() {
  const content = useContent()
  const { school, homepage_sections } = useTenant()
  const name = school?.name || content.branding.schoolName
  const sections = homepage_sections.length
    ? homepage_sections
    : fallbackSections(content.homepage.sections, content.quickLinks.length > 0)

  return (
    <>
      <PageMeta
        title="Official School Website"
        description={`${name} is an established institution preparing young people for the future.`}
        path="/"
      />
      {sections.filter((section) => section.enabled).map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </>
  )
}
