export type PublishStatus = 'draft' | 'published' | 'archived'
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed'
export type StaffType = 'Administration' | 'Teaching Staff' | 'Support Staff' | 'Guidance' | 'Other'
export type AnnouncementType = 'General' | 'Important' | 'Emergency' | 'Academic' | 'Event'
export type AnnouncementPlacement = 'bar' | 'homepage' | 'both'
export type UserRole = 'Super Admin' | 'Administrator' | 'Principal' | 'Content Editor' | 'Department Editor'
export type UserStatus = 'active' | 'disabled'

export type NewsCategory =
  | 'Academic'
  | 'Sports'
  | 'Events'
  | 'Achievements'
  | 'Student Life'
  | 'Community'
  | 'Announcements'
  | 'General'

export type EventCategory =
  | 'Academic'
  | 'Examinations'
  | 'Sports'
  | 'PTA'
  | 'Holidays'
  | 'Staff'
  | 'Student activities'
  | 'Graduation'

export type GalleryCategory =
  | 'Academic'
  | 'Sports'
  | 'Graduation'
  | 'Clubs'
  | 'Special Events'
  | 'Campus Life'

export type ResourceCategory =
  | 'Student Handbook'
  | 'School Policies'
  | 'Application Forms'
  | 'Booklists'
  | 'Academic Calendars'
  | 'Examination Timetables'
  | 'Parent Forms'
  | 'Student Forms'
  | 'Newsletters'
  | 'Forms'
  | 'Calendars'
  | 'Parent Resources'
  | 'Other'

export type ContactDepartment =
  | 'General Enquiry'
  | 'Admissions'
  | "Principal's Office"
  | 'Guidance'
  | 'Bursar'
  | 'Examination Centre'
  | 'PTA'

export interface NavLink {
  label: string
  href: string
  children?: { label: string; href: string }[]
}

export interface MediaFile {
  id: string
  url: string
  alt: string
  caption?: string
  name: string
  mimeType: string
  size: number
  kind: 'image' | 'document'
  createdAt: string
}

export interface Announcement {
  id: string
  title: string
  message: string
  type: AnnouncementType
  linkLabel?: string
  linkHref?: string
  active: boolean
  dismissible: boolean
  startsAt?: string
  endsAt?: string
  priority: number
  placement: AnnouncementPlacement
  createdAt: string
  updatedAt: string
}

export interface QuickLink {
  id: string
  title: string
  description: string
  href: string
  icon: string
}

export interface Statistic {
  id: string
  label: string
  value: number
  suffix?: string
  prefix?: string
  icon?: string
  visible: boolean
  order: number
}

export interface NewsArticle {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  category: NewsCategory
  author: string
  image: string
  imageAlt: string
  featuredImage?: MediaFile
  gallery: MediaFile[]
  status: PublishStatus
  isFeatured: boolean
  showOnHomepage: boolean
  featuredPriority: number
  date: string
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export interface SchoolEvent {
  id: string
  slug: string
  title: string
  description: string
  date: string
  endDate?: string
  startTime: string
  endTime?: string
  allDay: boolean
  location: string
  category: EventCategory
  image?: string
  featuredImage?: MediaFile
  contactPerson?: string
  registrationUrl?: string
  featured: boolean
  showOnHomepage: boolean
  status: EventStatus
  createdAt: string
  updatedAt: string
}

export interface StaffMember {
  id: string
  honorific: string
  firstName: string
  lastName: string
  name: string
  role: string
  department: string
  departmentId?: string
  staffType: StaffType
  email?: string
  phoneExtension?: string
  qualifications?: string
  photo: string
  photoMedia?: MediaFile
  bio?: string
  featured?: boolean
  administration?: boolean
  displayOnWebsite: boolean
  displayOrder: number
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export interface AcademicProgramme {
  id: string
  slug: string
  title: string
  summary: string
  description: string
  icon: string
  image?: string
  imageMedia?: MediaFile
  href: string
  subjects: string[]
  requirements?: string
  active: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface Department {
  id: string
  slug: string
  name: string
  shortName?: string
  overview: string
  headOfDepartment: string
  headOfDepartmentId?: string
  subjects: string[]
  programmes: string[]
  achievements: string
  resources: { label: string; href: string }[]
  image: string
  imageMedia?: MediaFile
  email?: string
  teacherIds: string[]
  displayOnWebsite: boolean
  displayOrder: number
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export interface Club {
  id: string
  slug: string
  name: string
  description: string
  coordinator: string
  meeting: string
  meetingDay?: string
  meetingTime?: string
  meetingLocation?: string
  contact?: string
  achievements: string[]
  photos: string[]
  gallery: MediaFile[]
  image: string
  imageMedia?: MediaFile
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface SportFixture {
  id: string
  opponent: string
  competition?: string
  date: string
  time?: string
  venue: string
  result?: string
  score?: string
}

export interface Sport {
  id: string
  slug: string
  name: string
  overview: string
  coach: string
  assistantCoach?: string
  teamCategory?: string
  trainingSchedule?: string
  activeSeason?: string
  teams: string[]
  fixtures: SportFixture[]
  achievements: string[]
  photos: string[]
  gallery: MediaFile[]
  image: string
  imageMedia?: MediaFile
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface House {
  id: string
  name: string
  colour: string
  motto: string
  description: string
}

export interface GalleryItem {
  id: string
  src: string
  alt: string
  caption?: string
  category: GalleryCategory
  album: string
  albumSlug: string
  media?: MediaFile
  order: number
}

export interface GalleryAlbum {
  id: string
  slug: string
  title: string
  description: string
  cover?: MediaFile
  category: GalleryCategory
  eventDate?: string
  status: PublishStatus
  images: GalleryItem[]
  createdAt: string
  updatedAt: string
}

export interface ResourceItem {
  id: string
  name: string
  description?: string
  category: ResourceCategory
  fileType: string
  uploadedAt: string
  size: string
  href: string
  file?: MediaFile
  academicYear?: string
  publishedAt?: string
  status: PublishStatus
  createdAt: string
  updatedAt: string
}

export interface CoreValue {
  title: string
  description: string
}

export interface SocialLink {
  platform: string
  href: string
  enabled: boolean
}

export interface ContactInfo {
  schoolName: string
  addressLines: string[]
  phone: string[]
  email: string[]
  admissionsEmail?: string
  generalEmail?: string
  officeHours: string
  mapEmbedUrl: string
  social: SocialLink[]
}

export interface PrincipalMessage {
  name: string
  title: string
  photo: string
  photoMedia?: MediaFile
  excerpt: string
  messageTitle: string
  content: string
  paragraphs: string[]
  signature: string
  signatureImage?: MediaFile
  updatedAt: string
}

export interface HomepageSection {
  id: string
  label: string
  enabled: boolean
  variant?: string
}

export interface HomepageContent {
  heroEyebrow: string
  heroTitle: string
  heroTagline: string
  heroImage: string
  heroImageMedia?: MediaFile
  primaryButtonLabel: string
  primaryButtonUrl: string
  secondaryButtonLabel: string
  secondaryButtonUrl: string
  welcomeTitle: string
  welcomeBody: string[]
  welcomeImage: string
  welcomeImageMedia?: MediaFile
  welcomeButtonLabel: string
  welcomeButtonUrl: string
  sections: HomepageSection[]
}

export interface BrandingSettings {
  schoolName: string
  motto: string
  mottoTranslation?: string
  established?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  crestUrl?: string
  faviconUrl?: string
  footerLogoUrl?: string
  crestMedia?: MediaFile
  faviconMedia?: MediaFile
  footerLogoMedia?: MediaFile
}

export interface AboutContent {
  overview: string[]
  history: string[]
  historyHtml?: string
  mission: string
  vision: string
  motto: string
  crestExplanation: string[]
  achievements: string[]
  campus: string[]
}

export interface AdmissionsContent {
  intro: string[]
  requirements: string[]
  process: { step: number; title: string; detail: string }[]
  documents: string[]
  transfers: string[]
  deadlines: { label: string; date: string }[]
  faqs: { question: string; answer: string }[]
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  lastLogin?: string
  password: string
  departmentId?: string
}

export interface SiteContent {
  announcements: Announcement[]
  homepage: HomepageContent
  quickLinks: QuickLink[]
  statistics: Statistic[]
  news: NewsArticle[]
  events: SchoolEvent[]
  staff: StaffMember[]
  programmes: AcademicProgramme[]
  departments: Department[]
  clubs: Club[]
  sports: Sport[]
  houses: House[]
  gallery: GalleryItem[]
  albums: GalleryAlbum[]
  resources: ResourceItem[]
  mediaLibrary: MediaFile[]
  values: CoreValue[]
  contact: ContactInfo
  principal: PrincipalMessage
  about: AboutContent
  admissions: AdmissionsContent
  branding: BrandingSettings
  users: AdminUser[]
  activity: { id: string; text: string; at: string }[]
}
