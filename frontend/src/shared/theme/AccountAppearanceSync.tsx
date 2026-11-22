import { useEffect } from 'react'
import { getMe } from '../api/auth'
import { getAccessToken } from '../api/client'
import {
  applyAccountAppearance,
  clearCachedAppearance,
  mergeAppearanceFromUser,
  readCachedAppearance,
} from './accountAppearance'

function userHasAppearanceFields(user: object): boolean {
  return (
    Object.prototype.hasOwnProperty.call(user, 'theme_id') ||
    Object.prototype.hasOwnProperty.call(user, 'ability_colors')
  )
}

/** Keeps surface, accent, background, font, and ability colors in sync with the account. */
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
        applyAccountAppearance(mergeAppearanceFromUser(readCachedAppearance(), user))
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
