import { useCallback, useEffect, useState } from 'react'
import { getContent } from '@/services/content'
import type { SiteContent } from '@/types'

export function useContent() {
  const [content, setContent] = useState<SiteContent>(() => getContent())

  const refresh = useCallback(() => {
    setContent(getContent())
  }, [])

  useEffect(() => {
    const onUpdate = () => refresh()
    window.addEventListener('cms-update', onUpdate)
    window.addEventListener('storage', onUpdate)
    return () => {
      window.removeEventListener('cms-update', onUpdate)
      window.removeEventListener('storage', onUpdate)
    }
  }, [refresh])

  return content
}
