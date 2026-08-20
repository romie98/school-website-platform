import type { MediaFile } from '@/types'

const DB_NAME = 'bahs-media'
const STORE = 'files'
const MAX_BYTES = 8 * 1024 * 1024
const MAX_WIDTH = 1600

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(id: string, blob: Blob) {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function idbGet(id: string): Promise<Blob | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result as Blob | undefined)
    req.onerror = () => reject(req.error)
  })
}

async function idbDelete(id: string) {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function readFile(file: File) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

export async function compressImage(file: File, maxWidth = MAX_WIDTH, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
  return blob ?? file
}

export function validateImageFile(file: File) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowed.includes(file.type) && !/\.(jpe?g|png|webp|svg)$/i.test(file.name)) {
    return 'Please upload a JPG, PNG, WebP or SVG image.'
  }
  if (file.size > MAX_BYTES) return 'Images must be 8 MB or smaller.'
  return null
}

export function validateDocumentFile(file: File) {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]
  if (!allowed.includes(file.type) && !/\.(pdf|docx?|xlsx?|pptx?)$/i.test(file.name)) {
    return 'Please upload a PDF, Word, Excel or PowerPoint file.'
  }
  if (file.size > 15 * 1024 * 1024) return 'Documents must be 15 MB or smaller.'
  return null
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function storeMediaFile(file: File, options?: { alt?: string; caption?: string; kind?: MediaFile['kind'] }): Promise<MediaFile> {
  const kind = options?.kind ?? (file.type.startsWith('image/') ? 'image' : 'document')
  const error = kind === 'image' ? validateImageFile(file) : validateDocumentFile(file)
  if (error) throw new Error(error)
  const blob = kind === 'image' ? await compressImage(file) : new Blob([await readFile(file)], { type: file.type })
  const id = crypto.randomUUID()
  await idbPut(id, blob)
  const objectUrl = URL.createObjectURL(blob)
  return {
    id,
    url: objectUrl,
    alt: options?.alt || file.name,
    caption: options?.caption,
    name: file.name,
    mimeType: blob.type || file.type,
    size: blob.size,
    kind,
    createdAt: new Date().toISOString(),
  }
}

export async function resolveMediaUrl(file?: MediaFile | string | null): Promise<string> {
  if (!file) return ''
  if (typeof file === 'string') {
    if (file.startsWith('idb:')) {
      const blob = await idbGet(file.slice(4))
      return blob ? URL.createObjectURL(blob) : ''
    }
    return file
  }
  if (file.url.startsWith('blob:') || file.url.startsWith('http') || file.url.startsWith('data:')) return file.url
  const blob = await idbGet(file.id)
  return blob ? URL.createObjectURL(blob) : file.url
}

export async function persistableMedia(file: MediaFile): Promise<MediaFile> {
  return { ...file, url: file.url.startsWith('blob:') ? `idb:${file.id}` : file.url }
}

export async function hydrateMedia(file?: MediaFile): Promise<MediaFile | undefined> {
  if (!file) return undefined
  if (file.url.startsWith('idb:')) {
    const blob = await idbGet(file.url.slice(4) || file.id)
    if (blob) return { ...file, url: URL.createObjectURL(blob) }
  }
  if (!file.url.startsWith('http') && !file.url.startsWith('blob:') && !file.url.startsWith('data:')) {
    const blob = await idbGet(file.id)
    if (blob) return { ...file, url: URL.createObjectURL(blob) }
  }
  return file
}

export async function deleteStoredMedia(id: string) {
  await idbDelete(id)
}

export { formatSize }
