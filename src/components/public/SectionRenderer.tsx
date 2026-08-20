import { useContent } from '@/hooks/useContent'
import { useTenant } from '@/contexts/TenantContext'
import { isEventPublic, isNewsPublic } from '@/services/normalize'
import { HeroSection } from '@/components/public/HeroSection'
import { NewsSection, EventsSection } from '@/components/public/NewsEventsSections'
import {
  AcademicsSection,
  AnnouncementSection,
  CallToAction,
  ContactBlock,
  AchievementsSection,
  DocumentsSection,
  GallerySection,
  IdentityStrip,
  MottoSection,
  PrincipalSection,
  QuickLinksSection,
  SchoolLifeSection,
  StaffSection,
  StatisticsBlock,
  WelcomeSection,
} from '@/components/public/ContentSections'
import { resolveVariant, type HomepageSectionConfig } from '@/components/public/sectionCatalog'

export function SectionRenderer({ section }: { section: HomepageSectionConfig }) {
  const content = useContent()
  const { theme, features } = useTenant()
  const type = section.section_type === 'principal_message' ? 'principal' : section.section_type
  const variant = resolveVariant({ ...section, section_type: type }, theme)
  const today = new Date().toISOString().slice(0, 10)
  const news = [...content.news]
    .filter((n) => isNewsPublic(n))
    .filter((n) => n.showOnHomepage || n.isFeatured)
    .sort((a, b) => (a.featuredPriority || 99) - (b.featuredPriority || 99) || b.date.localeCompare(a.date))
  const latest = (news.length ? news : [...content.news].filter((n) => isNewsPublic(n)).sort((a, b) => b.date.localeCompare(a.date))).slice(0, 6)
  const events = [...content.events]
    .filter((e) => isEventPublic(e) && e.status !== 'cancelled' && (e.showOnHomepage || e.featured || e.date >= today))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)
  const stats = [...content.statistics].filter((s) => s.visible).sort((a, b) => a.order - b.order)
  const galleryItems = content.albums.filter((a) => a.status === 'published').flatMap((a) => a.images)
  const gallery = (galleryItems.length ? galleryItems : content.gallery)
  const staff = content.staff.filter((p) => p.displayOnWebsite !== false)
  const docs = content.resources.filter((r) => r.status === 'published')

  if (type === 'news' && features.news === false) return null
  if (type === 'events' && features.events === false) return null
  if (type === 'gallery' && features.gallery === false) return null
  if (type === 'documents' && features.documents === false) return null

  switch (type) {
    case 'hero':
      return <HeroSection variant={variant} />
    case 'identity':
      return <IdentityStrip variant={variant} />
    case 'quick_links':
      return <QuickLinksSection variant={variant} />
    case 'announcement':
      return <AnnouncementSection variant={variant} />
    case 'welcome':
      return <WelcomeSection variant={variant} />
    case 'principal':
      return <PrincipalSection variant={variant} />
    case 'news':
      return <NewsSection articles={latest} variant={variant} />
    case 'events':
      return <EventsSection events={events} variant={variant} />
    case 'statistics':
      return stats.length ? <StatisticsBlock items={stats} variant={variant} /> : null
    case 'academics':
      return <AcademicsSection variant={variant} />
    case 'school-life':
      return <SchoolLifeSection variant={variant} />
    case 'achievements':
      return <AchievementsSection />
    case 'gallery':
      return <GallerySection items={gallery} variant={variant} />
    case 'staff':
      return <StaffSection people={staff} variant={variant} />
    case 'cta':
      return <CallToAction variant={variant} />
    case 'motto':
      return <MottoSection />
    case 'documents':
      return <DocumentsSection items={docs} variant={variant} />
    case 'contact':
      return <ContactBlock variant={variant} />
    default:
      return null
  }
}
