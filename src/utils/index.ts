export function formatDate(iso: string, options?: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString('en-JM', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  })
}

export function formatShortDate(iso: string) {
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString('en-JM', { day: '2-digit' }),
    month: d.toLocaleDateString('en-JM', { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString('en-JM', { weekday: 'short' }),
    year: d.getFullYear(),
  }
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function paginate<T>(items: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage))
  const current = Math.min(Math.max(1, page), totalPages)
  const start = (current - 1) * perPage
  return {
    items: items.slice(start, start + perPage),
    page: current,
    totalPages,
    total: items.length,
  }
}

export const newsCategories = [
  'Academic',
  'Sports',
  'Events',
  'Achievements',
  'Student Life',
  'Community',
  'Announcements',
] as const

export const eventCategories = [
  'Academic',
  'Examinations',
  'Sports',
  'PTA',
  'Holidays',
  'Staff',
  'Student activities',
  'Graduation',
] as const
