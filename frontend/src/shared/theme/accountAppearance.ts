/** Account theme + ability-color mode (cabinet Wave B / docs/ui-kit §2n). */

export type ThemeId = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export type AbilityColorsMode = 'identity' | 'theme'

export type AccountAppearance = {
  themeId: ThemeId
  abilityColors: AbilityColorsMode
}

export const THEME_OPTIONS: {
  id: ThemeId
  name: string
  accent: string
  soft: string
  ability: string
  note?: string
}[] = [
  { id: 'str', name: 'Медь', accent: '#9a4a32', soft: '#f3e0d6', ability: 'СИЛ' },
  { id: 'dex', name: 'Хвоя', accent: '#3d6b5a', soft: '#dcece4', ability: 'ЛОВ' },
  { id: 'con', name: 'Охра', accent: '#8a6a2f', soft: '#f1e6c8', ability: 'ТЕЛ' },
  { id: 'int', name: 'Чернила', accent: '#3f5f8a', soft: '#dde6f2', ability: 'ИНТ' },
  {
    id: 'wis',
    name: 'Листва',
    accent: '#5a6b3d',
    soft: '#e5ecd4',
    ability: 'МДР',
    note: 'дефолт',
  },
  { id: 'cha', name: 'Слива', accent: '#7a4a6e', soft: '#efe0ea', ability: 'ХАР' },
]

export const DEFAULT_APPEARANCE: AccountAppearance = {
  themeId: 'wis',
  abilityColors: 'identity',
}

const CACHE_KEY = 'dvarf.accountAppearance.v1'

function isThemeId(value: unknown): value is ThemeId {
  return (
    value === 'str' ||
    value === 'dex' ||
    value === 'con' ||
    value === 'int' ||
    value === 'wis' ||
    value === 'cha'
  )
}

function isAbilityColors(value: unknown): value is AbilityColorsMode {
  return value === 'identity' || value === 'theme'
}

export function normalizeAppearance(partial: {
  theme_id?: string | null
  ability_colors?: string | null
  themeId?: string | null
  abilityColors?: string | null
}): AccountAppearance {
  const themeRaw = partial.themeId ?? partial.theme_id
  const colorsRaw = partial.abilityColors ?? partial.ability_colors
  return {
    themeId: isThemeId(themeRaw) ? themeRaw : DEFAULT_APPEARANCE.themeId,
    abilityColors: isAbilityColors(colorsRaw)
      ? colorsRaw
      : DEFAULT_APPEARANCE.abilityColors,
  }
}

/**
 * Merge server user fields onto a base appearance without inventing defaults
 * for missing keys (used when patching profile while keeping theme).
 */
export function mergeAppearanceFromUser(
  base: AccountAppearance,
  user: {
    theme_id?: string | null
    ability_colors?: string | null
  },
): AccountAppearance {
  return {
    themeId: isThemeId(user.theme_id) ? user.theme_id : base.themeId,
    abilityColors: isAbilityColors(user.ability_colors)
      ? user.ability_colors
      : base.abilityColors,
  }
}

export function applyAccountAppearance(appearance: AccountAppearance): void {
  const root = document.documentElement
  root.setAttribute('data-theme', appearance.themeId)
  root.setAttribute('data-ability-colors', appearance.abilityColors)
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(appearance))
  } catch {
    /* ignore */
  }
}

export function readCachedAppearance(): AccountAppearance {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return { ...DEFAULT_APPEARANCE }
    const parsed = JSON.parse(raw) as Partial<AccountAppearance>
    return normalizeAppearance(parsed)
  } catch {
    return { ...DEFAULT_APPEARANCE }
  }
}

/** Call before React mount to avoid accent flash. */
export function bootstrapAccountAppearance(): void {
  applyAccountAppearance(readCachedAppearance())
}

export function clearCachedAppearance(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignore */
  }
  applyAccountAppearance({ ...DEFAULT_APPEARANCE })
}
