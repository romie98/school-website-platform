import type {
  AcademicProgramme,
  AdminUser,
  Announcement,
  BrandingSettings,
  Club,
  ContactInfo,
  Department,
  GalleryAlbum,
  GalleryItem,
  HomepageContent,
  MediaFile,
  NewsArticle,
  PrincipalMessage,
  ResourceItem,
  SchoolEvent,
  SiteContent,
  Sport,
  StaffMember,
  Statistic,
} from '@/types'
import { API_BASE_URL } from '@/config/api'
import { slugify } from '@/utils'

export function nowIso() {
  return new Date().toISOString()
}

export function toMedia(url: string, alt = '', kind: MediaFile['kind'] = 'image'): MediaFile {
  return {
    id: `media-${slugify(alt || url.slice(-12))}-${url.length}`,
    url,
    alt,
    name: alt || 'file',
    mimeType: kind === 'image' ? 'image/jpeg' : 'application/pdf',
    size: 0,
    kind,
    createdAt: nowIso(),
  }
}

export function mediaUrl(value?: MediaFile | string | null) {
  if (!value) return ''

  const raw = typeof value === 'string' ? value : value.url || ''
  if (!raw) return ''

  if (raw.startsWith('/api/')) {
    return `${API_BASE_URL}${raw}`
  }

  return raw
}

export function htmlFromParagraphs(paragraphs: string[] | string | undefined) {
  if (!paragraphs) return ''
  if (typeof paragraphs === 'string') return paragraphs
  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('')
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function htmlToPlain(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function num(value: unknown, fallback = 0) {
  return typeof value === 'number' && !Number.isNaN(value) ? value : fallback
}

function bool(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function parseName(full: string) {
  const titles = ['Dr', 'Mr', 'Mrs', 'Miss', 'Ms', 'Professor']
  const parts = full.trim().split(/\s+/)
  let honorific = ''
  if (parts[0] && titles.includes(parts[0].replace('.', ''))) {
    honorific = parts.shift()!.replace('.', '')
    if (honorific === 'Dr') honorific = 'Dr.'
    else if (!honorific.endsWith('.')) honorific = `${honorific}.`
  }
  const lastName = parts.pop() ?? ''
  const firstName = parts.join(' ')
  return { honorific, firstName, lastName }
}

function staffTypeFrom(department: string, administration?: boolean): StaffMember['staffType'] {
  if (department === 'Guidance') return 'Guidance'
  if (department === 'Support Staff') return 'Support Staff'
  if (administration || department === 'Administration') return 'Administration'
  return 'Teaching Staff'
}

export function normalizeNews(raw: unknown, index = 0): NewsArticle {
  const n = asRecord(raw)
  const title = str(n.title || n.headline, 'Untitled story')
  const date = str(n.date || n.publishedAt, nowIso().slice(0, 10))
  const image = str(n.image) || mediaUrl(n.featuredImage as MediaFile)
  const galleryRaw = Array.isArray(n.gallery) ? n.gallery : []
  const gallery: MediaFile[] = galleryRaw.map((item, i) =>
    typeof item === 'string' ? toMedia(item, `${title} ${i + 1}`) : (item as MediaFile),
  )
  const content = htmlFromParagraphs(n.content as string[] | string)
  return {
    id: str(n.id, crypto.randomUUID?.() ?? `news-${index}`),
    slug: str(n.slug, slugify(title)),
    title,
    excerpt: str(n.excerpt),
    content,
    category: (n.category as NewsArticle['category']) || 'General',
    author: str(n.author, 'Communications'),
    image,
    imageAlt: str(n.imageAlt, title),
    featuredImage: (n.featuredImage as MediaFile) || (image ? toMedia(image, title) : undefined),
    gallery,
    status: (n.status as NewsArticle['status']) || 'published',
    isFeatured: bool(n.isFeatured, bool(n.featured)),
    showOnHomepage: bool(n.showOnHomepage, bool(n.featured, index < 3)),
    featuredPriority: num(n.featuredPriority, bool(n.featured) ? 1 : 0),
    date,
    publishedAt: str(n.publishedAt, date),
    createdAt: str(n.createdAt, date),
    updatedAt: str(n.updatedAt, date),
  }
}

export function normalizeEvent(raw: unknown, index = 0): SchoolEvent {
  const n = asRecord(raw)
  const title = str(n.title, 'Untitled event')
  const date = str(n.date, nowIso().slice(0, 10))
  const image = str(n.image) || mediaUrl(n.featuredImage as MediaFile)
  return {
    id: str(n.id, `event-${index}`),
    slug: str(n.slug, slugify(title)),
    title,
    description: htmlFromParagraphs(n.description as string[] | string),
    date,
    endDate: n.endDate ? str(n.endDate) : undefined,
    startTime: str(n.startTime, '8:30 a.m.'),
    endTime: n.endTime ? str(n.endTime) : undefined,
    allDay: bool(n.allDay),
    location: str(n.location, 'Campus'),
    category: (n.category as SchoolEvent['category']) || 'Academic',
    image: image || undefined,
    featuredImage: (n.featuredImage as MediaFile) || (image ? toMedia(image, title) : undefined),
    contactPerson: n.contactPerson ? str(n.contactPerson) : undefined,
    registrationUrl: n.registrationUrl ? str(n.registrationUrl) : undefined,
    featured: bool(n.featured),
    showOnHomepage: bool(n.showOnHomepage, true),
    status: (n.status as SchoolEvent['status']) || 'published',
    createdAt: str(n.createdAt, date),
    updatedAt: str(n.updatedAt, date),
  }
}

export function normalizeStaff(raw: unknown, index = 0): StaffMember {
  const n = asRecord(raw)
  const name = str(n.name)
  const parsed = parseName(name)
  const photo = str(n.photo) || mediaUrl(n.photoMedia as MediaFile)
  const department = str(n.department, 'Administration')
  return {
    id: str(n.id, `staff-${index}`),
    honorific: str(n.honorific, parsed.honorific),
    firstName: str(n.firstName, parsed.firstName),
    lastName: str(n.lastName, parsed.lastName),
    name: name || `${str(n.honorific)} ${str(n.firstName)} ${str(n.lastName)}`.trim(),
    role: str(n.role, 'Teacher'),
    department,
    departmentId: n.departmentId ? str(n.departmentId) : undefined,
    staffType: (n.staffType as StaffMember['staffType']) || staffTypeFrom(department, bool(n.administration)),
    email: n.email ? str(n.email) : undefined,
    phoneExtension: n.phoneExtension ? str(n.phoneExtension) : undefined,
    qualifications: n.qualifications ? str(n.qualifications) : undefined,
    photo,
    photoMedia: (n.photoMedia as MediaFile) || (photo ? toMedia(photo, name) : undefined),
    bio: n.bio ? str(n.bio) : undefined,
    featured: bool(n.featured),
    administration: bool(n.administration),
    displayOnWebsite: bool(n.displayOnWebsite, true),
    displayOrder: num(n.displayOrder, index + 1),
    status: (n.status as StaffMember['status']) || 'active',
    createdAt: str(n.createdAt, nowIso()),
    updatedAt: str(n.updatedAt, nowIso()),
  }
}

export function normalizeDepartment(raw: unknown, index = 0): Department {
  const n = asRecord(raw)
  const name = str(n.name, 'Department')
  const image = str(n.image) || mediaUrl(n.imageMedia as MediaFile)
  const achievements = Array.isArray(n.achievements) ? (n.achievements as string[]).map((a) => `<p>${escapeHtml(a)}</p>`).join('') : str(n.achievements)
  return {
    id: str(n.id, `dept-${index}`),
    slug: str(n.slug, slugify(name)),
    name,
    shortName: n.shortName ? str(n.shortName) : undefined,
    overview: str(n.overview).startsWith('<') ? str(n.overview) : `<p>${escapeHtml(str(n.overview))}</p>`,
    headOfDepartment: str(n.headOfDepartment),
    headOfDepartmentId: n.headOfDepartmentId ? str(n.headOfDepartmentId) : undefined,
    subjects: Array.isArray(n.subjects) ? (n.subjects as string[]) : [],
    programmes: Array.isArray(n.programmes) ? (n.programmes as string[]) : [],
    achievements,
    resources: Array.isArray(n.resources) ? (n.resources as Department['resources']) : [],
    image,
    imageMedia: (n.imageMedia as MediaFile) || (image ? toMedia(image, name) : undefined),
    email: n.email ? str(n.email) : undefined,
    teacherIds: Array.isArray(n.teacherIds) ? (n.teacherIds as string[]) : [],
    displayOnWebsite: bool(n.displayOnWebsite, true),
    displayOrder: num(n.displayOrder, index + 1),
    status: (n.status as Department['status']) || 'active',
    createdAt: str(n.createdAt, nowIso()),
    updatedAt: str(n.updatedAt, nowIso()),
  }
}

export function normalizeProgramme(raw: unknown, index = 0): AcademicProgramme {
  const n = asRecord(raw)
  const title = str(n.title, 'Programme')
  return {
    id: str(n.id, `prog-${index}`),
    slug: str(n.slug, slugify(title)),
    title,
    summary: str(n.summary),
    description: str(n.description),
    icon: str(n.icon, 'BookOpen'),
    image: n.image ? str(n.image) : undefined,
    imageMedia: n.imageMedia as MediaFile | undefined,
    href: str(n.href, '/academics'),
    subjects: Array.isArray(n.subjects) ? (n.subjects as string[]) : [],
    requirements: n.requirements ? str(n.requirements) : undefined,
    active: bool(n.active, true),
    displayOrder: num(n.displayOrder, index + 1),
    createdAt: str(n.createdAt, nowIso()),
    updatedAt: str(n.updatedAt, nowIso()),
  }
}

export function normalizeClub(raw: unknown, index = 0): Club {
  const n = asRecord(raw)
  const name = str(n.name, 'Club')
  const image = str(n.image) || mediaUrl(n.imageMedia as MediaFile)
  const photos = Array.isArray(n.photos) ? (n.photos as string[]) : []
  return {
    id: str(n.id, `club-${index}`),
    slug: str(n.slug, slugify(name)),
    name,
    description: str(n.description),
    coordinator: str(n.coordinator),
    meeting: str(n.meeting),
    meetingDay: n.meetingDay ? str(n.meetingDay) : undefined,
    meetingTime: n.meetingTime ? str(n.meetingTime) : undefined,
    meetingLocation: n.meetingLocation ? str(n.meetingLocation) : undefined,
    contact: n.contact ? str(n.contact) : undefined,
    achievements: Array.isArray(n.achievements) ? (n.achievements as string[]) : [],
    photos,
    gallery: Array.isArray(n.gallery)
      ? (n.gallery as MediaFile[])
      : photos.map((src, i) => toMedia(src, `${name} ${i + 1}`)),
    image,
    imageMedia: (n.imageMedia as MediaFile) || (image ? toMedia(image, name) : undefined),
    active: bool(n.active, true),
    createdAt: str(n.createdAt, nowIso()),
    updatedAt: str(n.updatedAt, nowIso()),
  }
}

export function normalizeSport(raw: unknown, index = 0): Sport {
  const n = asRecord(raw)
  const name = str(n.name, 'Sport')
  const image = str(n.image) || mediaUrl(n.imageMedia as MediaFile)
  const photos = Array.isArray(n.photos) ? (n.photos as string[]) : []
  const fixtures = Array.isArray(n.fixtures)
    ? (n.fixtures as Sport['fixtures']).map((f, i) => ({
        id: f.id || `fx-${index}-${i}`,
        opponent: f.opponent,
        competition: f.competition,
        date: f.date,
        time: f.time,
        venue: f.venue,
        result: f.result,
        score: f.score,
      }))
    : []
  return {
    id: str(n.id, `sport-${index}`),
    slug: str(n.slug, slugify(name)),
    name,
    overview: str(n.overview),
    coach: str(n.coach),
    assistantCoach: n.assistantCoach ? str(n.assistantCoach) : undefined,
    teamCategory: n.teamCategory ? str(n.teamCategory) : undefined,
    trainingSchedule: n.trainingSchedule ? str(n.trainingSchedule) : undefined,
    activeSeason: n.activeSeason ? str(n.activeSeason) : undefined,
    teams: Array.isArray(n.teams) ? (n.teams as string[]) : [],
    fixtures,
    achievements: Array.isArray(n.achievements) ? (n.achievements as string[]) : [],
    photos,
    gallery: Array.isArray(n.gallery)
      ? (n.gallery as MediaFile[])
      : photos.map((src, i) => toMedia(src, `${name} ${i + 1}`)),
    image,
    imageMedia: (n.imageMedia as MediaFile) || (image ? toMedia(image, name) : undefined),
    active: bool(n.active, true),
    createdAt: str(n.createdAt, nowIso()),
    updatedAt: str(n.updatedAt, nowIso()),
  }
}

export function normalizeAnnouncement(raw: unknown, index = 0): Announcement {
  const n = asRecord(raw)
  const message = str(n.message)
  return {
    id: str(n.id, `ann-${index}`),
    title: str(n.title, message.slice(0, 48) || 'Announcement'),
    message,
    type: (n.type as Announcement['type']) || (bool(n.active) ? 'Important' : 'General'),
    linkLabel: n.linkLabel ? str(n.linkLabel) : undefined,
    linkHref: n.linkHref ? str(n.linkHref) : undefined,
    active: bool(n.active, true),
    dismissible: bool(n.dismissible, true),
    startsAt: n.startsAt ? str(n.startsAt) : undefined,
    endsAt: n.endsAt ? str(n.endsAt) : undefined,
    priority: num(n.priority, 1),
    placement: (n.placement as Announcement['placement']) || 'bar',
    createdAt: str(n.createdAt, nowIso()),
    updatedAt: str(n.updatedAt, nowIso()),
  }
}

export function normalizeResource(raw: unknown, index = 0): ResourceItem {
  const n = asRecord(raw)
  const name = str(n.name, 'Document')
  return {
    id: str(n.id, `doc-${index}`),
    name,
    description: n.description ? str(n.description) : undefined,
    category: (n.category as ResourceItem['category']) || 'Other',
    fileType: str(n.fileType, 'PDF'),
    uploadedAt: str(n.uploadedAt, nowIso().slice(0, 10)),
    size: str(n.size, '—'),
    href: str(n.href, '#'),
    file: n.file as MediaFile | undefined,
    academicYear: n.academicYear ? str(n.academicYear) : '2025-2026',
    publishedAt: n.publishedAt ? str(n.publishedAt) : str(n.uploadedAt),
    status: (n.status as ResourceItem['status']) || 'published',
    createdAt: str(n.createdAt, nowIso()),
    updatedAt: str(n.updatedAt, nowIso()),
  }
}

export function normalizeGalleryItem(raw: unknown, index = 0): GalleryItem {
  const n = asRecord(raw)
  const src = str(n.src) || mediaUrl(n.media as MediaFile)
  return {
    id: str(n.id, `g-${index}`),
    src,
    alt: str(n.alt, 'Gallery image'),
    caption: n.caption ? str(n.caption) : undefined,
    category: (n.category as GalleryItem['category']) || 'Campus Life',
    album: str(n.album, 'Campus'),
    albumSlug: str(n.albumSlug, slugify(str(n.album, 'campus'))),
    media: (n.media as MediaFile) || (src ? toMedia(src, str(n.alt)) : undefined),
    order: num(n.order, index),
  }
}

function albumsFromGallery(items: GalleryItem[]): GalleryAlbum[] {
  const map = new Map<string, GalleryAlbum>()
  items.forEach((item) => {
    const current = map.get(item.albumSlug)
    if (current) {
      current.images.push(item)
    } else {
      map.set(item.albumSlug, {
        id: `album-${item.albumSlug}`,
        slug: item.albumSlug,
        title: item.album,
        description: '',
        cover: item.media,
        category: item.category,
        status: 'published',
        images: [item],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      })
    }
  })
  return [...map.values()]
}

function defaultHomepage(raw: unknown): HomepageContent {
  const n = asRecord(raw)
  const sections = Array.isArray(n.sections)
    ? (n.sections as HomepageContent['sections'])
    : [
        { id: 'welcome', label: 'Welcome', enabled: true },
        { id: 'principal', label: 'Principal', enabled: true },
        { id: 'news', label: 'News', enabled: true },
        { id: 'events', label: 'Events', enabled: true },
        { id: 'statistics', label: 'Statistics', enabled: true },
        { id: 'academics', label: 'Academics', enabled: true },
        { id: 'school-life', label: 'School Life', enabled: true },
        { id: 'gallery', label: 'Gallery', enabled: true },
        { id: 'cta', label: 'CTA', enabled: true },
      ]
  return {
    heroEyebrow: str(n.heroEyebrow),
    heroTitle: str(n.heroTitle),
    heroTagline: str(n.heroTagline),
    heroImage: str(n.heroImage),
    heroImageMedia: n.heroImageMedia as MediaFile | undefined,
    primaryButtonLabel: str(n.primaryButtonLabel, 'Explore Our School'),
    primaryButtonUrl: str(n.primaryButtonUrl, '/about'),
    secondaryButtonLabel: str(n.secondaryButtonLabel, 'Admissions'),
    secondaryButtonUrl: str(n.secondaryButtonUrl, '/admissions'),
    welcomeTitle: str(n.welcomeTitle, 'Welcome'),
    welcomeBody: Array.isArray(n.welcomeBody) ? (n.welcomeBody as string[]) : [str(n.welcomeBody)],
    welcomeImage: str(n.welcomeImage),
    welcomeImageMedia: n.welcomeImageMedia as MediaFile | undefined,
    welcomeButtonLabel: str(n.welcomeButtonLabel, 'Learn More About Us'),
    welcomeButtonUrl: str(n.welcomeButtonUrl, '/about'),
    sections,
  }
}

function defaultPrincipal(raw: unknown): PrincipalMessage {
  const n = asRecord(raw)
  const paragraphs = Array.isArray(n.paragraphs) ? (n.paragraphs as string[]) : []
  return {
    name: str(n.name, 'Principal'),
    title: str(n.title, 'Principal'),
    photo: str(n.photo),
    photoMedia: n.photoMedia as MediaFile | undefined,
    excerpt: str(n.excerpt),
    messageTitle: str(n.messageTitle, 'Welcome'),
    content: str(n.content) || htmlFromParagraphs(paragraphs),
    paragraphs,
    signature: str(n.signature, str(n.name)),
    signatureImage: n.signatureImage as MediaFile | undefined,
    updatedAt: str(n.updatedAt, nowIso()),
  }
}

function defaultContact(raw: unknown): ContactInfo {
  const n = asRecord(raw)
  const social = Array.isArray(n.social)
    ? (n.social as ContactInfo['social']).map((s) => ({
        platform: s.platform,
        href: s.href,
        enabled: s.enabled !== false,
      }))
    : []
  const emails = Array.isArray(n.email) ? (n.email as string[]) : []
  return {
    schoolName: str(n.schoolName),
    addressLines: Array.isArray(n.addressLines) ? (n.addressLines as string[]) : [],
    phone: Array.isArray(n.phone) ? (n.phone as string[]) : [],
    email: emails,
    admissionsEmail: str(n.admissionsEmail, emails[1] || emails[0] || ''),
    generalEmail: str(n.generalEmail, emails[0] || ''),
    officeHours: str(n.officeHours),
    mapEmbedUrl: str(n.mapEmbedUrl),
    social,
  }
}

function defaultBranding(raw: unknown): BrandingSettings {
  const n = asRecord(raw)
  return {
    schoolName: str(n.schoolName),
    motto: str(n.motto),
    mottoTranslation: n.mottoTranslation ? str(n.mottoTranslation) : undefined,
    established: n.established ? str(n.established) : undefined,
    primaryColor: str(n.primaryColor, '#0B3D2E'),
    secondaryColor: str(n.secondaryColor, '#FFD100'),
    accentColor: str(n.accentColor, '#145C45'),
    crestUrl: n.crestUrl ? str(n.crestUrl) : undefined,
    faviconUrl: n.faviconUrl ? str(n.faviconUrl) : undefined,
    footerLogoUrl: n.footerLogoUrl ? str(n.footerLogoUrl) : undefined,
    crestMedia: n.crestMedia as MediaFile | undefined,
    faviconMedia: n.faviconMedia as MediaFile | undefined,
    footerLogoMedia: n.footerLogoMedia as MediaFile | undefined,
  }
}

function defaultUsers(raw: unknown): AdminUser[] {
  if (Array.isArray(raw) && raw.length) return raw as AdminUser[]
  return []
}

export function upgradeSite(raw: Partial<SiteContent> | Record<string, unknown>): SiteContent {
  const n = raw as Partial<SiteContent>
  const gallery = (n.gallery ?? []).map((item, i) => normalizeGalleryItem(item, i))
  const albums = n.albums?.length ? n.albums : albumsFromGallery(gallery)
  const statistics: Statistic[] = (n.statistics ?? []).map((s, i) => ({
    ...s,
    visible: s.visible !== false,
    order: s.order ?? i + 1,
  }))

  return {
    announcements: (n.announcements ?? []).map(normalizeAnnouncement),
    homepage: defaultHomepage(n.homepage),
    quickLinks: n.quickLinks ?? [],
    statistics,
    news: (n.news ?? []).map(normalizeNews),
    events: (n.events ?? []).map(normalizeEvent),
    staff: (n.staff ?? []).map(normalizeStaff),
    programmes: (n.programmes ?? []).map(normalizeProgramme),
    departments: (n.departments ?? []).map(normalizeDepartment),
    clubs: (n.clubs ?? []).map(normalizeClub),
    sports: (n.sports ?? []).map(normalizeSport),
    houses: n.houses ?? [],
    gallery,
    albums,
    resources: (n.resources ?? []).map(normalizeResource),
    mediaLibrary: n.mediaLibrary ?? [],
    values: n.values ?? [],
    contact: defaultContact(n.contact),
    principal: defaultPrincipal(n.principal),
    about: (n.about ?? {
      overview: [],
      history: [],
      mission: '',
      vision: '',
      motto: '',
      crestExplanation: [],
      achievements: [],
      campus: [],
    }) as SiteContent['about'],
    admissions: (n.admissions ?? {
      intro: [],
      requirements: [],
      process: [],
      documents: [],
      transfers: [],
      deadlines: [],
      faqs: [],
    }) as SiteContent['admissions'],
    branding: defaultBranding(n.branding),
    users: defaultUsers(n.users),
    activity: n.activity ?? [],
  }
}

export function displayStaffName(person: StaffMember) {
  return person.name || [person.honorific, person.firstName, person.lastName].filter(Boolean).join(' ')
}

export function isNewsPublic(article: NewsArticle, allowPreview = false) {
  if (allowPreview) return true
  return article.status === 'published'
}

export function isEventPublic(event: SchoolEvent, allowPreview = false) {
  if (allowPreview) return true
  return event.status === 'published' || event.status === 'completed'
}

export function isAnnouncementLive(item: Announcement) {
  if (!item.active) return false
  const now = Date.now()
  if (item.startsAt && new Date(item.startsAt).getTime() > now) return false
  if (item.endsAt && new Date(item.endsAt).getTime() < now) return false
  return true
}
