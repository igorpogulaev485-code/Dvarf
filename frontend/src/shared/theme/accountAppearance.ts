/** Account appearance: L3/I2 surface, background, accent, ability colors, font pair.
 * Tokens live in the Листва kit (01-tokens-base.css). Background tiles come from
 * docs/concept-v2/css/shared-approved.css. theme_id stays the six accents.
 */

export type ThemeId = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export type SurfaceId = 'light-designer3' | 'leaf-classic'
export type AbilityColorsMode = 'identity' | 'theme'
export type FontPairId = 'antiqua' | 'grotesque' | 'ustav' | 'scribe' | 'script' | 'tabular'
export type BackgroundId =
  | 'parchment'
  | 'ivory'
  | 'linen'
  | 'stone'
  | 'moss'
  | 'azure'
  | 'ink'
  | 'graphite'
  | 'night'
  | 'oak'
  | 'tar'
  | 'slate'

export type AccountAppearance = {
  themeId: ThemeId
  surface: SurfaceId
  bgLight: BackgroundId
  bgDark: BackgroundId
  fontPair: FontPairId
  abilityColors: AbilityColorsMode
}

type AccentOption = {
  id: ThemeId
  name: string
  ability: string
  light: string
  dark: string
  soft: string
  note?: string
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: 'str', name: 'Медь', ability: 'СИЛ', light: '#9a4a32', dark: '#e8b6a8', soft: '#f3e0d6' },
  { id: 'dex', name: 'Хвоя', ability: 'ЛОВ', light: '#3d6b5a', dark: '#9ecbb6', soft: '#dcece4' },
  { id: 'con', name: 'Охра', ability: 'ТЕЛ', light: '#8a6a2f', dark: '#e0cc8a', soft: '#f1e6c8' },
  { id: 'int', name: 'Чернила', ability: 'ИНТ', light: '#3f5f8a', dark: '#adc2e0', soft: '#dde6f2' },
  {
    id: 'wis',
    name: 'Листва',
    ability: 'МДР',
    light: '#4e5d34',
    dark: '#c4d19a',
    soft: '#e5ecd4',
    note: 'дефолт',
  },
  { id: 'cha', name: 'Слива', ability: 'ХАР', light: '#7a4a6e', dark: '#e0b8d4', soft: '#efe0ea' },
]

/** @deprecated Use ACCENT_OPTIONS. Kept so existing imports keep the six names. */
export const THEME_OPTIONS = ACCENT_OPTIONS.map((item) => ({
  id: item.id,
  name: item.name,
  accent: item.light,
  soft: item.soft,
  ability: item.ability,
  note: item.note,
}))

export const LIGHT_BACKGROUNDS: { id: BackgroundId; name: string; color: string }[] = [
  { id: 'parchment', name: 'Пергамент', color: '#f7f2e4' },
  { id: 'ivory', name: 'Слоновая кость', color: '#fbf6ee' },
  { id: 'linen', name: 'Лён', color: '#f0e6d0' },
  { id: 'stone', name: 'Камень', color: '#e6e3dc' },
  { id: 'moss', name: 'Мох', color: '#e6ecda' },
  { id: 'azure', name: 'Лазурь', color: '#e4eef6' },
]

export const DARK_BACKGROUNDS: { id: BackgroundId; name: string; color: string }[] = [
  { id: 'ink', name: 'Чернила', color: '#0A0A0A' },
  { id: 'graphite', name: 'Графит', color: '#161618' },
  { id: 'night', name: 'Ночь', color: '#0d1119' },
  { id: 'oak', name: 'Дуб', color: '#17130f' },
  { id: 'tar', name: 'Смола', color: '#110e0c' },
  { id: 'slate', name: 'Сланец', color: '#14171c' },
]

export const FONT_OPTIONS: {
  id: FontPairId
  name: string
  display: string
  num: string
  weight: number
  note?: string
}[] = [
  {
    id: 'antiqua',
    name: 'Антиква',
    display: '"Source Serif 4", Georgia, "Times New Roman", serif',
    num: '"IBM Plex Sans", "Segoe UI", sans-serif',
    weight: 700,
    note: 'дефолт',
  },
  {
    id: 'grotesque',
    name: 'Гротеск',
    display: '"Source Sans 3", "IBM Plex Sans", "Segoe UI", sans-serif',
    num: '"IBM Plex Sans", "Segoe UI", sans-serif',
    weight: 700,
  },
  {
    id: 'ustav',
    name: 'Устав',
    display: '"Yeseva One", "Source Serif 4", Georgia, serif',
    num: '"IBM Plex Sans", "Segoe UI", sans-serif',
    weight: 400,
  },
  {
    id: 'scribe',
    name: 'Писчая',
    display: 'Literata, "Source Serif 4", Georgia, serif',
    num: '"IBM Plex Sans", "Segoe UI", sans-serif',
    weight: 700,
  },
  {
    id: 'script',
    name: 'Рукописная',
    display: 'Caveat, "Segoe Script", cursive',
    num: '"IBM Plex Sans", "Segoe UI", sans-serif',
    weight: 600,
  },
  {
    id: 'tabular',
    name: 'Табличная',
    display: '"IBM Plex Sans", "Segoe UI", sans-serif',
    num: '"IBM Plex Mono", ui-monospace, monospace',
    weight: 650,
  },
]

export const DEFAULT_APPEARANCE: AccountAppearance = {
  themeId: 'wis',
  surface: 'light-designer3',
  bgLight: 'parchment',
  bgDark: 'ink',
  fontPair: 'antiqua',
  abilityColors: 'identity',
}

const CACHE_KEY = 'dvarf.accountAppearance.v1'

const THEME_IDS: readonly ThemeId[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const SURFACES: readonly SurfaceId[] = ['light-designer3', 'leaf-classic']
const ABILITY: readonly AbilityColorsMode[] = ['identity', 'theme']
const FONTS: readonly FontPairId[] = ['antiqua', 'grotesque', 'ustav', 'scribe', 'script', 'tabular']
const LIGHT_IDS: readonly BackgroundId[] = ['parchment', 'ivory', 'linen', 'stone', 'moss', 'azure']
const DARK_IDS: readonly BackgroundId[] = ['ink', 'graphite', 'night', 'oak', 'tar', 'slate']

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null
}

export type AppearanceInput = {
  theme_id?: string | null
  ability_colors?: string | null
  surface?: string | null
  bg_light?: string | null
  bg_dark?: string | null
  font_pair?: string | null
  themeId?: string | null
  abilityColors?: string | null
  bgLight?: string | null
  bgDark?: string | null
  fontPair?: string | null
}

export function normalizeAppearance(partial: AppearanceInput): AccountAppearance {
  return {
    themeId: oneOf(partial.themeId ?? partial.theme_id, THEME_IDS) ?? DEFAULT_APPEARANCE.themeId,
    surface: oneOf(partial.surface, SURFACES) ?? DEFAULT_APPEARANCE.surface,
    bgLight: oneOf(partial.bgLight ?? partial.bg_light, LIGHT_IDS) ?? DEFAULT_APPEARANCE.bgLight,
    bgDark: oneOf(partial.bgDark ?? partial.bg_dark, DARK_IDS) ?? DEFAULT_APPEARANCE.bgDark,
    fontPair: oneOf(partial.fontPair ?? partial.font_pair, FONTS) ?? DEFAULT_APPEARANCE.fontPair,
    abilityColors:
      oneOf(partial.abilityColors ?? partial.ability_colors, ABILITY) ??
      DEFAULT_APPEARANCE.abilityColors,
  }
}

function keep<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return oneOf(value, allowed) ?? fallback
}

/**
 * Server fields overwrite the base only when the key is present and valid.
 * A thin response that omits the new keys must not reset font or background.
 */
export function mergeAppearanceFromUser(
  base: AccountAppearance,
  user: AppearanceInput,
): AccountAppearance {
  const has = (key: keyof AppearanceInput) =>
    Object.prototype.hasOwnProperty.call(user, key) && user[key] != null
  return {
    themeId: has('theme_id') ? keep(user.theme_id, THEME_IDS, base.themeId) : base.themeId,
    surface: has('surface') ? keep(user.surface, SURFACES, base.surface) : base.surface,
    bgLight: has('bg_light') ? keep(user.bg_light, LIGHT_IDS, base.bgLight) : base.bgLight,
    bgDark: has('bg_dark') ? keep(user.bg_dark, DARK_IDS, base.bgDark) : base.bgDark,
    fontPair: has('font_pair') ? keep(user.font_pair, FONTS, base.fontPair) : base.fontPair,
    abilityColors: has('ability_colors')
      ? keep(user.ability_colors, ABILITY, base.abilityColors)
      : base.abilityColors,
  }
}

export function activeBackground(appearance: AccountAppearance): BackgroundId {
  return appearance.surface === 'leaf-classic' ? appearance.bgDark : appearance.bgLight
}

export function applyAccountAppearance(appearance: AccountAppearance): void {
  const root = document.documentElement
  root.setAttribute('data-theme', appearance.surface)
  root.setAttribute('data-accent', appearance.themeId)
  root.setAttribute('data-bg', activeBackground(appearance))
  root.setAttribute('data-font', appearance.fontPair)
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
    const parsed = JSON.parse(raw) as AppearanceInput
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
