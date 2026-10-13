import { useEffect } from 'react'
import { getMe } from '../api/auth'
import { getAccessToken } from '../api/client'
import { applyAccountAppearance, clearCachedAppearance, normalizeAppearance } from './accountAppearance'

/** Keeps html[data-theme] / data-ability-colors in sync with the logged-in user. */
export function AccountAppearanceSync() {
  useEffect(() => {
    if (!getAccessToken()) {
      clearCachedAppearance()
      return
    }
    let active = true
    void getMe()
      .then((user) => {
        if (!active) return
        applyAccountAppearance(normalizeAppearance(user))
      })
      .catch(() => {
        /* keep cache; auth routes handle 401 */
      })
    return () => {
      active = false
    }
  }, [])

  return null
}
