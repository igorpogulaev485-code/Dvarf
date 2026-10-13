/** Client prefs for the characters list (density + tags). Account sync — later. */

export type CharacterCardSize = 'large' | 'medium' | 'compact'

export type CharacterListTag = {
  id: string
  name: string
  color: string
}

export type CharacterListPrefs = {
  cardSize: CharacterCardSize
  tags: CharacterListTag[]
  /** characterId → tag ids */
  assignments: Record<string, string[]>
}

const STORAGE_KEY = 'dvarf.characterList.v1'

export const CARD_SIZE_OPTIONS: { id: CharacterCardSize; label: string }[] = [
  { id: 'large', label: 'Большие' },
  { id: 'medium', label: 'Средние' },
  { id: 'compact', label: 'Компактные' },
]

/** Kit-friendly palette (not neon LSS). */
export const TAG_COLOR_OPTIONS = [
  '#5a6b3d',
  '#6b4f2a',
  '#3d5a6b',
  '#6b3d4a',
  '#4a3d6b',
  '#3d6b5a',
  '#8a5a2b',
  '#2b5a8a',
  '#8a2b3d',
  '#5a5a5a',
] as const

const DEFAULT_PREFS: CharacterListPrefs = {
  cardSize: 'large',
  tags: [],
  assignments: {},
}

function isCardSize(value: unknown): value is CharacterCardSize {
  return value === 'large' || value === 'medium' || value === 'compact'
}

function normalizeTag(raw: unknown): CharacterListTag | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const id = typeof obj.id === 'string' ? obj.id.trim() : ''
  const name = typeof obj.name === 'string' ? obj.name.trim() : ''
  const color = typeof obj.color === 'string' ? obj.color.trim() : ''
  if (!id || !name || !color) return null
  return { id, name: name.slice(0, 40), color }
}

export function loadCharacterListPrefs(): CharacterListPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFS, tags: [], assignments: {} }
    const parsed = JSON.parse(raw) as Partial<CharacterListPrefs>
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.map(normalizeTag).filter((t): t is CharacterListTag => Boolean(t))
      : []
    const assignments: Record<string, string[]> = {}
    if (parsed.assignments && typeof parsed.assignments === 'object') {
      for (const [characterId, tagIds] of Object.entries(parsed.assignments)) {
        if (!Array.isArray(tagIds)) continue
        assignments[characterId] = tagIds.filter((id): id is string => typeof id === 'string')
      }
    }
    return {
      cardSize: isCardSize(parsed.cardSize) ? parsed.cardSize : 'large',
      tags,
      assignments,
    }
  } catch {
    return { ...DEFAULT_PREFS, tags: [], assignments: {} }
  }
}

export function saveCharacterListPrefs(prefs: CharacterListPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* quota / private mode — ignore */
  }
}

export function newTagId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `tag-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function tagsForCharacter(
  prefs: CharacterListPrefs,
  characterId: string,
): CharacterListTag[] {
  const ids = prefs.assignments[characterId] ?? []
  if (!ids.length) return []
  const byId = new Map(prefs.tags.map((tag) => [tag.id, tag]))
  return ids.map((id) => byId.get(id)).filter((tag): tag is CharacterListTag => Boolean(tag))
}

/** OR-filter: character matches if it has any selected tag. Empty filter = all. */
export function characterMatchesTagFilter(
  prefs: CharacterListPrefs,
  characterId: string,
  filterTagIds: string[],
): boolean {
  if (!filterTagIds.length) return true
  const assigned = new Set(prefs.assignments[characterId] ?? [])
  return filterTagIds.some((id) => assigned.has(id))
}
