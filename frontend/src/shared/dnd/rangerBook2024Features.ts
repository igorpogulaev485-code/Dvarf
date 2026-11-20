/**
 * P24-M02B-ranger: FRHoF Winter Walker + RTW Hollow Warden helpers.
 * Callers must branch on rules_edition === '2024'; does not feed 2014 ranger paths.
 */

import { alwaysPreparedForSubclass2024, isPhb2024CreateSubclass } from './edition2024Subclasses'

export const M02B_RANGER_BOOK_SLUGS = [
  'ranger__winter-walker',
  'ranger__hollow-warden',
] as const

export type M02bRangerBookSlug = (typeof M02B_RANGER_BOOK_SLUGS)[number]

export const WINTER_WALKER_SLUG = 'ranger__winter-walker'
export const HOLLOW_WARDEN_SLUG = 'ranger__hollow-warden'

export function isM02bRangerBookSubclass(slug: string | null | undefined): boolean {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
  return (M02B_RANGER_BOOK_SLUGS as readonly string[]).includes(key)
}

export function isWinterWalker2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === WINTER_WALKER_SLUG
}

export function isHollowWarden2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === HOLLOW_WARDEN_SLUG
}

/** Assert allowlist opens only these two book paths (selfcheck). */
export function rangerBookAllowlistOpen2024(slug: string): boolean {
  return isPhb2024CreateSubclass(slug) && isM02bRangerBookSubclass(slug)
}

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL for this pack)                                    */
/* ------------------------------------------------------------------ */

export const WINTER_WALKER_NAME_RU = 'Зимний ходок'
export const HOLLOW_WARDEN_NAME_RU = 'Страж пустошей'

export const FRIGID_EXPLORER_NAME_RU = 'Ледяной исследователь'
export const HUNTERS_RIME_NAME_RU = 'Изморозь охотника'
export const WINTER_WALKER_SPELLS_NAME_RU = 'Заклинания зимнего ходока'
export const FORTIFYING_SOUL_NAME_RU = 'Укрепляющий дух'
export const CHILLING_RETRIBUTION_NAME_RU = 'Выстужающее возмездие'
export const FROZEN_HAUNT_NAME_RU = 'Морозный призрак'

export const WRATH_OF_THE_WILD_NAME_RU = 'Ярость дикой природы'
export const HOLLOW_WARDEN_SPELLS_NAME_RU = 'Заклинания стража пустошей'
export const HUNGERING_MIGHT_NAME_RU = 'Алчущая мощь'
export const ROT_AND_VIOLENCE_NAME_RU = 'Гниль и жестокость'
export const ANCIENT_MIGHT_NAME_RU = 'Древняя мощь'
export const UNDYING_WRATH_NAME_RU = 'Неугасающая ярость'

/** Forbidden labels for this pack (catalog / UI). */
export const FORBIDDEN_RANGER_BOOK_LABELS_2024 = [
  'Иней охотника',
  'Гнев дикой природы',
  'Странник пустошей',
] as const

/* ------------------------------------------------------------------ */
/* Feature / pool ids                                                  */
/* ------------------------------------------------------------------ */

export const FRIGID_EXPLORER_FEATURE_ID = 'frigid-explorer'
export const HUNTERS_RIME_FEATURE_ID = 'hunters-rime'
export const WINTER_WALKER_SPELLS_FEATURE_ID = 'winter-walker-spells'
export const FORTIFYING_SOUL_FEATURE_ID = 'fortifying-soul'
export const CHILLING_RETRIBUTION_FEATURE_ID = 'chilling-retribution'
export const FROZEN_HAUNT_FEATURE_ID = 'frozen-haunt'

export const WRATH_OF_THE_WILD_FEATURE_ID = 'wrath-of-the-wild'
export const HOLLOW_WARDEN_SPELLS_FEATURE_ID = 'hollow-warden-spells'
export const HUNGERING_MIGHT_FEATURE_ID = 'hungering-might'
export const ROT_AND_VIOLENCE_FEATURE_ID = 'rot-and-violence'
export const ANCIENT_MIGHT_FEATURE_ID = 'ancient-might'

export const FORTIFYING_SOUL_POOL_ID = 'fortifying_soul'
export const CHILLING_RETRIBUTION_POOL_ID = 'chilling_retribution'
export const FROZEN_HAUNT_POOL_ID = 'frozen_haunt'
export const UNDYING_WRATH_POOL_ID = 'undying_wrath'

/** Draft pools that must never appear for these book paths. */
export const FORBIDDEN_DRAFT_POOL_IDS_2024 = ['hunters_rime', 'wrath_of_the_wild'] as const

/* ------------------------------------------------------------------ */
/* Feature ids by level                                                */
/* ------------------------------------------------------------------ */

export const WINTER_WALKER_FEATURES_BY_LEVEL: Record<number, readonly string[]> = {
  3: [FRIGID_EXPLORER_FEATURE_ID, HUNTERS_RIME_FEATURE_ID, WINTER_WALKER_SPELLS_FEATURE_ID],
  7: [FORTIFYING_SOUL_FEATURE_ID],
  11: [CHILLING_RETRIBUTION_FEATURE_ID],
  15: [FROZEN_HAUNT_FEATURE_ID],
}

export const HOLLOW_WARDEN_FEATURES_BY_LEVEL: Record<number, readonly string[]> = {
  3: [WRATH_OF_THE_WILD_FEATURE_ID, HOLLOW_WARDEN_SPELLS_FEATURE_ID],
  7: [HUNGERING_MIGHT_FEATURE_ID],
  11: [ROT_AND_VIOLENCE_FEATURE_ID],
  15: [ANCIENT_MIGHT_FEATURE_ID],
}

export function winterWalkerFeatureIdsAtLevel2024(level: number): string[] {
  const n = Math.max(0, Math.floor(level) || 0)
  const out: string[] = []
  for (const gate of [3, 7, 11, 15] as const) {
    if (n >= gate) out.push(...(WINTER_WALKER_FEATURES_BY_LEVEL[gate] ?? []))
  }
  return out
}

export function hollowWardenFeatureIdsAtLevel2024(level: number): string[] {
  const n = Math.max(0, Math.floor(level) || 0)
  const out: string[] = []
  for (const gate of [3, 7, 11, 15] as const) {
    if (n >= gate) out.push(...(HOLLOW_WARDEN_FEATURES_BY_LEVEL[gate] ?? []))
  }
  return out
}

export function rangerBookFeatureIdsAtLevel2024(
  slug: string | null | undefined,
  level: number,
): string[] {
  if (isWinterWalker2024(slug)) return winterWalkerFeatureIdsAtLevel2024(level)
  if (isHollowWarden2024(slug)) return hollowWardenFeatureIdsAtLevel2024(level)
  return []
}

/* ------------------------------------------------------------------ */
/* Always-prepared thresholds (catalog spell_list)                     */
/* ------------------------------------------------------------------ */

export const WINTER_WALKER_ALWAYS_PREPARED: Record<number, readonly string[]> = {
  3: ['ice-knife'],
  5: ['hold-person'],
  9: ['remove-curse'],
  13: ['ice-storm'],
  17: ['cone-of-cold'],
}

export const HOLLOW_WARDEN_ALWAYS_PREPARED: Record<number, readonly string[]> = {
  3: ['wrathful-smite'],
  5: ['alter-self'],
  9: ['phantom-steed'],
  13: ['dominate-beast'],
  17: ['steel-wind-strike'],
}

export const WINTER_WALKER_SPELL_LABELS_RU: Record<string, string> = {
  'ice-knife': 'Ледяной кинжал',
  'hold-person': 'Удержание личности',
  'remove-curse': 'Снятие проклятия',
  'ice-storm': 'Град',
  'cone-of-cold': 'Конус холода',
}

export const HOLLOW_WARDEN_SPELL_LABELS_RU: Record<string, string> = {
  'wrathful-smite': 'Гневная кара',
  'alter-self': 'Смена обличья',
  'phantom-steed': 'Призрачный скакун',
  'dominate-beast': 'Подчинение зверя',
  'steel-wind-strike': 'Удар стального ветра',
}

export function expectedAlwaysPrepared2024(
  slug: string | null | undefined,
  level: number,
): string[] {
  const table = isWinterWalker2024(slug)
    ? WINTER_WALKER_ALWAYS_PREPARED
    : isHollowWarden2024(slug)
      ? HOLLOW_WARDEN_ALWAYS_PREPARED
      : null
  if (!table) return []
  const n = Math.max(0, Math.floor(level) || 0)
  const out: string[] = []
  for (const gate of Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b)) {
    if (n >= gate) out.push(...(table[gate] ?? []))
  }
  return out
}

export function catalogAlwaysPreparedMatches2024(
  slug: string,
  level: number,
): { expected: string[]; actual: string[]; ok: boolean } {
  const expected = expectedAlwaysPrepared2024(slug, level)
  const actual = alwaysPreparedForSubclass2024(slug, level)
  const ok = expected.every((s) => actual.includes(s))
  return { expected, actual, ok }
}

/* ------------------------------------------------------------------ */
/* Combat formulas                                                     */
/* ------------------------------------------------------------------ */

export function polarStrikesDie2024(rangerLevel: number): '1d4' | '1d6' {
  return rangerLevel >= 11 ? '1d6' : '1d4'
}

export function huntersRimeTempHpFormulaRu2024(rangerLevel: number): string {
  return `1к10+${Math.max(1, Math.floor(rangerLevel) || 1)}`
}

export function fortifyingSoulHealFormulaRu2024(rangerLevel: number): string {
  return `1к10+${Math.max(1, Math.floor(rangerLevel) || 1)}`
}

export function fortifyingSoulTargetCap2024(wisMod: number): number {
  return Math.max(1, Math.floor(wisMod) || 0)
}

export function wrathAcBonus2024(rangerLevel: number): number {
  return rangerLevel >= 11 ? 2 : 1
}

export function hungeringMightHealFormulaRu2024(wisMod: number): string {
  return `1к10+${Math.max(0, Math.floor(wisMod) || 0)}`
}

export function undyingWrathHp2024(rangerLevel: number): number {
  return Math.max(1, Math.floor(rangerLevel) || 1) * 2
}
