import { useEffect, useState } from 'react'
import { getAccessToken } from '../../shared/api/client'

/** Загрузка защищённого /lobbies/.../media/... как blob URL (Bearer). */
export function useAuthedMediaUrl(apiPath: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!apiPath) {
      setUrl(null)
      return
    }
    // Внешние http(s) — без auth
    if (/^https?:\/\//i.test(apiPath)) {
      setUrl(apiPath)
      return
    }
    let cancelled = false
    let objectUrl: string | null = null
    const token = getAccessToken()
    void (async () => {
      try {
        const res = await fetch(apiPath, {
          headers: {
            Accept: 'image/*,*/*',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: 'no-store',
        })
        if (!res.ok) return
        const blob = await res.blob()
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      } catch {
        if (!cancelled) setUrl(null)
      }
    })()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [apiPath])

  return url
}
