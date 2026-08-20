import type { SiteContent } from '@/types'
import { getContent, updateContent } from '@/services/content'
import { nowIso } from '@/services/normalize'

type CollectionKey = {
  [K in keyof SiteContent]: SiteContent[K] extends Array<infer Item>
    ? Item extends { id: string }
      ? K
      : never
    : never
}[keyof SiteContent]

export function listCollection<K extends CollectionKey>(key: K): SiteContent[K] {
  return getContent()[key]
}

export function getById<K extends CollectionKey>(key: K, id: string) {
  const items = getContent()[key] as Array<{ id: string }>
  return items.find((item) => item.id === id)
}

export function upsertRecord<K extends CollectionKey>(
  key: K,
  record: SiteContent[K][number],
  activity: string,
) {
  const items = [...(getContent()[key] as Array<{ id: string }>)]
  const index = items.findIndex((item) => item.id === record.id)
  if (index >= 0) items[index] = record as { id: string }
  else items.unshift(record as { id: string })
  updateContent({ [key]: items } as Partial<SiteContent>, activity)
  return record
}

export function removeRecord<K extends CollectionKey>(key: K, id: string, activity: string) {
  const items = (getContent()[key] as Array<{ id: string }>).filter((item) => item.id !== id)
  updateContent({ [key]: items } as Partial<SiteContent>, activity)
}

export function duplicateRecord<K extends CollectionKey>(
  key: K,
  id: string,
  mutate: (copy: SiteContent[K][number]) => SiteContent[K][number],
  activity: string,
) {
  const original = getById(key, id) as SiteContent[K][number] | undefined
  if (!original) return undefined
  const copy = mutate(structuredClone(original))
  return upsertRecord(key, copy, activity)
}

export function touch<T extends { updatedAt: string }>(record: T): T {
  return { ...record, updatedAt: nowIso() }
}
