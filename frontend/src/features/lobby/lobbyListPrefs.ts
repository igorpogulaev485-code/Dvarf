import type { CharacterCardSize } from '../characters/characterListPrefs'

const STORAGE_KEY = 'dvarf.lobbyList.v1'

function isSize(value: unknown): value is CharacterCardSize {
  return value === 'large' || value === 'medium' || value === 'compact'
}

/** Accepted lobby list is the large tiles. Remembered apart from character density. */
export function loadLobbyCardSize(): CharacterCardSize {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return 'large'
    const parsed = JSON.parse(raw) as { cardSize?: unknown }
    return isSize(parsed.cardSize) ? parsed.cardSize : 'large'
  } catch {
    return 'large'
  }
}

export function saveLobbyCardSize(cardSize: CharacterCardSize): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ cardSize }))
  } catch {
    /* quota / private mode */
  }
}
