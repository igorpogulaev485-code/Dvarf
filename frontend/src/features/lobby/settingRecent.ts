/** C9: недавние страницы сеттинга (localStorage, mid-session). */

const MAX_RECENT = 8
const PREFIX = 'dvarf.setting.recent.'

function key(settingId: string) {
  return `${PREFIX}${settingId}`
}

export function readRecentPageIds(settingId: string): string[] {
  if (!settingId || typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(key(settingId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

export function pushRecentPageId(settingId: string, pageId: string): string[] {
  if (!settingId || !pageId) return readRecentPageIds(settingId)
  const prev = readRecentPageIds(settingId).filter((id) => id !== pageId)
  const next = [pageId, ...prev].slice(0, MAX_RECENT)
  try {
    localStorage.setItem(key(settingId), JSON.stringify(next))
  } catch {
    /* quota / private mode */
  }
  return next
}

const FILTER_PREFIX = 'dvarf.setting.filter.'

export type SettingWikiFilterState = {
  kind: string
  tag: string
}

export function readSettingFilter(settingId: string): SettingWikiFilterState | null {
  if (!settingId || typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${FILTER_PREFIX}${settingId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SettingWikiFilterState
    if (!parsed || typeof parsed !== 'object') return null
    return {
      kind: typeof parsed.kind === 'string' ? parsed.kind : 'all',
      tag: typeof parsed.tag === 'string' ? parsed.tag : '',
    }
  } catch {
    return null
  }
}

export function writeSettingFilter(settingId: string, state: SettingWikiFilterState): void {
  if (!settingId || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(`${FILTER_PREFIX}${settingId}`, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}
