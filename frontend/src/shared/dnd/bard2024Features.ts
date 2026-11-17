/**
 * Bard 2024 (PHB): Bardic Inspiration (BI), Jack of All Trades, Expertise (2 / 9), Font of
 * Inspiration, Countercharm, Magical Secrets, Superior Inspiration, Words of Creation and the
 * four PHB colleges (Dance, Glamour, Lore, Valor).
 *
 * Callers branch on `rules_edition === '2024'`; nothing here feeds the 2014 pack
 * (`bard_2014.json`, «Песнь отдыха», Компетентность 3/10, «Контрчары» действием на 6-м,
 * «Магические тайны» 10/14/18, «Превосходное вдохновение» на 20-м).
 * Names follow the accepted decision of 17.11.2026 (2014 analogue where one exists).
 */

import type { FeatureChoiceDef } from './classFeatures'
import {
  getFeatureChoicePickList,
  getFeaturePick,
  setFeaturePick,
  type FeaturePicksState,
} from './featurePicks'
import { findFeatureResource, parseFeatureResourceId, spendRemaining } from './featureResources'
import { clampResource, type SheetResource } from './rest'
import type { SpellSlotState } from './spells'

/* ------------------------------------------------------------------ */
/* Names (RU, accepted)                                                */
/* ------------------------------------------------------------------ */

export const BARDIC_INSPIRATION_NAME_RU = 'Бардовское вдохновение'
export const SPELLCASTING_NAME_RU_2024 = 'Сотворение заклинаний'
export const JACK_OF_ALL_TRADES_NAME_RU = 'Мастер на все руки'
export const EXPERTISE_NAME_RU = 'Компетентность'
export const FONT_OF_INSPIRATION_NAME_RU = 'Источник вдохновения'
export const COUNTERCHARM_NAME_RU = 'Контрчары'
export const MAGICAL_SECRETS_NAME_RU = 'Магические тайны'
export const SUPERIOR_INSPIRATION_NAME_RU = 'Превосходное вдохновение'
export const WORDS_OF_CREATION_NAME_RU = 'Слова Творения'
export const SONG_OF_REST_NAME_RU_2014 = 'Песнь отдыха'

export const COLLEGE_OF_DANCE_NAME_RU = 'Коллегия танца'
export const COLLEGE_OF_GLAMOUR_NAME_RU = 'Коллегия очарования'
export const COLLEGE_OF_LORE_NAME_RU = 'Коллегия знаний'
export const COLLEGE_OF_VALOR_NAME_RU = 'Коллегия доблести'

export const DAZZLING_FOOTWORK_NAME_RU = 'Ослепительные фуэте'
export const DANCE_VIRTUOSO_NAME_RU = 'Виртуоз танца'
export const DANCE_UNARMORED_DEFENSE_NAME_RU = 'Защита без доспехов'
export const AGILE_STRIKES_NAME_RU = 'Ловкие выпады'
export const BARDIC_DAMAGE_NAME_RU = 'Бардовский урон'
export const INSPIRING_MOVEMENT_NAME_RU = 'Вдохновляющие движения'
export const TANDEM_FOOTWORK_NAME_RU = 'Совместный танец'
export const LEADING_EVASION_NAME_RU = 'Ведущее уклонение'

export const BEGUILING_MAGIC_NAME_RU = 'Чарующая магия'
export const MANTLE_OF_INSPIRATION_NAME_RU = 'Мантия вдохновения'
export const MANTLE_OF_MAJESTY_NAME_RU = 'Мантия величия'
export const UNBREAKABLE_MAJESTY_NAME_RU = 'Несокрушимое величие'

export const LORE_BONUS_PROFICIENCIES_NAME_RU = 'Доп. владения'
export const CUTTING_WORDS_NAME_RU = 'Острые слова'
export const MAGICAL_DISCOVERIES_NAME_RU = 'Доп. магические тайны'
export const PEERLESS_SKILL_NAME_RU = 'Бесподобный навык'

export const COMBAT_INSPIRATION_NAME_RU = 'Боевое вдохновение'
export const VALOR_BONUS_PROFICIENCIES_NAME_RU = 'Доп. владения'
export const VALOR_EXTRA_ATTACK_NAME_RU = 'Доп. атака'
export const BATTLE_MAGIC_NAME_RU = 'Боевая магия'

/* ------------------------------------------------------------------ */
/* Ids                                                                 */
/* ------------------------------------------------------------------ */

export const BARD_CLASS_SLUG_2024 = 'bard'

export const BARDIC_INSPIRATION_FEATURE_ID = 'bardic-inspiration'
export const JACK_OF_ALL_TRADES_FEATURE_ID = 'jack-of-all-trades'
export const EXPERTISE_FEATURE_ID = 'expertise'
export const EXPERTISE_9_FEATURE_ID = 'expertise-9'
export const FONT_OF_INSPIRATION_FEATURE_ID = 'font-of-inspiration'
export const COUNTERCHARM_FEATURE_ID = 'countercharm'
export const MAGICAL_SECRETS_FEATURE_ID = 'magical-secrets'
export const SUPERIOR_INSPIRATION_FEATURE_ID = 'superior-inspiration'
export const WORDS_OF_CREATION_FEATURE_ID = 'words-of-creation'

/** Only the four PHB 2024 colleges are in the pack UI. */
export const BARD_SUBCLASS_SLUGS_2024 = {
  lore: 'bard__lore',
  valor: 'bard__valor',
  glamour: 'bard__glamour',
  dance: 'bard__dance',
} as const

export const BARD_PACK_SUBCLASS_SLUGS_2024: readonly string[] = Object.values(
  BARD_SUBCLASS_SLUGS_2024,
)

export const BARDIC_INSPIRATION_POOL_ID = 'bardic_inspiration'
export const BEGUILING_MAGIC_POOL_ID = 'beguiling_magic'
export const MANTLE_OF_MAJESTY_POOL_ID = 'mantle_of_majesty'
export const UNBREAKABLE_MAJESTY_POOL_ID = 'unbreakable_majesty'

export const BARD_SUBCLASS_MIN_LEVEL_2024 = 3
export const JACK_OF_ALL_TRADES_MIN_LEVEL_2024 = 2
export const EXPERTISE_MIN_LEVEL_2024 = 2
export const EXPERTISE_9_MIN_LEVEL_2024 = 9
export const FONT_OF_INSPIRATION_MIN_LEVEL_2024 = 5
export const COUNTERCHARM_MIN_LEVEL_2024 = 7
export const MAGICAL_SECRETS_MIN_LEVEL_2024 = 10
export const SUPERIOR_INSPIRATION_MIN_LEVEL_2024 = 18
export const WORDS_OF_CREATION_MIN_LEVEL_2024 = 20
export const SUBCLASS_L6_2024 = 6
export const SUBCLASS_L14_2024 = 14

export const BI_DURATION_HOURS_2024 = 1
export const BI_RANGE_FT_2024 = 60
export const COUNTERCHARM_RANGE_FT_2024 = 30
export const WORDS_OF_CREATION_SECOND_TARGET_FT_2024 = 10
export const SUPERIOR_INSPIRATION_FLOOR_2024 = 2

/* ------------------------------------------------------------------ */
/* Helpers / gate                                                      */
/* ------------------------------------------------------------------ */

function lvl(value: number): number {
  return Math.max(0, Math.floor(value || 0))
}

export function isBardClassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return key === BARD_CLASS_SLUG_2024 || /бард/.test(key)
}

export function isBardPackSubclass2024(slug: string | null | undefined): boolean {
  return Boolean(slug && BARD_PACK_SUBCLASS_SLUGS_2024.includes(slug))
}

function abilityModOf(score: number | undefined): number {
  return Math.floor(((score ?? 10) - 10) / 2)
}

/** Class table «Подготовленные заклинания» (SRD 5.2.1 / next.dnd.su). */
export const BARD_PREPARED_COLUMN_2024: readonly number[] = [
  4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22,
]

/** Cantrips known from the 2024 bard table (2 → 3 at 4, → 4 at 10). */
export function bardCantrips2024(bardLevel: number): number {
  const level = Math.min(20, lvl(bardLevel))
  if (level >= 10) return 4
  if (level >= 4) return 3
  return 2
}

export function bardPreparedSpells2024(bardLevel: number): number {
  const level = Math.min(20, lvl(bardLevel))
  return level < 1 ? 0 : BARD_PREPARED_COLUMN_2024[level - 1]!
}

/* ------------------------------------------------------------------ */
/* Bardic Inspiration                                                  */
/* ------------------------------------------------------------------ */

/** d6 → d8 (5) → d10 (10) → d12 (15). */
export function bardicInspirationDieSides2024(bardLevel: number): 6 | 8 | 10 | 12 {
  const level = lvl(bardLevel)
  if (level >= 15) return 12
  if (level >= 10) return 10
  if (level >= 5) return 8
  return 6
}

export function bardicInspirationDieLabelRu2024(bardLevel: number): string {
  return `1к${bardicInspirationDieSides2024(bardLevel)}`
}

/** Uses = Charisma modifier (minimum 1). */
export function bardicInspirationMaxUses2024(chaScore: number | undefined): number {
  return Math.max(1, abilityModOf(chaScore))
}

export type BiGrantCheck2024 = { ok: true } | { ok: false; reasonRu: string }

/**
 * 2024 grant: bonus action, another creature within 60 ft that can see or hear the bard,
 * and it holds at most one BI die at a time.
 */
export function checkBardicInspirationGrant2024(input: {
  targetIsSelf: boolean
  targetHasBardicDie: boolean
  targetInRange?: boolean
  targetCanSeeOrHear?: boolean
  poolLeft: number
}): BiGrantCheck2024 {
  if (input.targetIsSelf) {
    return { ok: false, reasonRu: 'Бардовское вдохновение нельзя даровать себе — выбери другое существо' }
  }
  if (input.targetInRange === false) {
    return { ok: false, reasonRu: `Цель дальше ${BI_RANGE_FT_2024} фт.` }
  }
  if (input.targetCanSeeOrHear === false) {
    return { ok: false, reasonRu: 'Цель не видит и не слышит барда' }
  }
  if (input.targetHasBardicDie) {
    return { ok: false, reasonRu: 'У цели уже есть кость Бардовского вдохновения (не больше одной)' }
  }
  if (input.poolLeft <= 0) {
    return { ok: false, reasonRu: 'Использования Бардовского вдохновения закончились' }
  }
  return { ok: true }
}

export const BI_SPEND_RULE_RU_2024 =
  'В течение 1 часа: если существо провалило Тест к20, оно один раз бросает кость и прибавляет результат — это может сменить провал на успех.'

/* ------------------------------------------------------------------ */
/* Jack of All Trades                                                  */
/* ------------------------------------------------------------------ */

export function bardHasJackOfAllTrades2024(bardLevel: number): boolean {
  return lvl(bardLevel) >= JACK_OF_ALL_TRADES_MIN_LEVEL_2024
}

/** Half PB (floor) to untrained **skill** checks only — never initiative, tools or bare checks. */
export function jackOfAllTradesBonus2024(input: {
  bardLevel: number
  proficiencyBonus: number
  isSkillCheck: boolean
  skillProficient: boolean
  skillExpertise?: boolean
  isInitiative?: boolean
}): number {
  if (!bardHasJackOfAllTrades2024(input.bardLevel)) return 0
  if (!input.isSkillCheck || input.isInitiative) return 0
  if (input.skillProficient || input.skillExpertise) return 0
  return Math.floor(Math.max(0, input.proficiencyBonus) / 2)
}

/* ------------------------------------------------------------------ */
/* Expertise (2 and 9)                                                 */
/* ------------------------------------------------------------------ */

export const EXPERTISE_PICKS_PER_FEATURE_2024 = 2

export const expertiseChoice2024: FeatureChoiceDef = {
  id: 'expertise',
  label_ru: EXPERTISE_NAME_RU,
  options_from: 'expertise_skills_tools',
  max_picks: EXPERTISE_PICKS_PER_FEATURE_2024,
}

/** Own choice id for the level-9 pair so its picks never fall back to the level-2 key. */
export const expertise9Choice2024: FeatureChoiceDef = {
  ...expertiseChoice2024,
  id: 'expertise_9',
}

/** Feature id (as in the unlocked-feature list) that owns each Expertise pair. */
export function expertiseFeatureIdForLevel2024(featureLevel: number): string {
  return featureLevel >= EXPERTISE_9_MIN_LEVEL_2024 ? 'expertise_9' : 'expertise'
}

export const EXPERTISE_FEATURE_KEYS_2024 = [
  { featureId: 'expertise', level: EXPERTISE_MIN_LEVEL_2024 },
  { featureId: 'expertise_9', level: EXPERTISE_9_MIN_LEVEL_2024 },
] as const

/** Skills the bard must have picked in total at this bard level (0 / 2 / 4). */
export function expertiseSkillsTotal2024(bardLevel: number): number {
  const level = lvl(bardLevel)
  if (level >= EXPERTISE_9_MIN_LEVEL_2024) return EXPERTISE_PICKS_PER_FEATURE_2024 * 2
  if (level >= EXPERTISE_MIN_LEVEL_2024) return EXPERTISE_PICKS_PER_FEATURE_2024
  return 0
}

export function expertisePicksOutstanding2024(input: {
  bardLevel: number
  featurePicks: FeaturePicksState
  classEntryId: string
}): Array<{ featureId: string; need: number; have: number; level: number }> {
  const out: Array<{ featureId: string; need: number; have: number; level: number }> = []
  for (const row of EXPERTISE_FEATURE_KEYS_2024) {
    if (lvl(input.bardLevel) < row.level) continue
    const have = getFeatureChoicePickList(
      input.featurePicks,
      input.classEntryId,
      row.featureId,
      row.featureId,
    ).length
    if (have < EXPERTISE_PICKS_PER_FEATURE_2024) {
      out.push({
        featureId: row.featureId,
        need: EXPERTISE_PICKS_PER_FEATURE_2024 - have,
        have,
        level: row.level,
      })
    }
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Magical Secrets (10)                                                */
/* ------------------------------------------------------------------ */

export const MAGICAL_SECRETS_LISTS_2024 = ['bard', 'wizard', 'druid', 'cleric'] as const
export type SpellListId2024 = (typeof MAGICAL_SECRETS_LISTS_2024)[number]

export const MAGICAL_SECRETS_LISTS_RU_2024: Record<SpellListId2024, string> = {
  bard: 'Барда',
  wizard: 'Волшебника',
  druid: 'Друида',
  cleric: 'Жреца',
}

/** Levels where the prepared column grows and the bard has Magical Secrets (10+). */
export const MAGICAL_SECRETS_GROWTH_LEVELS_2024: readonly number[] = [10, 11, 13, 15, 17, 18, 19, 20]

export function preparedColumnGrowsAtLevel2024(bardLevel: number): boolean {
  const level = Math.min(20, lvl(bardLevel))
  if (level < 2) return false
  return bardPreparedSpells2024(level) > bardPreparedSpells2024(level - 1)
}

export function hasMagicalSecrets2024(bardLevel: number): boolean {
  return lvl(bardLevel) >= MAGICAL_SECRETS_MIN_LEVEL_2024
}

/**
 * Spell lists a new / replacement prepared spell may come from.
 * New picks: four lists only when the column grew at this level and the bard has the feature.
 * Replacements (one per bard level gained): four lists from level 10.
 */
export function magicalSecretsEligibleLists2024(input: {
  bardLevel: number
  kind: 'new' | 'replace'
}): SpellListId2024[] {
  if (!hasMagicalSecrets2024(input.bardLevel)) return ['bard']
  if (input.kind === 'new' && !preparedColumnGrowsAtLevel2024(input.bardLevel)) return ['bard']
  return [...MAGICAL_SECRETS_LISTS_2024]
}

export function magicalSecretsPickerHintRu2024(input: {
  bardLevel: number
  kind: 'new' | 'replace'
}): string {
  const lists = magicalSecretsEligibleLists2024(input)
  if (lists.length === 1) return 'Список Барда'
  return `Списки: ${lists.map((id) => MAGICAL_SECRETS_LISTS_RU_2024[id]).join(', ')} — считаются заклинаниями Барда`
}

/**
 * Spells a bard may hold outside the Bard list. Each bard level from 10 opens one replacement,
 * and every level where the prepared column grows opens one more (new) pick.
 */
export function magicalSecretsOffListCap2024(bardLevel: number): number {
  const level = Math.min(20, lvl(bardLevel))
  let cap = 0
  for (let at = MAGICAL_SECRETS_MIN_LEVEL_2024; at <= level; at += 1) {
    cap += 1 + (preparedColumnGrowsAtLevel2024(at) ? 1 : 0)
  }
  return cap
}

export function magicalSecretsOffListHintRu2024(input: {
  bardLevel: number
  used: number
  swapAvailable: boolean
}): string {
  const cap = magicalSecretsOffListCap2024(input.bardLevel)
  if (cap <= 0) return 'Список Барда (Магические тайны с 10 уровня)'
  const kind: 'new' | 'replace' = preparedColumnGrowsAtLevel2024(input.bardLevel) ? 'new' : 'replace'
  const lists = magicalSecretsPickerHintRu2024({ bardLevel: input.bardLevel, kind })
  const swap = input.swapAvailable ? 'замена на этом уровне доступна' : 'замена на этом уровне использована'
  return `${MAGICAL_SECRETS_NAME_RU}: ${lists}. Вне списка Барда ${input.used}/${cap}; ${swap}`
}

/* ------------------------------------------------------------------ */
/* Prepared list: one replacement per bard level (no free long-rest rebuild) */
/* ------------------------------------------------------------------ */

/** Feature pick that records the bard level at which the prepared replacement was used. */
export const BARD_PREPARED_SWAP_PICK_ID_2024 = 'prepared_swap'
/** Same for the College of Lore discoveries replacement. */
export const BARD_DISCOVERIES_SWAP_PICK_ID_2024 = 'discoveries_swap'
/** One cantrip replacement per bard level gained (2024 sheet). */
export const BARD_CANTRIP_SWAP_PICK_ID_2024 = 'cantrip_swap'

/** Bard prepares from a fixed list; a long rest never rebuilds it (cleric / druid / wizard do). */
export const BARD_LONG_REST_REBUILDS_PREPARED_2024 = false

export const BARD_PREPARED_SWAP_RULE_RU_2024 =
  'Барду можно заменить одно подготовленное заклинание при получении уровня барда (длинный отдых список не пересобирает)'

export const BARD_CANTRIP_SWAP_RULE_RU_2024 =
  'Барду можно заменить один заговор при получении уровня барда'

export type BardSwapToken2024 = { level: number; releasedKey: string }

export function parseBardSwapToken2024(raw: string | null | undefined): BardSwapToken2024 | null {
  const text = (raw ?? '').trim()
  if (!text) return null
  const at = text.indexOf(':')
  const level = Number(at < 0 ? text : text.slice(0, at))
  if (!Number.isFinite(level) || level <= 0) return null
  return { level: Math.floor(level), releasedKey: at < 0 ? '' : text.slice(at + 1) }
}

export function formatBardSwapToken2024(level: number, releasedKey: string): string {
  return `${lvl(level)}:${releasedKey}`
}

/** The replacement is open until it is spent at the current bard level. */
export function bardSwapAvailable2024(raw: string | null | undefined, bardLevel: number): boolean {
  const token = parseBardSwapToken2024(raw)
  return !token || token.level !== lvl(bardLevel)
}

export type BardPreparedRow2024 = {
  id: string
  level: number
  prepared: boolean
  catalog_id?: string | null
  class_slug?: string | null
  prepared_locked?: boolean
  source_kind?: string | null
}

export function bardPreparedKey2024(row: Pick<BardPreparedRow2024, 'id' | 'catalog_id'>): string {
  return row.catalog_id || row.id
}

/** Rows that spend the bard prepared column (leveled, prepared, not granted / locked). */
export function isBardPreparedBudgetRow2024(
  row: BardPreparedRow2024,
  defaultClassSlug: string | null = BARD_CLASS_SLUG_2024,
): boolean {
  if (row.level <= 0 || !row.prepared || row.prepared_locked) return false
  if (row.source_kind && row.source_kind !== 'catalog' && row.source_kind !== 'custom') return false
  const slug = (row.class_slug ?? defaultClassSlug ?? '').trim().toLowerCase()
  return slug === BARD_CLASS_SLUG_2024
}

export type BardPreparedChange2024 =
  | { ok: true; swapRaw: string | null }
  | { ok: false; reasonRu: string }

/**
 * Validate one edit of the bard prepared list.
 * - New picks are free while the list is under the column; they may be off-list only within
 *   the Magical Secrets cap.
 * - Dropping a prepared spell spends the single replacement of the current bard level; the
 *   spell dropped last can be taken back to refund it. Over-cap lists (level down) trim freely.
 */
export function evaluateBardPreparedChange2024(input: {
  prev: BardPreparedRow2024[]
  next: BardPreparedRow2024[]
  bardLevel: number
  maxPrepared: number | null
  swapRaw: string | null
  isOffList: (row: BardPreparedRow2024) => boolean
  defaultClassSlug?: string | null
}): BardPreparedChange2024 {
  const level = lvl(input.bardLevel)
  const slug = input.defaultClassSlug ?? BARD_CLASS_SLUG_2024
  const pick = (rows: BardPreparedRow2024[]) =>
    new Map(
      rows
        .filter((row) => isBardPreparedBudgetRow2024(row, slug))
        .map((row) => [bardPreparedKey2024(row), row] as const),
    )
  const before = pick(input.prev)
  const after = pick(input.next)
  const removed = [...before.keys()].filter((key) => !after.has(key))
  const added = [...after.keys()].filter((key) => !before.has(key))
  if (removed.length === 0 && added.length === 0) return { ok: true, swapRaw: input.swapRaw }

  const offAfter = [...after.values()].filter((row) => input.isOffList(row)).length
  const offBefore = [...before.values()].filter((row) => input.isOffList(row)).length
  const cap = magicalSecretsOffListCap2024(level)
  if (offAfter > offBefore && offAfter > cap) {
    return {
      ok: false,
      reasonRu:
        cap <= 0
          ? `${MAGICAL_SECRETS_NAME_RU} открываются с ${MAGICAL_SECRETS_MIN_LEVEL_2024} уровня барда — пока только список Барда`
          : `Вне списка Барда уже ${offBefore}/${cap}: новый выбор из списков Волшебника, Друида и Жреца откроется на следующем уровне барда`,
    }
  }
  if (input.maxPrepared != null && after.size > input.maxPrepared && after.size > before.size) {
    return { ok: false, reasonRu: `Лимит подготовки барда: ${before.size}/${input.maxPrepared}` }
  }

  const overCap = input.maxPrepared != null && before.size > input.maxPrepared
  if (removed.length === 0) {
    const token = parseBardSwapToken2024(input.swapRaw)
    if (token && token.level === level && token.releasedKey && added.includes(token.releasedKey)) {
      return { ok: true, swapRaw: null }
    }
    return { ok: true, swapRaw: input.swapRaw }
  }
  if (overCap && after.size >= (input.maxPrepared ?? 0)) return { ok: true, swapRaw: input.swapRaw }
  if (removed.length > 1) {
    return { ok: false, reasonRu: BARD_PREPARED_SWAP_RULE_RU_2024 }
  }
  if (!bardSwapAvailable2024(input.swapRaw, level)) {
    return {
      ok: false,
      reasonRu: `Замена на ${level} уровне барда уже использована. ${BARD_PREPARED_SWAP_RULE_RU_2024}`,
    }
  }
  return { ok: true, swapRaw: formatBardSwapToken2024(level, removed[0]!) }
}

/** Long rest touches resources and slots only; the bard prepared list is returned as is. */
export function bardPreparedAfterLongRest2024<T>(known: T[]): T[] {
  return BARD_LONG_REST_REBUILDS_PREPARED_2024 ? [] : known
}

export type BardCantripRow2024 = {
  id: string
  level: number
  catalog_id?: string | null
  class_slug?: string | null
  prepared_locked?: boolean
  source_kind?: string | null
}

export function bardCantripKey2024(row: Pick<BardCantripRow2024, 'id' | 'catalog_id'>): string {
  return row.catalog_id || row.id
}

/** Cantrips that spend the bard cantrip column (not granted / locked). */
export function isBardCantripBudgetRow2024(
  row: BardCantripRow2024,
  defaultClassSlug: string | null = BARD_CLASS_SLUG_2024,
): boolean {
  if (row.level > 0 || row.prepared_locked) return false
  if (row.source_kind && row.source_kind !== 'catalog' && row.source_kind !== 'custom') return false
  const slug = (row.class_slug ?? defaultClassSlug ?? '').trim().toLowerCase()
  return slug === BARD_CLASS_SLUG_2024 || slug === ''
}

/**
 * One cantrip replacement per bard level gained — same token model as prepared_swap.
 * New cantrips are free while under the column; dropping one spends the level token.
 */
export function evaluateBardCantripChange2024(input: {
  prev: BardCantripRow2024[]
  next: BardCantripRow2024[]
  bardLevel: number
  maxCantrips: number | null
  swapRaw: string | null
  defaultClassSlug?: string | null
}): BardPreparedChange2024 {
  const level = lvl(input.bardLevel)
  const slug = input.defaultClassSlug ?? BARD_CLASS_SLUG_2024
  const pick = (rows: BardCantripRow2024[]) =>
    new Map(
      rows
        .filter((row) => isBardCantripBudgetRow2024(row, slug))
        .map((row) => [bardCantripKey2024(row), row] as const),
    )
  const before = pick(input.prev)
  const after = pick(input.next)
  const removed = [...before.keys()].filter((key) => !after.has(key))
  const added = [...after.keys()].filter((key) => !before.has(key))
  if (removed.length === 0 && added.length === 0) return { ok: true, swapRaw: input.swapRaw }

  if (input.maxCantrips != null && after.size > input.maxCantrips && after.size > before.size) {
    return { ok: false, reasonRu: `Лимит заговоров барда: ${before.size}/${input.maxCantrips}` }
  }

  const overCap = input.maxCantrips != null && before.size > input.maxCantrips
  if (removed.length === 0) {
    const token = parseBardSwapToken2024(input.swapRaw)
    if (token && token.level === level && token.releasedKey && added.includes(token.releasedKey)) {
      return { ok: true, swapRaw: null }
    }
    return { ok: true, swapRaw: input.swapRaw }
  }
  if (overCap && after.size >= (input.maxCantrips ?? 0)) return { ok: true, swapRaw: input.swapRaw }
  if (removed.length > 1) {
    return { ok: false, reasonRu: BARD_CANTRIP_SWAP_RULE_RU_2024 }
  }
  if (!bardSwapAvailable2024(input.swapRaw, level)) {
    return {
      ok: false,
      reasonRu: `Замена заговора на ${level} уровне барда уже использована. ${BARD_CANTRIP_SWAP_RULE_RU_2024}`,
    }
  }
  return { ok: true, swapRaw: formatBardSwapToken2024(level, removed[0]!) }
}

/* ------------------------------------------------------------------ */
/* Font of Inspiration (5)                                             */
/* ------------------------------------------------------------------ */

export function hasFontOfInspiration2024(bardLevel: number): boolean {
  return lvl(bardLevel) >= FONT_OF_INSPIRATION_MIN_LEVEL_2024
}

/** Short rest returns the whole BI pool only from level 5; before that only a long rest does. */
export function biShortRestRestoresAll2024(bardLevel: number): boolean {
  return hasFontOfInspiration2024(bardLevel)
}

export type FontSlotSpendResult2024 =
  | {
      ok: true
      slots: Record<string, SpellSlotState>
      resources: SheetResource[]
      feedLineRu: string
    }
  | { ok: false; message: string }

/** Spend one expended-free slot of any circle (no action) → regain one BI use. */
export function fontOfInspirationSlotToUse2024(input: {
  bardLevel: number
  slotLevel: number
  slots: Record<string, SpellSlotState>
  resources: SheetResource[]
  classEntryId: string
}): FontSlotSpendResult2024 {
  if (!hasFontOfInspiration2024(input.bardLevel)) {
    return { ok: false, message: `${FONT_OF_INSPIRATION_NAME_RU} с 5 уровня барда` }
  }
  const pool = findBiPool2024(input.resources, input.classEntryId)
  if (!pool) return { ok: false, message: `Ресурс «${BARDIC_INSPIRATION_NAME_RU}» не найден` }
  if (pool.used <= 0) {
    return { ok: false, message: 'Все использования Бардовского вдохновения уже доступны' }
  }
  const key = String(Math.floor(input.slotLevel))
  const slot = input.slots[key]
  if (!slot || slot.max <= 0 || slot.used >= slot.max) {
    return { ok: false, message: `Нет свободной ячейки ${key} круга` }
  }
  return {
    ok: true,
    slots: { ...input.slots, [key]: { ...slot, used: slot.used + 1 } },
    resources: input.resources.map((row) =>
      row.id === pool.id ? clampResource({ ...row, used: Math.max(0, row.used - 1) }) : row,
    ),
    feedLineRu: `${FONT_OF_INSPIRATION_NAME_RU}: ячейка ${key} круга → +1 использование Бардовского вдохновения (без действия)`,
  }
}

export function findBiPool2024(
  resources: SheetResource[],
  classEntryId?: string,
): SheetResource | null {
  if (classEntryId) {
    const found = findFeatureResource(resources, BARD_CLASS_SLUG_2024, BARDIC_INSPIRATION_POOL_ID, classEntryId)
    if (found) return found
  }
  return (
    resources.find((row) => {
      const parsed = parseFeatureResourceId(row.id)
      return parsed?.classSlug === BARD_CLASS_SLUG_2024 && parsed.poolId === BARDIC_INSPIRATION_POOL_ID
    }) ?? null
  )
}

/* ------------------------------------------------------------------ */
/* Superior Inspiration (18)                                           */
/* ------------------------------------------------------------------ */

/** Top-up to two uses on Initiative when below two (0→2, 1→2, ≥2 nothing). Not 2014 «0 → +1». */
export function superiorInspirationRestoreAmount2024(input: {
  bardLevel: number
  max: number
  used: number
}): number {
  if (lvl(input.bardLevel) < SUPERIOR_INSPIRATION_MIN_LEVEL_2024) return 0
  const max = Math.max(0, Math.floor(input.max))
  const left = Math.max(0, max - Math.max(0, Math.floor(input.used)))
  const target = Math.min(SUPERIOR_INSPIRATION_FLOOR_2024, max)
  return Math.max(0, target - left)
}

export type SuperiorInspirationResult2024 = {
  ok: boolean
  resources: SheetResource[]
  restored: number
  message: string
}

export function applySuperiorInspirationOnInitiative2024(input: {
  bardLevel: number
  resources: SheetResource[]
  classEntryId?: string
}): SuperiorInspirationResult2024 {
  if (lvl(input.bardLevel) < SUPERIOR_INSPIRATION_MIN_LEVEL_2024) {
    return { ok: false, resources: input.resources, restored: 0, message: '' }
  }
  const pool = findBiPool2024(input.resources, input.classEntryId)
  if (!pool) return { ok: false, resources: input.resources, restored: 0, message: '' }
  const restored = superiorInspirationRestoreAmount2024({
    bardLevel: input.bardLevel,
    max: pool.max,
    used: pool.used,
  })
  if (restored <= 0) return { ok: false, resources: input.resources, restored: 0, message: '' }
  return {
    ok: true,
    restored,
    resources: input.resources.map((row) =>
      row.id === pool.id
        ? clampResource({ ...row, used: Math.max(0, row.used - restored) })
        : row,
    ),
    message: `${SUPERIOR_INSPIRATION_NAME_RU}: инициатива — +${restored} исп. Бардовского вдохновения (теперь ${Math.max(0, spendRemaining(pool) + restored)})`,
  }
}

/* ------------------------------------------------------------------ */
/* Words of Creation (20)                                              */
/* ------------------------------------------------------------------ */

export const WORDS_OF_CREATION_SPELLS_2024 = ['power-word-heal', 'power-word-kill'] as const

export const WORDS_OF_CREATION_SPELL_NAMES_RU_2024: Record<string, string> = {
  'power-word-heal': 'Слово силы: исцеление',
  'power-word-kill': 'Слово силы: смерть',
}

export function wordsOfCreationAlwaysPrepared2024(bardLevel: number): string[] {
  return lvl(bardLevel) >= WORDS_OF_CREATION_MIN_LEVEL_2024 ? [...WORDS_OF_CREATION_SPELLS_2024] : []
}

export function isWordsOfCreationSpell2024(spellSlug: string | null | undefined): boolean {
  return (WORDS_OF_CREATION_SPELLS_2024 as readonly string[]).includes(
    (spellSlug ?? '').trim().toLowerCase().replace(/_/g, '-'),
  )
}

/**
 * Resolve Power Word Heal/Kill from a sheet row.
 * `catalog_id` is often a UUID; `id` may be `feature-spell:…:power-word-heal`.
 */
export function resolveWordsOfCreationSpellSlug2024(spell: {
  id?: string | null
  name?: string | null
  catalog_id?: string | null
  slug?: string | null
}): string {
  const name = (spell.name ?? '').trim().toLowerCase()
  for (const [slug, ru] of Object.entries(WORDS_OF_CREATION_SPELL_NAMES_RU_2024)) {
    if (name === ru.toLowerCase()) return slug
  }
  for (const raw of [spell.slug, spell.catalog_id, spell.id]) {
    const s = String(raw ?? '')
      .trim()
      .toLowerCase()
      .replace(/_/g, '-')
    if (!s) continue
    if (isWordsOfCreationSpell2024(s)) return s
    const tail = s.includes(':') ? (s.split(':').pop() ?? '') : s
    if (isWordsOfCreationSpell2024(tail)) return tail
  }
  return ''
}

export const WORDS_OF_CREATION_SECOND_TARGET_NOTE_RU_2024 = `${WORDS_OF_CREATION_NAME_RU}: можно выбрать вторую цель в ${WORDS_OF_CREATION_SECOND_TARGET_FT_2024} фт. от первой`

export function wordsOfCreationSecondTarget2024(input: {
  bardLevel: number
  spellSlug: string | null | undefined
  secondTargetDistanceFt?: number | null
}): { available: boolean; reasonRu: string } {
  if (lvl(input.bardLevel) < WORDS_OF_CREATION_MIN_LEVEL_2024) {
    return { available: false, reasonRu: `${WORDS_OF_CREATION_NAME_RU} с 20 уровня барда` }
  }
  if (!isWordsOfCreationSpell2024(input.spellSlug)) {
    return { available: false, reasonRu: 'Только для «Слово силы: исцеление» и «Слово силы: смерть»' }
  }
  if (
    input.secondTargetDistanceFt != null &&
    input.secondTargetDistanceFt > WORDS_OF_CREATION_SECOND_TARGET_FT_2024
  ) {
    return {
      available: false,
      reasonRu: `Вторая цель дальше ${WORDS_OF_CREATION_SECOND_TARGET_FT_2024} фт. от первой`,
    }
  }
  return { available: true, reasonRu: '' }
}

/* ------------------------------------------------------------------ */
/* Countercharm (7)                                                    */
/* ------------------------------------------------------------------ */

export const COUNTERCHARM_BUTTON_2024 = {
  featureId: COUNTERCHARM_FEATURE_ID,
  label: 'Контрчары…',
  kind: 'reaction',
  minLevel: COUNTERCHARM_MIN_LEVEL_2024,
  rangeFt: COUNTERCHARM_RANGE_FT_2024,
  costsInspiration: false,
  rerollWithAdvantage: true,
  triggerRu: 'Ты или существо в 30 фт. провалило спасбросок против Очарованного или Испуганного',
} as const

/* ------------------------------------------------------------------ */
/* Colleges                                                            */
/* ------------------------------------------------------------------ */

/** Dance: unarmored AC 10 + Dex + Cha — off as soon as armor or a shield is worn. */
export function danceUnarmoredAc2024(input: {
  dexMod: number
  chaMod: number
  wearingArmor: boolean
  wearingShield: boolean
}): number | null {
  if (input.wearingArmor || input.wearingShield) return null
  return 10 + Math.floor(input.dexMod) + Math.floor(input.chaMod)
}

export function hasDazzlingFootwork2024(features: Array<{ id?: string }>): boolean {
  return features.some((row) => {
    const id = String(row.id || '')
    return id === 'dazzling_footwork' || id === 'dazzling-footwork'
  })
}

/** Competing AC formula for the sheet (armor and shield are filtered out by the caller). */
export function danceAcFormula2024(chaMod: number): {
  key: string
  label: string
  base: number
  dexCap: number | null
  allowsShield: boolean
} {
  return {
    key: 'dazzling_footwork',
    label: DANCE_UNARMORED_DEFENSE_NAME_RU,
    base: 10 + Math.floor(chaMod),
    dexCap: null,
    allowsShield: false,
  }
}

export function danceFootworkActive2024(input: {
  wearingArmor: boolean
  wearingShield: boolean
}): { active: boolean; reasonRu: string } {
  if (input.wearingArmor || input.wearingShield) {
    return {
      active: false,
      reasonRu: `${DAZZLING_FOOTWORK_NAME_RU} не работают в доспехе или со щитом`,
    }
  }
  return { active: true, reasonRu: '' }
}

/** Bardic Damage: unarmed strike bludgeoning = BI die + Dex mod (does not spend the pool). */
export function danceBardicDamageFormulaRu2024(bardLevel: number, dexMod: number): string {
  const mod = Math.floor(dexMod)
  const bonus = mod === 0 ? '' : mod > 0 ? `+${mod}` : `${mod}`
  return `${bardicInspirationDieLabelRu2024(bardLevel)}${bonus} дробящего (без траты вдохновения)`
}

/** Glamour Mantle of Inspiration: temp HP = twice the BI die roll (not 2014 5/8/11/14). */
export function glamourMantleTempHp2024(dieRoll: number): number {
  return Math.max(0, Math.floor(dieRoll)) * 2
}

export function glamourMantleTargets2024(chaScore: number | undefined): number {
  return Math.max(1, abilityModOf(chaScore))
}

export const LORE_BONUS_PROFICIENCY_SKILLS_2024 = 3
export const LORE_MAGICAL_DISCOVERIES_PICKS_2024 = 2
export const LORE_DISCOVERY_LISTS_2024 = ['wizard', 'druid', 'cleric'] as const

/** Highest spell circle a bard of this level can cast (cantrips always allowed). */
export function bardMaxSpellCircle2024(bardLevel: number): number {
  return Math.min(9, Math.ceil(Math.min(20, lvl(bardLevel)) / 2))
}

export const LORE_DISCOVERIES_FEATURE_ID_2024 = 'magical_discoveries'

export function isLoreSubclass2024(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return key === BARD_SUBCLASS_SLUGS_2024.lore || key === 'college_of_lore' || key === 'lore'
}

export function loreDiscoveriesActive2024(input: {
  bardLevel: number
  subclassSlug: string | null | undefined
}): boolean {
  return lvl(input.bardLevel) >= SUBCLASS_L6_2024 && isLoreSubclass2024(input.subclassSlug)
}

export function loreDiscoveriesOutstanding2024(input: {
  bardLevel: number
  subclassSlug: string | null | undefined
  picked: number
}): number {
  if (!loreDiscoveriesActive2024(input)) return 0
  return Math.max(0, LORE_MAGICAL_DISCOVERIES_PICKS_2024 - Math.max(0, Math.floor(input.picked)))
}

export type LoreDiscoveryToggle2024 =
  | { ok: true; swapRaw: string | null }
  | { ok: false; reasonRu: string }

/**
 * Toggle one Lore discovery. Two picks at level 6; afterwards one may be replaced per bard level
 * (the replaced spell can be taken back to refund the replacement).
 */
export function evaluateLoreDiscoveryToggle2024(input: {
  selected: string[]
  slug: string
  bardLevel: number
  swapRaw: string | null
}): LoreDiscoveryToggle2024 {
  const level = lvl(input.bardLevel)
  const token = parseBardSwapToken2024(input.swapRaw)
  const has = input.selected.includes(input.slug)
  if (!has) {
    if (input.selected.length >= LORE_MAGICAL_DISCOVERIES_PICKS_2024) {
      return {
        ok: false,
        reasonRu: `Уже выбрано ${LORE_MAGICAL_DISCOVERIES_PICKS_2024}. Снимите одно (замена раз в уровень барда), затем возьмите другое`,
      }
    }
    if (token && token.level === level && token.releasedKey === input.slug) {
      return { ok: true, swapRaw: null }
    }
    return { ok: true, swapRaw: input.swapRaw }
  }
  if (input.selected.length < LORE_MAGICAL_DISCOVERIES_PICKS_2024 && !token) {
    return { ok: true, swapRaw: null }
  }
  if (!bardSwapAvailable2024(input.swapRaw, level)) {
    return {
      ok: false,
      reasonRu: `${MAGICAL_DISCOVERIES_NAME_RU}: замена на ${level} уровне барда уже использована`,
    }
  }
  return { ok: true, swapRaw: formatBardSwapToken2024(level, input.slug) }
}

export function loreDiscoveryEligible2024(input: {
  bardLevel: number
  spellLevel: number
  spellClasses: readonly string[]
}): boolean {
  if (input.spellLevel > bardMaxSpellCircle2024(input.bardLevel)) return false
  return input.spellClasses.some((id) => (LORE_DISCOVERY_LISTS_2024 as readonly string[]).includes(id))
}

/** Peerless Skill: a failed check/attack — success spends a use, a still-failed roll spends none. */
export function peerlessSkillSpends2024(rollSucceededAfterDie: boolean): boolean {
  return rollSucceededAfterDie
}

/** Valor Bonus Proficiencies: martial weapons + medium armor + shields; never weapon mastery. */
export function valorMartialTrainingGrants2024(): {
  martialWeapons: true
  mediumArmor: true
  shields: true
  weaponMastery: false
} {
  return { martialWeapons: true, mediumArmor: true, shields: true, weaponMastery: false }
}

/** Valor Extra Attack: two attacks; one may be replaced by an action-time cantrip. */
export const VALOR_EXTRA_ATTACK_RULE_RU_2024 =
  'Действие Атака — две атаки; вместо одной можно сотворить заговор Барда со временем сотворения «действие».'

export const VALOR_COMBAT_INSPIRATION_MODES_2024 = [
  { id: 'defense', labelRu: 'КД (реакция)', reaction: true },
  { id: 'offense', labelRu: 'Урон атаки', reaction: false },
] as const

/* ------------------------------------------------------------------ */
/* Level-down helpers                                                  */
/* ------------------------------------------------------------------ */

export type BardLevelDownDrops2024 = {
  words_of_creation: boolean
  superior_inspiration: boolean
  magical_secrets: boolean
  expertise_9: boolean
  countercharm: boolean
  font_of_inspiration: boolean
  lore_discoveries: boolean
  subclass: boolean
  expertise_2: boolean
  jack_of_all_trades: boolean
}

/** What a bard loses when dropping to `newLevel` (20→19 words, 10→9 secrets, 3→2 subclass, …). */
export function bardLevelDownDrops2024(newLevel: number): BardLevelDownDrops2024 {
  const level = lvl(newLevel)
  return {
    words_of_creation: level < WORDS_OF_CREATION_MIN_LEVEL_2024,
    superior_inspiration: level < SUPERIOR_INSPIRATION_MIN_LEVEL_2024,
    magical_secrets: level < MAGICAL_SECRETS_MIN_LEVEL_2024,
    expertise_9: level < EXPERTISE_9_MIN_LEVEL_2024,
    countercharm: level < COUNTERCHARM_MIN_LEVEL_2024,
    font_of_inspiration: level < FONT_OF_INSPIRATION_MIN_LEVEL_2024,
    lore_discoveries: level < SUBCLASS_L6_2024,
    subclass: level < BARD_SUBCLASS_MIN_LEVEL_2024,
    expertise_2: level < EXPERTISE_MIN_LEVEL_2024,
    jack_of_all_trades: level < JACK_OF_ALL_TRADES_MIN_LEVEL_2024,
  }
}

/** Feature picks (by feature id) that no longer fit `newLevel`. */
export function bardPickFeatureIdsToDrop2024(newLevel: number): string[] {
  const drops = bardLevelDownDrops2024(newLevel)
  const out: string[] = []
  if (drops.expertise_9) out.push('expertise_9')
  if (drops.expertise_2) out.push('expertise')
  if (drops.lore_discoveries) out.push('magical_discoveries', BARD_DISCOVERIES_SWAP_PICK_ID_2024)
  return out
}

/** Level down on the sheet: drop bard picks (Expertise, Lore discoveries, their swaps) above the new level. */
export function trimBard2024PicksOnLevelDown(
  picks: FeaturePicksState,
  classEntryId: string,
  newLevel: number,
): FeaturePicksState {
  let next = picks
  for (const featureId of bardPickFeatureIdsToDrop2024(newLevel)) {
    if (getFeaturePick(next, classEntryId, featureId) != null) {
      next = setFeaturePick(next, classEntryId, featureId, null)
    }
  }
  if (lvl(newLevel) < MAGICAL_SECRETS_MIN_LEVEL_2024) {
    next = setFeaturePick(next, classEntryId, BARD_PREPARED_SWAP_PICK_ID_2024, null)
  }
  // Broken store: four Expertise skills in the L2 pick — keep two below L9.
  if (lvl(newLevel) < EXPERTISE_9_MIN_LEVEL_2024) {
    const raw = getFeaturePick(next, classEntryId, 'expertise')
    if (raw) {
      const parts = raw
        .split(',')
        .map((row) => row.trim())
        .filter(Boolean)
      if (parts.length > 2) {
        next = setFeaturePick(next, classEntryId, 'expertise', parts.slice(0, 2).join(','))
      }
    }
  }
  return next
}

/* ------------------------------------------------------------------ */
/* Card buttons / feature id routing                                   */
/* ------------------------------------------------------------------ */

/** Card buttons on ClassFeaturesPanel (edition 2024 only). */
export const BARD_2024_CARD_BUTTONS: Record<string, string> = {
  'bardic-inspiration': 'Даровать…',
  bardic_inspiration: 'Даровать…',
  'font-of-inspiration': 'Ячейка → вдохновение…',
  font_of_inspiration: 'Ячейка → вдохновение…',
  countercharm: 'Контрчары…',
  'superior-inspiration': 'Инициатива…',
  superior_inspiration: 'Инициатива…',
  'cutting-words': 'Острые слова…',
  cutting_words: 'Острые слова…',
  'peerless-skill': 'Бесподобный навык…',
  peerless_skill: 'Бесподобный навык…',
  'mantle-of-inspiration': 'Мантия…',
  mantle_of_inspiration: 'Мантия…',
  'beguiling-magic': 'Чарующая магия…',
  beguiling_magic: 'Чарующая магия…',
  'mantle-of-majesty': 'Величие…',
  mantle_of_majesty: 'Величие…',
  'unbreakable-majesty': 'Несокрушимое…',
  unbreakable_majesty: 'Несокрушимое…',
  'inspiring-movement': 'Движение…',
  inspiring_movement: 'Движение…',
  'tandem-footwork': 'Совместный танец…',
  tandem_footwork: 'Совместный танец…',
  'combat-inspiration': 'Боевое…',
  combat_inspiration: 'Боевое…',
  'battle-magic': 'Боевая магия',
  battle_magic: 'Боевая магия',
}

const BARD_USE_FEATURE_IDS = new Set([
  'bardic-inspiration',
  'font-of-inspiration',
  'countercharm',
  'superior-inspiration',
  'cutting-words',
  'peerless-skill',
  'mantle-of-inspiration',
  'beguiling-magic',
  'mantle-of-majesty',
  'unbreakable-majesty',
  'inspiring-movement',
  'tandem-footwork',
  'combat-inspiration',
  'battle-magic',
])

/** Normalize feature ids that open the dialog (`_` → `-`). */
export function bard2024UseFeatureId(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.trim().replace(/_/g, '-')
  return BARD_USE_FEATURE_IDS.has(key) ? key : null
}

/** Rows the 2014 pack shows but a 2024 bard must never see. */
export const BARD_2014_ONLY_FEATURE_IDS: readonly string[] = [
  'song_of_rest',
  'song-of-rest',
  'additional_magical_secrets',
  'magical_secrets_10',
  'magical_secrets_14',
  'magical_secrets_18',
]

export function isBard2014OnlyFeatureId(featureId: string): boolean {
  return BARD_2014_ONLY_FEATURE_IDS.includes(featureId)
}

/* ------------------------------------------------------------------ */
/* Apply                                                               */
/* ------------------------------------------------------------------ */

export type Bard2024UseInput = {
  featureId: string
  resourceId: string | null
  resources: SheetResource[]
  classEntryId: string
  bardLevel: number
  chaScore?: number
  slots?: Record<string, SpellSlotState>
  /** font-of-inspiration / mantle-of-majesty (regain): slot circle. */
  slotLevel?: number
  /** bardic-inspiration: grant target flags. */
  targetIsSelf?: boolean
  targetHasBardicDie?: boolean
  targetName?: string
  /** mantle-of-inspiration: rolled BI die. */
  dieRoll?: number
  /** beguiling-magic / mantle-of-majesty: `regain` restores the use instead of spending. */
  mode?: string | null
  /** peerless-skill: roll succeeded after adding the die. */
  succeeded?: boolean
  /** combat-inspiration: defense | offense. */
  choice?: string | null
  rng?: () => number
}

export type Bard2024Patches = {
  tempHp?: number
  activeLabels?: string[]
  concentrationName?: string | null
  diceExpression?: string | null
  /** Spend BI to grant: other sheets receive this die label (1к6…1к12). */
  grantedDieLabel?: string
}

export type Bard2024UseResult = {
  ok: boolean
  resources: SheetResource[]
  slots?: Record<string, SpellSlotState>
  feedLineRu: string
  message?: string
  patches?: Bard2024Patches
}

function refuse(input: Bard2024UseInput, message: string): Bard2024UseResult {
  return { ok: false, resources: input.resources, feedLineRu: '', message }
}

function done(
  input: Bard2024UseInput,
  feedLineRu: string,
  extra: Partial<Pick<Bard2024UseResult, 'resources' | 'slots' | 'patches'>> = {},
): Bard2024UseResult {
  return { ok: true, resources: extra.resources ?? input.resources, feedLineRu, ...extra }
}

function patchRow(
  resources: SheetResource[],
  id: string,
  fn: (row: SheetResource) => SheetResource,
): SheetResource[] {
  return resources.map((row) => (row.id === id ? clampResource(fn(row)) : row))
}

function poolRow(input: Bard2024UseInput, poolId: string): SheetResource | null {
  if (poolId === BARDIC_INSPIRATION_POOL_ID) return findBiPool2024(input.resources, input.classEntryId)
  return findFeatureResource(input.resources, BARD_CLASS_SLUG_2024, poolId, input.classEntryId)
}

function spendBi(input: Bard2024UseInput):
  | { ok: true; resources: SheetResource[] }
  | { ok: false; result: Bard2024UseResult } {
  const row = poolRow(input, BARDIC_INSPIRATION_POOL_ID)
  if (!row) return { ok: false, result: refuse(input, `Ресурс «${BARDIC_INSPIRATION_NAME_RU}» не найден`) }
  if (row.used >= row.max) {
    return {
      ok: false,
      result: refuse(
        input,
        `${BARDIC_INSPIRATION_NAME_RU}: использования закончились (${
          hasFontOfInspiration2024(input.bardLevel) ? 'короткий или долгий отдых вернёт все' : 'долгий отдых вернёт все'
        })`,
      ),
    }
  }
  return { ok: true, resources: patchRow(input.resources, row.id, (r) => ({ ...r, used: r.used + 1 })) }
}

function spendOwnPool(
  input: Bard2024UseInput,
  poolId: string,
  name: string,
  resetNote: string,
):
  | { ok: true; resources: SheetResource[] }
  | { ok: false; result: Bard2024UseResult } {
  const row = poolRow(input, poolId)
  if (!row) return { ok: false, result: refuse(input, `Ресурс «${name}» не найден`) }
  if (row.used >= row.max) {
    return { ok: false, result: refuse(input, `${name}: использования закончились (${resetNote})`) }
  }
  return { ok: true, resources: patchRow(input.resources, row.id, (r) => ({ ...r, used: r.used + 1 })) }
}

function norm(featureId: string): string {
  return featureId.trim().replace(/_/g, '-')
}

export function applyBard2024FeatureUse(input: Bard2024UseInput): Bard2024UseResult {
  const fid = bard2024UseFeatureId(input.featureId) ?? norm(input.featureId)
  const level = lvl(input.bardLevel)
  const dieLabel = bardicInspirationDieLabelRu2024(level)

  switch (fid) {
    case 'bardic-inspiration': {
      const biRow = poolRow(input, BARDIC_INSPIRATION_POOL_ID)
      const check = checkBardicInspirationGrant2024({
        targetIsSelf: Boolean(input.targetIsSelf),
        targetHasBardicDie: Boolean(input.targetHasBardicDie),
        poolLeft: biRow ? Math.max(0, biRow.max - biRow.used) : 0,
      })
      if (!check.ok) return refuse(input, check.reasonRu)
      const spent = spendBi(input)
      if (!spent.ok) return spent.result
      const who = input.targetName?.trim() ? `«${input.targetName.trim()}»` : 'союзник'
      return done(
        input,
        `${BARDIC_INSPIRATION_NAME_RU}: ${who} получает ${dieLabel} (бонусное действие, 60 фт., 1 час); после провала Теста к20 — бросить и прибавить`,
        { resources: spent.resources, patches: { grantedDieLabel: dieLabel } },
      )
    }

    case 'font-of-inspiration': {
      const result = fontOfInspirationSlotToUse2024({
        bardLevel: level,
        slotLevel: input.slotLevel ?? 1,
        slots: input.slots ?? {},
        resources: input.resources,
        classEntryId: input.classEntryId,
      })
      if (!result.ok) return refuse(input, result.message)
      return done(input, result.feedLineRu, { resources: result.resources, slots: result.slots })
    }

    case 'countercharm': {
      if (level < COUNTERCHARM_MIN_LEVEL_2024) {
        return refuse(input, `${COUNTERCHARM_NAME_RU} с 7 уровня барда`)
      }
      return done(
        input,
        `${COUNTERCHARM_NAME_RU} (реакция, без траты вдохновения): ты или существо в 30 фт. перебрасывает проваленный спас против Очарованного или Испуганного с Преимуществом`,
      )
    }

    case 'superior-inspiration': {
      if (level < SUPERIOR_INSPIRATION_MIN_LEVEL_2024) {
        return refuse(input, `${SUPERIOR_INSPIRATION_NAME_RU} с 18 уровня барда`)
      }
      const top = applySuperiorInspirationOnInitiative2024({
        bardLevel: level,
        resources: input.resources,
        classEntryId: input.classEntryId,
      })
      if (!top.ok) {
        return refuse(input, `${SUPERIOR_INSPIRATION_NAME_RU}: уже есть ${SUPERIOR_INSPIRATION_FLOOR_2024} или больше использований`)
      }
      return done(input, top.message, { resources: top.resources })
    }

    case 'cutting-words': {
      if (level < BARD_SUBCLASS_MIN_LEVEL_2024) return refuse(input, `${CUTTING_WORDS_NAME_RU} с 3 уровня барда`)
      const spent = spendBi(input)
      if (!spent.ok) return spent.result
      return done(
        input,
        `${CUTTING_WORDS_NAME_RU} (реакция, 60 фт.): брось ${dieLabel} и вычти из урона, успешной проверки характеристик или попадающей атаки`,
        { resources: spent.resources, patches: { diceExpression: dieLabel } },
      )
    }

    case 'peerless-skill': {
      if (level < SUBCLASS_L14_2024) return refuse(input, `${PEERLESS_SKILL_NAME_RU} с 14 уровня барда`)
      const biRow = poolRow(input, BARDIC_INSPIRATION_POOL_ID)
      if (!biRow || biRow.used >= biRow.max) {
        return refuse(input, `${BARDIC_INSPIRATION_NAME_RU}: использования закончились`)
      }
      if (input.succeeded === false) {
        return done(
          input,
          `${PEERLESS_SKILL_NAME_RU}: с ${dieLabel} всё равно провал — использование вдохновения не потрачено`,
          { patches: { diceExpression: dieLabel } },
        )
      }
      const spent = spendBi(input)
      if (!spent.ok) return spent.result
      return done(
        input,
        `${PEERLESS_SKILL_NAME_RU}: ${dieLabel} к провалу проверки характеристики или атаки — успех, использование потрачено`,
        { resources: spent.resources, patches: { diceExpression: dieLabel } },
      )
    }

    case 'mantle-of-inspiration': {
      if (level < BARD_SUBCLASS_MIN_LEVEL_2024) return refuse(input, `${MANTLE_OF_INSPIRATION_NAME_RU} с 3 уровня барда`)
      const spent = spendBi(input)
      if (!spent.ok) return spent.result
      const targets = glamourMantleTargets2024(input.chaScore)
      const roll = Math.max(1, Math.floor(input.dieRoll ?? 1))
      const temp = glamourMantleTempHp2024(roll)
      return done(
        input,
        `${MANTLE_OF_INSPIRATION_NAME_RU}: ${dieLabel} = ${roll}; до ${targets} существ в 60 фт. получают ${temp} врем. хитов (2 × ${roll}) и реакцией перемещаются без провоцированных атак`,
        { resources: spent.resources, patches: { tempHp: temp, diceExpression: dieLabel } },
      )
    }

    case 'beguiling-magic': {
      if (level < BARD_SUBCLASS_MIN_LEVEL_2024) return refuse(input, `${BEGUILING_MAGIC_NAME_RU} с 3 уровня барда`)
      if (input.mode === 'regain') {
        const pool = poolRow(input, BEGUILING_MAGIC_POOL_ID)
        if (!pool || pool.used <= 0) return refuse(input, `${BEGUILING_MAGIC_NAME_RU} уже доступна`)
        const spent = spendBi(input)
        if (!spent.ok) return spent.result
        return done(
          input,
          `${BEGUILING_MAGIC_NAME_RU}: потрачено использование вдохновения (без действия) — использование вернулось`,
          {
            resources: patchRow(spent.resources, pool.id, (r) => ({ ...r, used: Math.max(0, r.used - 1) })),
          },
        )
      }
      const spent = spendOwnPool(input, BEGUILING_MAGIC_POOL_ID, BEGUILING_MAGIC_NAME_RU, 'долгий отдых или трата вдохновения вернут')
      if (!spent.ok) return spent.result
      return done(
        input,
        `${BEGUILING_MAGIC_NAME_RU}: после заклинания Очарования или Иллюзии ячейкой — спас Мудрости видимого в 60 фт. существа против Сл заклинаний барда; провал: Очарованный или Испуганный на 1 мин.`,
        { resources: spent.resources },
      )
    }

    case 'mantle-of-majesty': {
      if (level < SUBCLASS_L6_2024) return refuse(input, `${MANTLE_OF_MAJESTY_NAME_RU} с 6 уровня барда`)
      if (input.mode === 'regain') {
        const pool = poolRow(input, MANTLE_OF_MAJESTY_POOL_ID)
        if (!pool || pool.used <= 0) return refuse(input, `${MANTLE_OF_MAJESTY_NAME_RU} уже доступна`)
        const slotLevel = Math.floor(input.slotLevel ?? 0)
        if (slotLevel < 3) return refuse(input, 'Нужна ячейка 3 круга или выше')
        const slots = input.slots ?? {}
        const slot = slots[String(slotLevel)]
        if (!slot || slot.max <= 0 || slot.used >= slot.max) {
          return refuse(input, `Нет свободной ячейки ${slotLevel} круга`)
        }
        return done(
          input,
          `${MANTLE_OF_MAJESTY_NAME_RU}: ячейка ${slotLevel} круга (без действия) — использование вернулось`,
          {
            resources: patchRow(input.resources, pool.id, (r) => ({ ...r, used: Math.max(0, r.used - 1) })),
            slots: { ...slots, [String(slotLevel)]: { ...slot, used: slot.used + 1 } },
          },
        )
      }
      const spent = spendOwnPool(input, MANTLE_OF_MAJESTY_POOL_ID, MANTLE_OF_MAJESTY_NAME_RU, 'долгий отдых или ячейка 3+ вернут')
      if (!spent.ok) return spent.result
      return done(
        input,
        `${MANTLE_OF_MAJESTY_NAME_RU}: облик величия на 1 мин. (концентрация); «Приказ» бонусным действием без ячейки; Очарованное тобой существо автоматически проваливает спас`,
        {
          resources: spent.resources,
          patches: { concentrationName: MANTLE_OF_MAJESTY_NAME_RU, activeLabels: [MANTLE_OF_MAJESTY_NAME_RU] },
        },
      )
    }

    case 'unbreakable-majesty': {
      if (level < SUBCLASS_L14_2024) return refuse(input, `${UNBREAKABLE_MAJESTY_NAME_RU} с 14 уровня барда`)
      const spent = spendOwnPool(input, UNBREAKABLE_MAJESTY_POOL_ID, UNBREAKABLE_MAJESTY_NAME_RU, 'короткий или долгий отдых вернёт')
      if (!spent.ok) return spent.result
      return done(
        input,
        `${UNBREAKABLE_MAJESTY_NAME_RU}: величественный облик на 1 мин. или до Недееспособности; попавший по тебе проходит спас Харизмы, иначе попадание — промах`,
        { resources: spent.resources, patches: { activeLabels: [UNBREAKABLE_MAJESTY_NAME_RU] } },
      )
    }

    case 'inspiring-movement': {
      if (level < SUBCLASS_L6_2024) return refuse(input, `${INSPIRING_MOVEMENT_NAME_RU} с 6 уровня барда`)
      const spent = spendBi(input)
      if (!spent.ok) return spent.result
      return done(
        input,
        `${INSPIRING_MOVEMENT_NAME_RU} (реакция): враг в 5 фт. закончил ход — ты перемещаешься до половины Скорости, затем союзник в 30 фт. тоже; без провоцированных атак`,
        { resources: spent.resources },
      )
    }

    case 'tandem-footwork': {
      if (level < SUBCLASS_L6_2024) return refuse(input, `${TANDEM_FOOTWORK_NAME_RU} с 6 уровня барда`)
      const spent = spendBi(input)
      if (!spent.ok) return spent.result
      return done(
        input,
        `${TANDEM_FOOTWORK_NAME_RU}: брось ${dieLabel} — ты и слышащие или видящие тебя союзники в 30 фт. получают результат бонусом к Инициативе`,
        { resources: spent.resources, patches: { diceExpression: dieLabel } },
      )
    }

    case 'combat-inspiration': {
      if (level < BARD_SUBCLASS_MIN_LEVEL_2024) return refuse(input, `${COMBAT_INSPIRATION_NAME_RU} с 3 уровня барда`)
      const mode = VALOR_COMBAT_INSPIRATION_MODES_2024.find((row) => row.id === input.choice)
      if (!mode) return refuse(input, 'Выбери: защита (КД) или нападение (урон)')
      return done(
        input,
        mode.id === 'defense'
          ? `${COMBAT_INSPIRATION_NAME_RU}: Защита (реакция) — существо с дарованной костью прибавляет ${dieLabel} к КД против попавшей атаки`
          : `${COMBAT_INSPIRATION_NAME_RU}: Нападение — существо с дарованной костью прибавляет ${dieLabel} к урону попавшей атаки`,
        { patches: { diceExpression: dieLabel } },
      )
    }

    case 'battle-magic': {
      if (level < SUBCLASS_L14_2024) return refuse(input, `${BATTLE_MAGIC_NAME_RU} с 14 уровня барда`)
      return done(
        input,
        `${BATTLE_MAGIC_NAME_RU}: после заклинания со временем сотворения «действие» — одна атака оружием бонусным действием`,
      )
    }

    default:
      return refuse(input, `Умение «${input.featureId}» не настроено в диалоге 2024`)
  }
}
