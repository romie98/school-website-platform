import { useMemo, useRef, useState } from 'react'
import { ImagePlus, Trash2, FolderOpen, Loader2 } from 'lucide-react'
import type { MediaFile } from '@/types'
import { mediaLibraryService } from '@/services/collections'
import { storeMediaFile, validateImageFile } from '@/services/mediaService'
import { useContent } from '@/hooks/useContent'
import { api, getToken } from '@/services/api'
import { useToast } from '@/components/admin/Toast'
import { mediaUrl } from '@/services/normalize'

interface ImageUploaderProps {
  value?: MediaFile | string | null
  alt?: string
  onChange: (file: MediaFile | undefined, displayUrl: string) => void
  onAltChange?: (alt: string) => void
  label?: string
  folder?: 'uploads' | 'logos' | 'news' | 'events' | 'gallery'
}

export function ImageUploader({ value, alt, onChange, onAltChange, label = 'Image', folder = 'uploads' }: ImageUploaderProps) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [drag, setDrag] = useState(false)
  const preview = mediaUrl(value)

  const handleFiles = async (files: FileList | File[]) => {
    const file = files[0]
    if (!file) return
    const error = validateImageFile(file)
    if (error) {
      toast.push(error, 'error')
      return
    }
    setBusy(true)
    try {
      const stored = await storeMediaFile(file, { alt: alt || file.name })
      mediaLibraryService.add(stored)
      if (getToken()) {
        const body = new FormData()
        body.append('file', file)
        const remote = await api<{ url: string; id: string; name: string }>(`/admin/media?folder=${folder}`, { method: 'POST', body })
        onChange({ ...stored, url: remote.url, id: remote.id }, remote.url)
      } else {
        onChange(stored, stored.url)
      }
      toast.push('Image uploaded successfully.')
    } catch (err) {
      const status = (err as Error & { status?: number }).status
      toast.push(status && status >= 500 ? 'Unable to upload image. Please try again.' : err instanceof Error ? err.message : 'Unable to upload image. Please try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-brand">{label}</p>
      {preview ? (
        <div className="overflow-hidden rounded-md border border-brand/15 bg-white">
          <img src={preview} alt={alt || ''} className="h-48 w-full object-cover" />
          <div className="flex flex-wrap gap-2 p-3">
            <button type="button" className="rounded-md border border-brand/20 px-3 py-1.5 text-sm" onClick={() => inputRef.current?.click()}>Replace image</button>
            <button type="button" className="rounded-md border border-brand/20 px-3 py-1.5 text-sm" onClick={() => setLibraryOpen(true)}>Media library</button>
            <button type="button" className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-red-700" onClick={() => onChange(undefined, '')}>
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); void handleFiles(e.dataTransfer.files) }}
          className={`flex flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-10 text-center ${drag ? 'border-gold bg-gold/10' : 'border-brand/20 bg-white'}`}
        >
          {busy ? <Loader2 className="h-8 w-8 animate-spin text-brand" /> : <ImagePlus className="h-8 w-8 text-gold-dark" />}
          <p className="mt-2 text-sm text-muted">Drag and drop an image, or browse files. JPG, PNG or WebP, up to 8 MB.</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white" onClick={() => inputRef.current?.click()}>Browse files</button>
            <button type="button" className="inline-flex items-center gap-1 rounded-md border border-brand/20 px-3 py-1.5 text-sm" onClick={() => setLibraryOpen(true)}>
              <FolderOpen className="h-4 w-4" /> Choose from library
            </button>
          </div>
        </div>
      )}
      {onAltChange && (
        <label className="mt-3 block text-sm font-medium text-brand">
          Image alt text
          <input className="mt-1 w-full rounded-md border border-brand/20 px-3 py-2 text-sm" value={alt ?? ''} onChange={(e) => onAltChange(e.target.value)} />
        </label>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { if (e.target.files) void handleFiles(e.target.files); e.target.value = '' }} />
      {libraryOpen && <MediaLibraryModal onClose={() => setLibraryOpen(false)} onSelect={(file) => { onChange(file, file.url); setLibraryOpen(false) }} />}
    </div>
  )
}

export function MediaLibraryModal({
  onClose,
  onSelect,
  kind = 'image',
}: {
  onClose: () => void
  onSelect: (file: MediaFile) => void
  kind?: MediaFile['kind'] | 'all'
}) {
  const { mediaLibrary } = useContent()
  const [query, setQuery] = useState('')
  const items = useMemo(
    () => mediaLibrary.filter((m) => (kind === 'all' || m.kind === kind) && m.name.toLowerCase().includes(query.toLowerCase())),
    [mediaLibrary, kind, query],
  )
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-brand-dark/70" aria-label="Close" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-brand">Media library</h2>
          <button type="button" onClick={onClose} className="text-sm">Close</button>
        </div>
        <input className="mb-4 w-full rounded-md border border-brand/20 px-3 py-2 text-sm" placeholder="Search media" value={query} onChange={(e) => setQuery(e.target.value)} />
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No files in the library yet. Upload an image to add it here.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => (
              <button key={item.id} type="button" className="overflow-hidden rounded-md border border-brand/10 text-left hover:border-gold" onClick={() => onSelect(item)}>
                {item.kind === 'image' ? <img src={mediaUrl(item)} alt={item.alt} className="h-24 w-full object-cover" /> : <div className="flex h-24 items-center justify-center bg-cream text-xs">{item.mimeType}</div>}
                <p className="truncate px-2 py-1 text-xs">{item.name}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
