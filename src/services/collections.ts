import type { NewsArticle, StaffMember, Department, SchoolEvent, Announcement, Club, Sport, AcademicProgramme, ResourceItem, GalleryAlbum, MediaFile, HomepageContent, PrincipalMessage, ContactInfo, BrandingSettings, AdminUser, Statistic, UserRole } from '@/types'
import { getContent, updateContent } from '@/services/content'
import { api } from '@/services/api'
import { duplicateRecord, getById, listCollection, removeRecord, touch, upsertRecord } from '@/services/cms'
import { nowIso } from '@/services/normalize'
import { slugify } from '@/utils'

export type WriteResult<T = unknown> = {
  mode: 'published' | 'pending'
  record?: T
  change?: { id: string; status: string; title: string }
  ok?: boolean
}

export function writeMessage(result: WriteResult, published: string) {
  if (result.mode === 'pending') {
    return 'Submitted for principal approval. The public website will not change until this is approved.'
  }
  return published
}

export function conflictText(err: unknown) {
  const detail = (err as { detail?: { message?: string; submittedByName?: string; submittedAt?: string; code?: string } }).detail
  if (detail && typeof detail === 'object' && (detail.code === 'pending_exists' || detail.message)) {
    const when = detail.submittedAt
      ? new Date(detail.submittedAt).toLocaleString('en-JM', { dateStyle: 'medium', timeStyle: 'short' })
      : ''
    return [
      detail.message || 'This content already has a change awaiting principal approval.',
      detail.submittedByName ? `Submitted by: ${detail.submittedByName}` : '',
      when ? `Submitted: ${when}` : '',
      'You must wait for the existing request to be reviewed before submitting another change.',
    ].filter(Boolean).join('\n')
  }
  return err instanceof Error ? err.message : 'Unable to save.'
}

function isNotFound(err: unknown) {
  return typeof err === 'object' && err !== null && 'status' in err && (err as { status?: number }).status === 404
}

async function writeItem<T extends { id: string }>(
  collection: Parameters<typeof upsertRecord>[0],
  item: T,
  resourcePath: string,
  activity: string,
): Promise<WriteResult<T>> {
  let result: WriteResult<T>
  try {
    result = await api<WriteResult<T>>(`${resourcePath}/${item.id}`, { method: 'PUT', body: JSON.stringify(item) })
  } catch (err) {
    if (!isNotFound(err)) throw err
    result = await api<WriteResult<T>>(resourcePath, { method: 'POST', body: JSON.stringify(item) })
  }
  if (result.mode === 'published') {
    const record = { ...item, ...(result.record || {}), id: (result.record as T | undefined)?.id || item.id } as T
    upsertRecord(collection, { ...record, updatedAt: nowIso() } as never, activity)
  }
  return result
}

async function removeItem(collection: Parameters<typeof removeRecord>[0], id: string, resourcePath: string, activity: string) {
  const result = await api<WriteResult>(`${resourcePath}/${id}`, { method: 'DELETE' })
  if (result.mode === 'published') removeRecord(collection, id, activity)
  return result
}

export const newsService = {
  list: () => listCollection('news'),
  get: (id: string) => getById('news', id) as NewsArticle | undefined,
  getBySlug: (slug: string) => getContent().news.find((n) => n.slug === slug),
  save: (article: NewsArticle, activity?: string) =>
    writeItem('news', article, '/admin/news', activity ?? `News updated: ${article.title}`),
  remove: (id: string) => {
    const item = newsService.get(id)
    return removeItem('news', id, '/admin/news', `News deleted: ${item?.title ?? id}`)
  },
  duplicate: (id: string) => {
    const original = newsService.get(id)
    if (!original) return Promise.resolve(undefined)
    const copy: NewsArticle = {
      ...original,
      id: crypto.randomUUID(),
      title: `${original.title} (copy)`,
      slug: `${original.slug}-copy`,
      status: 'draft',
      isFeatured: false,
      showOnHomepage: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    return newsService.save(copy, `News duplicated: ${original.title}`)
  },
}

export const staffService = {
  list: () => listCollection('staff'),
  get: (id: string) => getById('staff', id) as StaffMember | undefined,
  save: (person: StaffMember) => writeItem('staff', person, '/admin/staff', `Staff saved: ${person.name}`),
  remove: (id: string) => {
    const item = staffService.get(id)
    return removeItem('staff', id, '/admin/staff', `Staff removed: ${item?.name ?? id}`)
  },
}

export const departmentService = {
  list: () => listCollection('departments'),
  get: (id: string) => getById('departments', id) as Department | undefined,
  save: (dept: Department) => upsertRecord('departments', touch(dept), `Department saved: ${dept.name}`),
  remove: (id: string) => {
    const item = departmentService.get(id)
    removeRecord('departments', id, `Department deleted: ${item?.name ?? id}`)
  },
}

export const eventService = {
  list: () => listCollection('events'),
  get: (id: string) => getById('events', id) as SchoolEvent | undefined,
  getBySlug: (slug: string) => getContent().events.find((e) => e.slug === slug),
  save: (event: SchoolEvent) => writeItem('events', event, '/admin/events', `Event saved: ${event.title}`),
  remove: (id: string) => {
    const item = eventService.get(id)
    return removeItem('events', id, '/admin/events', `Event deleted: ${item?.title ?? id}`)
  },
  duplicate: (id: string) =>
    duplicateRecord('events', id, (copy) => ({
      ...copy,
      id: crypto.randomUUID(),
      title: `${copy.title} (copy)`,
      slug: `${copy.slug}-copy`,
      status: 'draft',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }), 'Event duplicated'),
}

export const announcementService = {
  list: () => listCollection('announcements'),
  get: (id: string) => getById('announcements', id) as Announcement | undefined,
  save: (item: Announcement) => upsertRecord('announcements', touch(item), `Announcement saved: ${item.title}`),
  remove: (id: string) => removeRecord('announcements', id, 'Announcement deleted'),
}

export const clubService = {
  list: () => listCollection('clubs'),
  get: (id: string) => getById('clubs', id) as Club | undefined,
  save: (item: Club) => upsertRecord('clubs', touch(item), `Club saved: ${item.name}`),
  remove: (id: string) => removeRecord('clubs', id, 'Club deleted'),
}

export const sportService = {
  list: () => listCollection('sports'),
  get: (id: string) => getById('sports', id) as Sport | undefined,
  save: (item: Sport) => upsertRecord('sports', touch(item), `Sport saved: ${item.name}`),
  remove: (id: string) => removeRecord('sports', id, 'Sport deleted'),
}

export const programmeService = {
  list: () => listCollection('programmes'),
  get: (id: string) => getById('programmes', id) as AcademicProgramme | undefined,
  save: (item: AcademicProgramme) => upsertRecord('programmes', touch(item), `Programme saved: ${item.title}`),
  remove: (id: string) => removeRecord('programmes', id, 'Programme deleted'),
}

export const documentService = {
  list: () => listCollection('resources'),
  get: (id: string) => getById('resources', id) as ResourceItem | undefined,
  save: (item: ResourceItem) => writeItem('resources', item, '/admin/documents', `Document saved: ${item.name}`),
  remove: (id: string) => removeItem('resources', id, '/admin/documents', 'Document deleted'),
}

export const albumService = {
  list: () => listCollection('albums'),
  get: (id: string) => getById('albums', id) as GalleryAlbum | undefined,
  save: async (album: GalleryAlbum) => {
    const result = await writeItem('albums', album, '/admin/galleries', `Album saved: ${album.title}`)
    if (result.mode === 'published') {
      updateContent({ gallery: getContent().albums.flatMap((a) => a.images) }, 'Gallery synced')
    }
    return result
  },
  remove: async (id: string) => {
    const result = await removeItem('albums', id, '/admin/galleries', 'Album deleted')
    if (result.mode === 'published') {
      updateContent({ gallery: getContent().albums.flatMap((a) => a.images) }, 'Gallery synced')
    }
    return result
  },
}

export const mediaLibraryService = {
  list: () => getContent().mediaLibrary,
  add: (file: MediaFile) => {
    const library = [file, ...getContent().mediaLibrary.filter((m) => m.id !== file.id)]
    updateContent({ mediaLibrary: library }, `Media uploaded: ${file.name}`)
    return file
  },
  remove: (id: string) => {
    updateContent({ mediaLibrary: getContent().mediaLibrary.filter((m) => m.id !== id) }, 'Media deleted')
  },
}

export const homepageService = {
  get: () => getContent().homepage,
  save: async (homepage: HomepageContent, statistics?: Statistic[]) => {
    const body: Record<string, unknown> = { homepage }
    if (statistics) body.statistics = statistics
    const result = await api<WriteResult>('/admin/bundle', { method: 'PUT', body: JSON.stringify(body) })
    if (result.mode === 'published') {
      updateContent(statistics ? { homepage, statistics } : { homepage }, 'Homepage updated')
    }
    return result
  },
  saveStats: async (statistics: Statistic[]) => {
    const result = await api<WriteResult>('/admin/bundle', { method: 'PUT', body: JSON.stringify({ statistics }) })
    if (result.mode === 'published') updateContent({ statistics }, 'Statistics updated')
    return result
  },
  saveSections: async (sections: { id?: string; section_type: string; variant: string; enabled: boolean; position: number }[]) => {
    return api<WriteResult>('/admin/homepage-sections', { method: 'PUT', body: JSON.stringify(sections) })
  },
}

export const principalService = {
  get: () => getContent().principal,
  save: async (principal: PrincipalMessage) => {
    const next = { ...principal, updatedAt: nowIso() }
    const result = await api<WriteResult>('/admin/bundle', { method: 'PUT', body: JSON.stringify({ principal: next }) })
    if (result.mode === 'published') updateContent({ principal: next }, "Principal's message updated")
    return result
  },
}

export const settingsService = {
  saveContact: async (contact: ContactInfo) => {
    const result = await api<WriteResult>('/admin/settings', { method: 'PUT', body: JSON.stringify({ contact }) })
    if (result.mode === 'published') updateContent({ contact }, 'Contact details updated')
    return result
  },
  saveBranding: async (branding: BrandingSettings) => {
    const result = await api<WriteResult>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({
        schoolName: branding.schoolName,
        motto: branding.motto,
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        accentColor: branding.accentColor,
        logoUrl: branding.crestUrl || null,
        faviconUrl: branding.faviconUrl || null,
        branding,
      }),
    })
    if (result.mode === 'published') updateContent({ branding }, 'Branding updated')
    return result
  },
  saveTheme: async (theme: {
    theme: string
    headingFont: string
    bodyFont: string
    heroStyle: string
    navbarStyle: string
    newsLayout: string
    eventsLayout: string
    footerStyle: string
  }) => {
    return api<WriteResult>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ ...theme, applyPreset: false }),
    })
  },
}

export function roleLabel(role: string): UserRole {
  const value = role.toLowerCase().replace(/[\s-]+/g, '_')
  if (value === 'principal') return 'Principal'
  if (value === 'school_admin' || value === 'administrator' || value === 'admin') return 'Administrator'
  if (value === 'super_admin') return 'Super Admin'
  return 'Content Editor'
}

type ApiUser = { id: string; name: string; email: string; role: string; status?: string; is_active?: boolean }

function asAdminUser(row: ApiUser): AdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: roleLabel(row.role),
    status: row.status === 'disabled' || row.is_active === false ? 'disabled' : 'active',
    password: '',
  }
}

export const usersService = {
  list: async () => {
    const rows = await api<ApiUser[]>('/admin/users')
    return rows.map(asAdminUser)
  },
  save: async (user: AdminUser, isNew: boolean) => {
    const body: Record<string, unknown> = {
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      is_active: user.status === 'active',
    }
    if (user.password.trim()) body.password = user.password
    const row = isNew
      ? await api<ApiUser>('/admin/users', { method: 'POST', body: JSON.stringify(body) })
      : await api<ApiUser>(`/admin/users/${user.id}`, { method: 'PUT', body: JSON.stringify(body) })
    return asAdminUser(row)
  },
}

export function uniqueSlug(base: string, existing: string[], currentId?: string) {
  const root = slugify(base) || 'item'
  let slug = root
  let i = 2
  const taken = (value: string) =>
    getContent().news.some((n) => n.slug === value && n.id !== currentId) ||
    existing.includes(value)
  while (taken(slug)) {
    slug = `${root}-${i}`
    i += 1
  }
  return slug
}
