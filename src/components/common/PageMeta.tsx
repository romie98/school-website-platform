import { useEffect } from 'react'
import { useTenant } from '@/contexts/TenantContext'

interface PageMetaProps {
  title: string
  description: string
  path?: string
}

export function PageMeta({ title, description, path = '/' }: PageMetaProps) {
  const { school } = useTenant()
  const schoolName = school?.name || 'School'
  useEffect(() => {
    const full = path === '/' ? `${schoolName} | ${title}` : `${title} | ${schoolName}`
    document.title = full

    const set = (selector: string, attr: string, value: string) => {
      let el = document.querySelector(selector)
      if (!el) {
        el = document.createElement('meta')
        if (selector.startsWith('meta[name')) {
          el.setAttribute('name', selector.match(/name="([^"]+)"/)?.[1] ?? '')
        } else {
          el.setAttribute('property', selector.match(/property="([^"]+)"/)?.[1] ?? '')
        }
        document.head.appendChild(el)
      }
      el.setAttribute(attr, value)
    }

    set('meta[name="description"]', 'content', description)
    set('meta[property="og:title"]', 'content', full)
    set('meta[property="og:description"]', 'content', description)
    set('meta[property="og:type"]', 'content', 'website')
    set('meta[name="twitter:card"]', 'content', 'summary_large_image')

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = path
  }, [title, description, path, schoolName])

  return null
}
