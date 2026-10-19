import { useEffect } from 'react'
import { getMe } from '../api/auth'
import { getAccessToken } from '../api/client'
import {
  applyAccountAppearance,
  clearCachedAppearance,
  normalizeAppearance,
  readCachedAppearance,
} from './accountAppearance'

function userHasAppearanceFields(user: object): boolean {
  return (
    Object.prototype.hasOwnProperty.call(user, 'theme_id') ||
    Object.prototype.hasOwnProperty.call(user, 'ability_colors')
  )
}

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
        // Thin deploys used to ship UserResponse without theme fields. Pydantic then
        // omitted them; normalizeAppearance fell back to Листва and wiped localStorage.
        if (!userHasAppearanceFields(user)) {
          applyAccountAppearance(readCachedAppearance())
          return
        }
        applyAccountAppearance(normalizeAppearance(user))
      })
      .catch(() => {
        /* keep cache; auth routes handle 401 */
        if (active) applyAccountAppearance(readCachedAppearance())
      })
    return () => {
      active = false
    }
  }, [])

  return null
}
