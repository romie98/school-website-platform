import { seed } from '@/data/seed'
import type { SiteContent } from '@/types'
import { upgradeSite } from '@/services/normalize'
import { hydrateMedia, persistableMedia } from '@/services/mediaService'
import { api, clearSession, currentSessionUser, getToken, setSession } from '@/services/api'

const AUTH_KEY = 'bahs-admin-auth'
const AUTH_USER_KEY = 'bahs-admin-user'

function canUseStorage() {
  return typeof window !== 'undefined'
}

function persistMediaTree(content: SiteContent): Promise<SiteContent> {
  const walk = async (file?: SiteContent['mediaLibrary'][number]) => (file ? persistableMedia(file) : file)
  return Promise.all([
    Promise.all(content.news.map(async (n) => ({
      ...n,
      featuredImage: n.featuredImage ? await walk(n.featuredImage) : undefined,
      gallery: await Promise.all(n.gallery.map((g) => persistableMedia(g))),
      image: n.featuredImage ? `idb:${n.featuredImage.id}` === n.image || n.image.startsWith('blob:') ? n.featuredImage.url.startsWith('idb:') ? n.featuredImage.url : n.image.startsWith('blob:') ? `idb:${n.featuredImage.id}` : n.image : n.image : n.image,
    }))),
  ]).then(async () => {
    const next = structuredClone(content)
    const persist = async (file?: typeof next.mediaLibrary[number]) => (file ? persistableMedia(file) : undefined)
    next.news = await Promise.all(content.news.map(async (n) => ({
      ...n,
      featuredImage: await persist(n.featuredImage),
      gallery: await Promise.all(n.gallery.map(persistableMedia)),
      image: n.featuredImage ? (n.image.startsWith('blob:') ? `idb:${n.featuredImage.id}` : n.image) : n.image,
    })))
    next.events = await Promise.all(content.events.map(async (e) => ({
      ...e,
      featuredImage: await persist(e.featuredImage),
      image: e.featuredImage && e.image?.startsWith('blob:') ? `idb:${e.featuredImage.id}` : e.image,
    })))
    next.staff = await Promise.all(content.staff.map(async (s) => ({
      ...s,
      photoMedia: await persist(s.photoMedia),
      photo: s.photoMedia && s.photo.startsWith('blob:') ? `idb:${s.photoMedia.id}` : s.photo,
    })))
    next.departments = await Promise.all(content.departments.map(async (d) => ({
      ...d,
      imageMedia: await persist(d.imageMedia),
      image: d.imageMedia && d.image.startsWith('blob:') ? `idb:${d.imageMedia.id}` : d.image,
    })))
    next.programmes = await Promise.all(content.programmes.map(async (p) => ({
      ...p,
      imageMedia: await persist(p.imageMedia),
    })))
    next.clubs = await Promise.all(content.clubs.map(async (c) => ({
      ...c,
      imageMedia: await persist(c.imageMedia),
      gallery: await Promise.all(c.gallery.map(persistableMedia)),
      image: c.imageMedia && c.image.startsWith('blob:') ? `idb:${c.imageMedia.id}` : c.image,
    })))
    next.sports = await Promise.all(content.sports.map(async (s) => ({
      ...s,
      imageMedia: await persist(s.imageMedia),
      gallery: await Promise.all(s.gallery.map(persistableMedia)),
      image: s.imageMedia && s.image.startsWith('blob:') ? `idb:${s.imageMedia.id}` : s.image,
    })))
    next.albums = await Promise.all(content.albums.map(async (a) => ({
      ...a,
      cover: await persist(a.cover),
      images: await Promise.all(a.images.map(async (img) => ({
        ...img,
        media: await persist(img.media),
        src: img.media && img.src.startsWith('blob:') ? `idb:${img.media.id}` : img.src,
      }))),
    })))
    next.gallery = await Promise.all(content.gallery.map(async (g) => ({
      ...g,
      media: await persist(g.media),
      src: g.media && g.src.startsWith('blob:') ? `idb:${g.media.id}` : g.src,
    })))
    next.resources = await Promise.all(content.resources.map(async (r) => ({
      ...r,
      file: await persist(r.file),
      href: r.file && r.href.startsWith('blob:') ? `idb:${r.file.id}` : r.href,
    })))
    next.mediaLibrary = await Promise.all(content.mediaLibrary.map(persistableMedia))
    next.principal = {
      ...content.principal,
      photoMedia: await persist(content.principal.photoMedia),
      signatureImage: await persist(content.principal.signatureImage),
      photo: content.principal.photoMedia && content.principal.photo.startsWith('blob:')
        ? `idb:${content.principal.photoMedia.id}`
        : content.principal.photo,
    }
    next.homepage = {
      ...content.homepage,
      heroImageMedia: await persist(content.homepage.heroImageMedia),
      welcomeImageMedia: await persist(content.homepage.welcomeImageMedia),
      heroImage: content.homepage.heroImageMedia && content.homepage.heroImage.startsWith('blob:')
        ? `idb:${content.homepage.heroImageMedia.id}`
        : content.homepage.heroImage,
      welcomeImage: content.homepage.welcomeImageMedia && content.homepage.welcomeImage.startsWith('blob:')
        ? `idb:${content.homepage.welcomeImageMedia.id}`
        : content.homepage.welcomeImage,
    }
    next.branding = {
      ...content.branding,
      crestMedia: await persist(content.branding.crestMedia),
      faviconMedia: await persist(content.branding.faviconMedia),
      footerLogoMedia: await persist(content.branding.footerLogoMedia),
    }
    next.contact = content.contact
    return next
  })
}

async function hydrateTree(content: SiteContent): Promise<SiteContent> {
  const hydrate = hydrateMedia
  const next = structuredClone(content)
  next.news = await Promise.all(content.news.map(async (n) => {
    const featuredImage = await hydrate(n.featuredImage)
    const gallery = (await Promise.all(n.gallery.map((g) => hydrate(g)))).filter(Boolean) as typeof n.gallery
    return { ...n, featuredImage, gallery, image: featuredImage?.url || n.image }
  }))
  next.events = await Promise.all(content.events.map(async (e) => {
    const featuredImage = await hydrate(e.featuredImage)
    return { ...e, featuredImage, image: featuredImage?.url || e.image }
  }))
  next.staff = await Promise.all(content.staff.map(async (s) => {
    const photoMedia = await hydrate(s.photoMedia)
    return { ...s, photoMedia, photo: photoMedia?.url || s.photo }
  }))
  next.departments = await Promise.all(content.departments.map(async (d) => {
    const imageMedia = await hydrate(d.imageMedia)
    return { ...d, imageMedia, image: imageMedia?.url || d.image }
  }))
  next.clubs = await Promise.all(content.clubs.map(async (c) => {
    const imageMedia = await hydrate(c.imageMedia)
    const gallery = (await Promise.all(c.gallery.map((g) => hydrate(g)))).filter(Boolean) as typeof c.gallery
    return { ...c, imageMedia, gallery, image: imageMedia?.url || c.image }
  }))
  next.sports = await Promise.all(content.sports.map(async (s) => {
    const imageMedia = await hydrate(s.imageMedia)
    const gallery = (await Promise.all(s.gallery.map((g) => hydrate(g)))).filter(Boolean) as typeof s.gallery
    return { ...s, imageMedia, gallery, image: imageMedia?.url || s.image }
  }))
  next.albums = await Promise.all(content.albums.map(async (a) => ({
    ...a,
    cover: await hydrate(a.cover),
    images: await Promise.all(a.images.map(async (img) => {
      const media = await hydrate(img.media)
      return { ...img, media, src: media?.url || img.src }
    })),
  })))
  next.gallery = await Promise.all(content.gallery.map(async (g) => {
    const media = await hydrate(g.media)
    return { ...g, media, src: media?.url || g.src }
  }))
  next.resources = await Promise.all(content.resources.map(async (r) => {
    const file = await hydrate(r.file)
    return { ...r, file, href: file?.url || r.href }
  }))
  next.mediaLibrary = (await Promise.all(content.mediaLibrary.map((m) => hydrate(m)))).filter(Boolean) as typeof content.mediaLibrary
  const principalPhoto = await hydrate(content.principal.photoMedia)
  next.principal = {
    ...content.principal,
    photoMedia: principalPhoto,
    signatureImage: await hydrate(content.principal.signatureImage),
    photo: principalPhoto?.url || content.principal.photo,
  }
  const hero = await hydrate(content.homepage.heroImageMedia)
  const welcome = await hydrate(content.homepage.welcomeImageMedia)
  next.homepage = {
    ...content.homepage,
    heroImageMedia: hero,
    welcomeImageMedia: welcome,
    heroImage: hero?.url || content.homepage.heroImage,
    welcomeImage: welcome?.url || content.homepage.welcomeImage,
  }
  next.branding = {
    ...content.branding,
    crestMedia: await hydrate(content.branding.crestMedia),
    faviconMedia: await hydrate(content.branding.faviconMedia),
    footerLogoMedia: await hydrate(content.branding.footerLogoMedia),
  }
  return next
}

let memory: SiteContent | null = null
let hydratePromise: Promise<SiteContent> | null = null

function storageKey() {
  const schoolId = currentSessionUser()?.school_id
  return schoolId ? `bahs-cms-v2:${schoolId}` : 'bahs-cms-v2'
}

function emptySite(): SiteContent {
  return upgradeSite({})
}

export function getContent(): SiteContent {
  if (memory) return memory
  if (!canUseStorage()) return currentSessionUser()?.school_id ? emptySite() : seed
  const raw = localStorage.getItem(storageKey())
  if (!raw) {
    memory = currentSessionUser()?.school_id ? emptySite() : seed
    return memory
  }
  try {
    memory = upgradeSite(JSON.parse(raw) as Partial<SiteContent>)
    return memory
  } catch {
    memory = currentSessionUser()?.school_id ? emptySite() : seed
    return memory
  }
}

export function clearContentMemory() {
  memory = null
  hydratePromise = null
}

export function hydrateFromRemote(content: SiteContent, options?: { persist?: boolean }) {
  memory = upgradeSite(content)
  window.dispatchEvent(new CustomEvent('cms-update'))
  const onAdmin =
    window.location.pathname.startsWith('/admin') && !window.location.pathname.startsWith('/admin/login')
  if (options?.persist !== false && onAdmin && currentSessionUser()?.school_id) {
    void saveContent(memory)
  }
}

export async function hydrateContent() {
  if (hydratePromise) return hydratePromise
  hydratePromise = hydrateTree(getContent()).then((next) => {
    memory = next
    window.dispatchEvent(new CustomEvent('cms-update'))
    return next
  })
  return hydratePromise
}

export async function saveContent(next: SiteContent) {
  memory = next
  const persistable = await persistMediaTree(next)
  localStorage.setItem(storageKey(), JSON.stringify(persistable))
  window.dispatchEvent(new CustomEvent('cms-update', { detail: new Date().toISOString() }))
}

export function updateContent(patch: Partial<SiteContent>, activity?: string) {
  const current = getContent()
  const next: SiteContent = {
    ...current,
    ...patch,
    activity: activity
      ? [{ id: crypto.randomUUID(), text: activity, at: new Date().toISOString() }, ...current.activity].slice(0, 40)
      : current.activity,
  }
  memory = next
  void saveContent(next)
  return next
}

export function resetContent() {
  localStorage.removeItem(storageKey())
  memory = currentSessionUser()?.school_id ? emptySite() : seed
  window.dispatchEvent(new CustomEvent('cms-update'))
}

export function isAdminAuthenticated() {
  return Boolean(getToken() && currentSessionUser())
}

export async function loginAdmin(username: string, password: string) {
  const data = await api<{ access_token: string; user: { id: string; role: string; school_id: string | null; school_slug?: string | null; name: string; email: string } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setSession(data.access_token, data.user)
  sessionStorage.setItem(AUTH_KEY, '1')
  sessionStorage.setItem(AUTH_USER_KEY, data.user.id)
  clearContentMemory()
  return true
}

export function currentAdminUser() {
  const session = currentSessionUser()
  if (session) {
    return {
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role === 'super_admin' ? 'Super Admin' : session.role === 'principal' ? 'Principal' : session.role === 'school_admin' ? 'Administrator' : 'Content Editor',
      status: 'active' as const,
      password: '',
    }
  }
  const id = sessionStorage.getItem(AUTH_USER_KEY)
  return getContent().users.find((u) => u.id === id) ?? getContent().users[0]
}

export function logoutAdmin() {
  clearSession()
  sessionStorage.removeItem(AUTH_KEY)
  sessionStorage.removeItem(AUTH_USER_KEY)
  clearContentMemory()
}

export function logActivity(text: string) {
  updateContent({}, text)
}
