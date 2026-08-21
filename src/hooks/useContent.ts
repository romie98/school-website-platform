import { useCallback, useEffect, useState } from 'react'
import { getContent } from '@/services/content'
import { useTenant } from '@/contexts/TenantContext'
import type { SiteContent } from '@/types'

export function useContent() {
  const { bundle } = useTenant()

  const [content, setContent] = useState<SiteContent>(() => getContent())

  const refresh = useCallback(() => {
    setContent(getContent())
  }, [])

  useEffect(() => {
    if (bundle) {
      refresh()
    }
  }, [bundle, refresh])

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
