/**
 * P24-M02B-rogue: FRHoF Scion of the Three + RTW Phantom.
 * Callers must branch on rules_edition === '2024'; does not feed 2014 rogue paths.
 */

import type { FeatureChoiceDef } from './classFeatures'
import { isPhb2024CreateSubclass } from './edition2024Subclasses'
import { parseFeatureResourceId } from './featureResources'
import { clampResource, type SheetResource } from './rest'
import { sneakAttackDice2024 } from './rogue2024Features'

export const M02B_ROGUE_BOOK_SLUGS = [
  'rogue__scion-of-the-three',
  'rogue__phantom',
] as const

export type M02bRogueBookSlug = (typeof M02B_ROGUE_BOOK_SLUGS)[number]

export const SCION_SLUG = 'rogue__scion-of-the-three'
export const PHANTOM_SLUG = 'rogue__phantom'

export function isM02bRogueBookSubclass(slug: string | null | undefined): boolean {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
  return (M02B_ROGUE_BOOK_SLUGS as readonly string[]).includes(key)
}

export function isScionOfTheThree2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === SCION_SLUG
}

export function isPhantom2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === PHANTOM_SLUG
}

export function rogueBookAllowlistOpen2024(slug: string): boolean {
  return isPhb2024CreateSubclass(slug) && isM02bRogueBookSubclass(slug)
}

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL)                                                  */
/* ------------------------------------------------------------------ */

export const SCION_NAME_RU = 'Наследник троицы'
export const PHANTOM_NAME_RU = 'Фантом'

export const BLOODTHIRST_NAME_RU = 'Кровожадность'
export const DREAD_ALLEGIANCE_NAME_RU = 'Ужасная преданность'
export const STRIKE_FEAR_NAME_RU = 'Удар страха'
export const AURA_OF_MALEVOLENCE_NAME_RU = 'Аура злобы'
export const DREAD_INCARNATE_NAME_RU = 'Воплощение ужаса'

export const WHISPERS_OF_THE_DEAD_NAME_RU = 'Шёпот мёртвых'
export const WAILS_FROM_THE_GRAVE_NAME_RU = 'Могильные стенания'
export const TOKENS_OF_THE_DEPARTED_NAME_RU = 'Сувениры усопших'
export const VOICE_OF_DEATH_NAME_RU = 'Голос мёртвых'
export const GHOST_WALK_NAME_RU = 'Призрачная походка'
export const DEATHS_FRIEND_NAME_RU = 'Друг смерти'

export const TOKENS_DEATH_KNELL_NAME_RU = 'Перезвон смерти'
export const TOKENS_LIFE_ESSENCE_NAME_RU = 'Сущность жизни'
export const TOKENS_QUESTION_NAME_RU = 'Вопрос к духам'
export const TOKENS_GAIN_NAME_RU = 'Получение сувениров'

export const FORBIDDEN_ROGUE_BOOK_LABELS_2024 = [
  'Коварная атака',
  'Коварной атаки',
  'Ликвидация',
  'Вопли из могилы',
  'Знаки ушедших',
  'Наследник Троих',
  'Призрак',
] as const

/* ------------------------------------------------------------------ */
/* Feature / pool ids                                                  */
/* ------------------------------------------------------------------ */

export const BLOODTHIRST_FEATURE_ID = 'bloodthirst'
export const DREAD_ALLEGIANCE_FEATURE_ID = 'dread-allegiance'
export const STRIKE_FEAR_FEATURE_ID = 'strike-fear'
export const AURA_OF_MALEVOLENCE_FEATURE_ID = 'aura-of-malevolence'
export const DREAD_INCARNATE_FEATURE_ID = 'dread-incarnate'

export const WHISPERS_OF_THE_DEAD_FEATURE_ID = 'whispers-of-the-dead'
export const WAILS_FROM_THE_GRAVE_FEATURE_ID = 'wails-from-the-grave'
export const TOKENS_OF_THE_DEPARTED_FEATURE_ID = 'tokens-of-the-departed'
export const VOICE_OF_DEATH_FEATURE_ID = 'voice-of-death'
export const GHOST_WALK_FEATURE_ID = 'ghost-walk'
export const DEATHS_FRIEND_FEATURE_ID = 'death-s-friend'

export const BLOODTHIRST_POOL_ID = 'bloodthirst'
export const WAILS_FROM_THE_GRAVE_POOL_ID = 'wails_from_the_grave'
export const TOKENS_OF_THE_DEPARTED_POOL_ID = 'tokens_of_the_departed'
export const VOICE_OF_DEATH_POOL_ID = 'voice_of_death'
export const GHOST_WALK_POOL_ID = 'ghost_walk'

export const DREAD_ALLEGIANCE_DEITY_PICK_ID = 'dread_allegiance_deity'

export const DREAD_ALLEGIANCE_DEITIES_2024 = ['baal', 'bane', 'myrkul'] as const
export type DreadAllegianceDeity2024 = (typeof DREAD_ALLEGIANCE_DEITIES_2024)[number]

export const DREAD_ALLEGIANCE_DEITY_LABELS_RU: Record<DreadAllegianceDeity2024, string> = {
  baal: 'Баал',
  bane: 'Бэйн',
  myrkul: 'Миркул',
}

export const DREAD_ALLEGIANCE_TABLE_2024: Record<
  DreadAllegianceDeity2024,
  { resistanceRu: string; resistanceType: string; cantripSlug: string; cantripRu: string }
> = {
  baal: {
    resistanceRu: 'урон Ядом',
    resistanceType: 'poison',
    cantripSlug: 'blade-ward',
    cantripRu: 'Защита от оружия',
  },
  bane: {
    resistanceRu: 'Психический урон',
    resistanceType: 'psychic',
    cantripSlug: 'minor-illusion',
    cantripRu: 'Малая иллюзия',
  },
  myrkul: {
    resistanceRu: 'Некротический урон',
    resistanceType: 'necrotic',
    cantripSlug: 'chill-touch',
    cantripRu: 'Леденящее прикосновение',
  },
}

export const dreadAllegianceDeityChoice2024: FeatureChoiceDef = {
  id: DREAD_ALLEGIANCE_DEITY_PICK_ID,
  label_ru: `${DREAD_ALLEGIANCE_NAME_RU}: Божество`,
  max_picks: 1,
  options: [...DREAD_ALLEGIANCE_DEITIES_2024],
  option_labels_ru: { ...DREAD_ALLEGIANCE_DEITY_LABELS_RU },
}

/* ------------------------------------------------------------------ */
/* Feature ids by level (rogue book grid 3 / 9 / 13 / 17)               */
/* ------------------------------------------------------------------ */

export const SCION_FEATURES_BY_LEVEL: Record<number, readonly string[]> = {
  3: [BLOODTHIRST_FEATURE_ID, DREAD_ALLEGIANCE_FEATURE_ID],
  9: [STRIKE_FEAR_FEATURE_ID],
  13: [AURA_OF_MALEVOLENCE_FEATURE_ID],
  17: [DREAD_INCARNATE_FEATURE_ID],
}

export const PHANTOM_FEATURES_BY_LEVEL: Record<number, readonly string[]> = {
  3: [WHISPERS_OF_THE_DEAD_FEATURE_ID, WAILS_FROM_THE_GRAVE_FEATURE_ID],
  9: [TOKENS_OF_THE_DEPARTED_FEATURE_ID, VOICE_OF_DEATH_FEATURE_ID],
  13: [GHOST_WALK_FEATURE_ID],
  17: [DEATHS_FRIEND_FEATURE_ID],
}

export const ROGUE_BOOK_FEATURE_NAMES_BY_ID: Record<string, string> = {
  [BLOODTHIRST_FEATURE_ID]: BLOODTHIRST_NAME_RU,
  [DREAD_ALLEGIANCE_FEATURE_ID]: DREAD_ALLEGIANCE_NAME_RU,
  [STRIKE_FEAR_FEATURE_ID]: STRIKE_FEAR_NAME_RU,
  [AURA_OF_MALEVOLENCE_FEATURE_ID]: AURA_OF_MALEVOLENCE_NAME_RU,
  [DREAD_INCARNATE_FEATURE_ID]: DREAD_INCARNATE_NAME_RU,
  [WHISPERS_OF_THE_DEAD_FEATURE_ID]: WHISPERS_OF_THE_DEAD_NAME_RU,
  [WAILS_FROM_THE_GRAVE_FEATURE_ID]: WAILS_FROM_THE_GRAVE_NAME_RU,
  [TOKENS_OF_THE_DEPARTED_FEATURE_ID]: TOKENS_OF_THE_DEPARTED_NAME_RU,
  [VOICE_OF_DEATH_FEATURE_ID]: VOICE_OF_DEATH_NAME_RU,
  [GHOST_WALK_FEATURE_ID]: GHOST_WALK_NAME_RU,
  [DEATHS_FRIEND_FEATURE_ID]: DEATHS_FRIEND_NAME_RU,
}

export function scionFeatureIdsAtLevel2024(level: number): string[] {
  const n = Math.max(0, Math.floor(level) || 0)
  const out: string[] = []
  for (const gate of [3, 9, 13, 17] as const) {
    if (n >= gate) out.push(...(SCION_FEATURES_BY_LEVEL[gate] ?? []))
  }
  return out
}

export function phantomFeatureIdsAtLevel2024(level: number): string[] {
  const n = Math.max(0, Math.floor(level) || 0)
  const out: string[] = []
  for (const gate of [3, 9, 13, 17] as const) {
    if (n >= gate) out.push(...(PHANTOM_FEATURES_BY_LEVEL[gate] ?? []))
  }
  return out
}

export function rogueBookFeatureIdsAtLevel2024(
  slug: string | null | undefined,
  level: number,
): string[] {
  if (isScionOfTheThree2024(slug)) return scionFeatureIdsAtLevel2024(level)
  if (isPhantom2024(slug)) return phantomFeatureIdsAtLevel2024(level)
  return []
}

export function rogueBookFeatureNameRu2024(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.trim().replace(/_/g, '-')
  return ROGUE_BOOK_FEATURE_NAMES_BY_ID[featureId] || ROGUE_BOOK_FEATURE_NAMES_BY_ID[key] || null
}

/* ------------------------------------------------------------------ */
/* Pool helpers                                                        */
/* ------------------------------------------------------------------ */

function abilityMod(score: number): number {
  return Math.floor((Math.max(1, Math.floor(score) || 10) - 10) / 2)
}

export function bloodthirstUses2024(intScore: number): number {
  return Math.max(1, abilityMod(intScore))
}

export function wailsFromTheGraveUses2024(dexScore: number): number {
  return Math.max(1, abilityMod(dexScore))
}

/** Tokens stock max: 2 @9, 3 @13, 4 @17. */
export function tokensOfTheDepartedMax2024(rogueLevel: number): number {
  const level = Math.max(0, Math.floor(rogueLevel) || 0)
  if (level < 9) return 0
  if (level >= 17) return 4
  if (level >= 13) return 3
  return 2
}

/** Long rest refills stock up to 2 (not up to max at 13/17). */
export const TOKENS_LONG_REST_FLOOR_2024 = 2

export function wailsHalfDice2024(rogueLevel: number): number {
  return Math.ceil(sneakAttackDice2024(rogueLevel) / 2)
}

export function findRogueBookPool2024(
  resources: SheetResource[],
  poolId: string,
  classEntryId?: string,
): SheetResource | null {
  if (classEntryId) {
    const exact = resources.find((row) => {
      const parsed = parseFeatureResourceId(row.id)
      return parsed?.poolId === poolId && parsed.classEntryId === classEntryId
    })
    if (exact) return exact
  }
  return resources.find((row) => parseFeatureResourceId(row.id)?.poolId === poolId) ?? null
}

function bumpPool(
  resources: SheetResource[],
  pool: SheetResource,
  deltaUsed: number,
): SheetResource[] {
  return resources.map((row) => {
    if (row.id !== pool.id) return row
    return clampResource({ ...row, used: Math.max(0, Math.min(row.max, row.used + deltaUsed)) })
  })
}

/** Ensure newly unlocked tokens stock starts at floor (2). */
export function seedTokensOfTheDepartedStock2024(resources: SheetResource[]): SheetResource[] {
  return resources.map((row) => {
    const parsed = parseFeatureResourceId(row.id)
    if (parsed?.poolId !== TOKENS_OF_THE_DEPARTED_POOL_ID) return row
    if (row.track !== 'stock') return row
    if (row.used > 0) return row
    const floor = Math.min(TOKENS_LONG_REST_FLOOR_2024, row.max)
    return clampResource({ ...row, used: floor })
  })
}

/** Long rest: if holdings < 2, refill to 2 (capped by max). */
export function refillTokensOfTheDepartedOnLongRest2024(
  resources: SheetResource[],
): SheetResource[] {
  return resources.map((row) => {
    const parsed = parseFeatureResourceId(row.id)
    if (parsed?.poolId !== TOKENS_OF_THE_DEPARTED_POOL_ID) return row
    if (row.track !== 'stock') return row
    const floor = Math.min(TOKENS_LONG_REST_FLOOR_2024, row.max)
    if (row.used >= floor) return row
    return clampResource({ ...row, used: floor })
  })
}

/** Death's Friend — Притяжение смерти: on initiative, +1 token if empty. */
export function grantTokenOnInitiativeIfEmpty2024(resources: SheetResource[]): SheetResource[] {
  return resources.map((row) => {
    const parsed = parseFeatureResourceId(row.id)
    if (parsed?.poolId !== TOKENS_OF_THE_DEPARTED_POOL_ID) return row
    if (row.track !== 'stock') return row
    if (row.used > 0) return row
    return clampResource({ ...row, used: Math.min(row.max, 1) })
  })
}

/* ------------------------------------------------------------------ */
/* Desk use                                                            */
/* ------------------------------------------------------------------ */

const ROGUE_BOOK_USE_FEATURE_IDS = new Set([
  BLOODTHIRST_FEATURE_ID,
  DREAD_ALLEGIANCE_FEATURE_ID,
  AURA_OF_MALEVOLENCE_FEATURE_ID,
  DREAD_INCARNATE_FEATURE_ID,
  WHISPERS_OF_THE_DEAD_FEATURE_ID,
  WAILS_FROM_THE_GRAVE_FEATURE_ID,
  TOKENS_OF_THE_DEPARTED_FEATURE_ID,
  VOICE_OF_DEATH_FEATURE_ID,
  GHOST_WALK_FEATURE_ID,
  DEATHS_FRIEND_FEATURE_ID,
  STRIKE_FEAR_FEATURE_ID,
])

export const ROGUE_BOOK_2024_CARD_BUTTONS: Record<string, string> = {
  [BLOODTHIRST_FEATURE_ID]: 'Реакция…',
  'dread-allegiance': 'Преданность…',
  dread_allegiance: 'Преданность…',
  'strike-fear': 'Удар страха…',
  strike_fear: 'Удар страха…',
  'aura-of-malevolence': 'Аура…',
  aura_of_malevolence: 'Аура…',
  'dread-incarnate': 'Ужас…',
  dread_incarnate: 'Ужас…',
  'whispers-of-the-dead': 'Шёпот…',
  whispers_of_the_dead: 'Шёпот…',
  'wails-from-the-grave': 'Стенания…',
  wails_from_the_grave: 'Стенания…',
  'tokens-of-the-departed': 'Сувениры…',
  tokens_of_the_departed: 'Сувениры…',
  'voice-of-death': 'Голос…',
  voice_of_death: 'Голос…',
  'ghost-walk': 'Походка…',
  ghost_walk: 'Походка…',
  'death-s-friend': 'Друг смерти…',
  death_s_friend: 'Друг смерти…',
}

export function rogueBook2024UseFeatureId(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.trim().replace(/_/g, '-')
  return ROGUE_BOOK_USE_FEATURE_IDS.has(key) ? key : null
}

export type RogueBook2024UseMode =
  | 'spend'
  | 'refund'
  | 'death_knell'
  | 'question_spirits'
  | 'gain_reaction'
  | 'restore_ghost_walk'
  | 'wails_both'
  | 'sneak_min3'
  | 'aura_from'
  | 'aura_to'

export type RogueBook2024UseResult = {
  ok: boolean
  resources: SheetResource[]
  message: string
}

export function applyRogueBook2024FeatureUse(input: {
  featureId: string
  resources: SheetResource[]
  classEntryId: string
  rogueLevel: number
  mode?: RogueBook2024UseMode
  intScore?: number
}): RogueBook2024UseResult {
  const fid = rogueBook2024UseFeatureId(input.featureId) ?? input.featureId.replace(/_/g, '-')
  const mode = input.mode ?? 'spend'
  const level = Math.max(0, Math.floor(input.rogueLevel) || 0)
  const list = [...input.resources]

  if (fid === BLOODTHIRST_FEATURE_ID) {
    const pool = findRogueBookPool2024(list, BLOODTHIRST_POOL_ID, input.classEntryId)
    if (!pool) return { ok: false, resources: list, message: `${BLOODTHIRST_NAME_RU}: пул не найден` }
    if (mode === 'refund') {
      if (pool.used <= 0) return { ok: false, resources: list, message: 'Нечего возвращать' }
      return {
        ok: true,
        resources: bumpPool(list, pool, -1),
        message: `${BLOODTHIRST_NAME_RU}: использование возвращено`,
      }
    }
    if (pool.used >= pool.max) {
      return { ok: false, resources: list, message: `${BLOODTHIRST_NAME_RU}: нет использований` }
    }
    const intMod = abilityMod(input.intScore ?? 10)
    const aura =
      level >= 13
        ? mode === 'aura_to'
          ? 'Аура злобы: урон от точки прибытия'
          : 'Аура злобы: урон от точки отправления'
        : null
    return {
      ok: true,
      resources: bumpPool(list, pool, 1),
      message: aura
        ? `${BLOODTHIRST_NAME_RU}: телепорт + рукопашная; ${aura} (${Math.max(0, intMod)} урона)`
        : `${BLOODTHIRST_NAME_RU}: телепорт в 5 фт. + одна рукопашная атака`,
    }
  }

  if (fid === WAILS_FROM_THE_GRAVE_FEATURE_ID) {
    const pool = findRogueBookPool2024(list, WAILS_FROM_THE_GRAVE_POOL_ID, input.classEntryId)
    const half = wailsHalfDice2024(level)
    const both = mode === 'wails_both' && level >= 17
    if (mode === 'death_knell') {
      const tokens = findRogueBookPool2024(list, TOKENS_OF_THE_DEPARTED_POOL_ID, input.classEntryId)
      if (!tokens || tokens.track !== 'stock' || tokens.used <= 0) {
        return { ok: false, resources: list, message: `${TOKENS_DEATH_KNELL_NAME_RU}: нужен сувенир` }
      }
      return {
        ok: true,
        resources: bumpPool(list, tokens, -1),
        message: both
          ? `${TOKENS_DEATH_KNELL_NAME_RU}: ${half}к6 некротики по двум целям (без траты стенаний)`
          : `${TOKENS_DEATH_KNELL_NAME_RU}: ${half}к6 некротики по второй цели (без траты стенаний)`,
      }
    }
    if (!pool) {
      return { ok: false, resources: list, message: `${WAILS_FROM_THE_GRAVE_NAME_RU}: пул не найден` }
    }
    if (mode === 'refund') {
      if (pool.used <= 0) return { ok: false, resources: list, message: 'Нечего возвращать' }
      return {
        ok: true,
        resources: bumpPool(list, pool, -1),
        message: `${WAILS_FROM_THE_GRAVE_NAME_RU}: использование возвращено`,
      }
    }
    if (pool.used >= pool.max) {
      return {
        ok: false,
        resources: list,
        message: `${WAILS_FROM_THE_GRAVE_NAME_RU}: нет использований`,
      }
    }
    return {
      ok: true,
      resources: bumpPool(list, pool, 1),
      message: both
        ? `${WAILS_FROM_THE_GRAVE_NAME_RU}: ${half}к6 некротики по обеим целям`
        : `${WAILS_FROM_THE_GRAVE_NAME_RU}: ${half}к6 некротики по второй цели в 30 фт.`,
    }
  }

  if (fid === TOKENS_OF_THE_DEPARTED_FEATURE_ID) {
    const pool = findRogueBookPool2024(list, TOKENS_OF_THE_DEPARTED_POOL_ID, input.classEntryId)
    if (!pool || pool.track !== 'stock') {
      return { ok: false, resources: list, message: `${TOKENS_OF_THE_DEPARTED_NAME_RU}: сток не найден` }
    }
    if (mode === 'gain_reaction') {
      if (pool.used >= pool.max) {
        // Replace one existing token with the new one — holdings stay at max.
        return {
          ok: true,
          resources: list,
          message: `${TOKENS_GAIN_NAME_RU}: сувенир заменён (уже максимум ${pool.max})`,
        }
      }
      return {
        ok: true,
        resources: bumpPool(list, pool, 1),
        message: `${TOKENS_GAIN_NAME_RU}: +1 сувенир (${pool.used + 1}/${pool.max})`,
      }
    }
    if (mode === 'question_spirits' || mode === 'death_knell' || mode === 'spend') {
      if (pool.used <= 0) {
        return { ok: false, resources: list, message: 'Нет сувениров' }
      }
      const label =
        mode === 'question_spirits'
          ? TOKENS_QUESTION_NAME_RU
          : mode === 'death_knell'
            ? TOKENS_DEATH_KNELL_NAME_RU
            : TOKENS_OF_THE_DEPARTED_NAME_RU
      return {
        ok: true,
        resources: bumpPool(list, pool, -1),
        message: `${label}: сувенир уничтожен (${pool.used - 1}/${pool.max})`,
      }
    }
    return {
      ok: true,
      resources: list,
      message: `${TOKENS_LIFE_ESSENCE_NAME_RU}: преимущество к сейвам Смерти и Тел при ≥1 сувенире`,
    }
  }

  if (fid === VOICE_OF_DEATH_FEATURE_ID) {
    const pool = findRogueBookPool2024(list, VOICE_OF_DEATH_POOL_ID, input.classEntryId)
    if (!pool) return { ok: false, resources: list, message: `${VOICE_OF_DEATH_NAME_RU}: пул не найден` }
    if (mode === 'refund') {
      if (pool.used <= 0) return { ok: false, resources: list, message: 'Нечего возвращать' }
      return {
        ok: true,
        resources: bumpPool(list, pool, -1),
        message: `${VOICE_OF_DEATH_NAME_RU}: использование возвращено`,
      }
    }
    if (pool.used >= pool.max) {
      return { ok: false, resources: list, message: `${VOICE_OF_DEATH_NAME_RU}: уже использовано` }
    }
    return {
      ok: true,
      resources: bumpPool(list, pool, 1),
      message: `${VOICE_OF_DEATH_NAME_RU}: Разговор с мёртвыми (Ловк.; цель — труп или сувенир)`,
    }
  }

  if (fid === GHOST_WALK_FEATURE_ID) {
    const pool = findRogueBookPool2024(list, GHOST_WALK_POOL_ID, input.classEntryId)
    if (!pool) return { ok: false, resources: list, message: `${GHOST_WALK_NAME_RU}: пул не найден` }
    if (mode === 'restore_ghost_walk') {
      const tokens = findRogueBookPool2024(list, TOKENS_OF_THE_DEPARTED_POOL_ID, input.classEntryId)
      if (!tokens || tokens.track !== 'stock' || tokens.used <= 0) {
        return { ok: false, resources: list, message: 'Нужен сувенир, чтобы восстановить Походку' }
      }
      let next = bumpPool(list, tokens, -1)
      if (pool.used > 0) next = bumpPool(next, pool, -1)
      return {
        ok: true,
        resources: next,
        message: `${GHOST_WALK_NAME_RU}: использование восстановлено за сувенир`,
      }
    }
    if (mode === 'refund') {
      if (pool.used <= 0) return { ok: false, resources: list, message: 'Нечего возвращать' }
      return {
        ok: true,
        resources: bumpPool(list, pool, -1),
        message: `${GHOST_WALK_NAME_RU}: использование возвращено`,
      }
    }
    if (pool.used >= pool.max) {
      return { ok: false, resources: list, message: `${GHOST_WALK_NAME_RU}: уже использована` }
    }
    return {
      ok: true,
      resources: bumpPool(list, pool, 1),
      message: `${GHOST_WALK_NAME_RU}: полёт 10 фт., помеха к атакам по вам, бестелесный ход (10 мин.)`,
    }
  }

  if (fid === DREAD_INCARNATE_FEATURE_ID) {
    if (mode === 'sneak_min3') {
      return {
        ok: true,
        resources: list,
        message: `${DREAD_INCARNATE_NAME_RU}: кости Скрытой атаки — минимумы 1 и 2 считаются как 3`,
      }
    }
    return {
      ok: true,
      resources: list,
      message: `${DREAD_INCARNATE_NAME_RU}: Головорез (+1 Кровожадность на коротком) и Убийственный замысел`,
    }
  }

  if (fid === DREAD_ALLEGIANCE_FEATURE_ID) {
    return {
      ok: true,
      resources: list,
      message: `${DREAD_ALLEGIANCE_NAME_RU}: сопротивление и заговор по выбранному божеству (ИНТ)`,
    }
  }

  if (fid === WHISPERS_OF_THE_DEAD_FEATURE_ID) {
    return {
      ok: true,
      resources: list,
      message: `${WHISPERS_OF_THE_DEAD_NAME_RU}: выберите временное владение навыком или инструментом на отдыхе`,
    }
  }

  if (fid === DEATHS_FRIEND_FEATURE_ID) {
    if (mode === 'wails_both') {
      return applyRogueBook2024FeatureUse({
        ...input,
        featureId: WAILS_FROM_THE_GRAVE_FEATURE_ID,
        mode: 'wails_both',
      })
    }
    return {
      ok: true,
      resources: grantTokenOnInitiativeIfEmpty2024(list),
      message: `${DEATHS_FRIEND_NAME_RU}: Скорбный вой / Притяжение смерти`,
    }
  }

  if (fid === STRIKE_FEAR_FEATURE_ID) {
    return {
      ok: true,
      resources: list,
      message: `${STRIKE_FEAR_NAME_RU}: вариант Хитрого удара (1к6) — спас Мудр. или Испуганный`,
    }
  }

  if (fid === AURA_OF_MALEVOLENCE_FEATURE_ID) {
    const intMod = Math.max(0, abilityMod(input.intScore ?? 10))
    return {
      ok: true,
      resources: list,
      message: `${AURA_OF_MALEVOLENCE_NAME_RU}: ${intMod} урона типа преданности в 10 фт. (игнор сопротивления)`,
    }
  }

  return { ok: false, resources: list, message: 'Неизвестное умение книжного плута' }
}
