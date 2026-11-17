/**
 * Cleric 2024 (PHB): Divine Order, Channel Divinity (Divine Spark, Turn Undead, Sear Undead),
 * Blessed Strikes, Divine Intervention / Greater Divine Intervention, PHB domain features
 * (Life, Light, Trickery, War).
 *
 * Callers branch on `rules_edition === '2024'`; nothing here feeds the 2014 pack
 * (`cleric_2014.json`, «Божественный канал», «Выжигание нежити», «Благословенные удары»).
 * Names follow next.dnd.su.
 */

import type { FeatureChoiceDef } from './classFeatures'
import type { SharedPoolOption2024 } from './edition2024Subclasses'
import {
  getFeaturePick,
  setFeaturePick,
  type FeaturePicksState,
} from './featurePicks'
import { parseFeatureResourceId } from './featureResources'
import { clampResource, type SheetResource } from './rest'

/* ------------------------------------------------------------------ */
/* Names (RU, next.dnd.su)                                             */
/* ------------------------------------------------------------------ */

export const CHANNEL_DIVINITY_NAME_RU = 'Проведение божественности'
export const DIVINE_SPARK_NAME_RU = 'Божественная искра'
export const TURN_UNDEAD_NAME_RU = 'Изгнание нежити'
export const SEAR_UNDEAD_NAME_RU = 'Испепеление нежити'
export const DIVINE_ORDER_NAME_RU = 'Божественный орден'
export const DIVINE_ORDER_PROTECTOR_NAME_RU = 'Защитник'
export const DIVINE_ORDER_THAUMATURGE_NAME_RU = 'Чудотворец'
export const BLESSED_STRIKES_NAME_RU = 'Благословленные удары'
export const IMPROVED_BLESSED_STRIKES_NAME_RU = 'Улучшенные Благословленные удары'
export const DIVINE_STRIKE_NAME_RU = 'Божественный удар'
export const POTENT_SPELLCASTING_NAME_RU = 'Могущественные заклинания'
export const DIVINE_INTERVENTION_NAME_RU = 'Божественное вмешательство'
export const GREATER_DIVINE_INTERVENTION_NAME_RU = 'Великое божественное вмешательство'

export const DISCIPLE_OF_LIFE_NAME_RU = 'Поборник жизни'
export const PRESERVE_LIFE_NAME_RU = 'Сохранение жизни'
export const BLESSED_HEALER_NAME_RU = 'Благословенный целитель'
export const SUPREME_HEALING_NAME_RU = 'Высшее исцеление'

export const WARDING_FLARE_NAME_RU = 'Ограждающая вспышка'
export const RADIANCE_OF_THE_DAWN_NAME_RU = 'Сияние рассвета'
export const IMPROVED_WARDING_FLARE_NAME_RU = 'Улучшенная ограждающая вспышка'
export const CORONA_OF_LIGHT_NAME_RU = 'Корона света'

export const BLESSING_OF_THE_TRICKSTER_NAME_RU = 'Благословение обманщика'
export const INVOKE_DUPLICITY_NAME_RU = 'Двуличность'
export const TRICKSTERS_TRANSPOSITION_NAME_RU = 'Рокировка'
export const IMPROVED_DUPLICITY_NAME_RU = 'Улучшенная двуличность'

export const WAR_PRIEST_NAME_RU = 'Боевой священник'
export const GUIDED_STRIKE_NAME_RU = 'Направленный удар'
export const WAR_GODS_BLESSING_NAME_RU = 'Благословение бога войны'
export const AVATAR_OF_BATTLE_NAME_RU = 'Воплощение битвы'

export const CLERIC_CLASS_SLUG_2024 = 'cleric'

export const CHANNEL_DIVINITY_FEATURE_ID = 'channel-divinity'
export const DIVINE_SPARK_FEATURE_ID = 'divine-spark'
export const TURN_UNDEAD_FEATURE_ID = 'turn-undead'
export const SEAR_UNDEAD_FEATURE_ID = 'sear-undead'
export const DIVINE_ORDER_FEATURE_ID = 'divine-order'
export const BLESSED_STRIKES_FEATURE_ID = 'blessed-strikes'
export const DIVINE_INTERVENTION_FEATURE_ID = 'divine-intervention'
export const GREATER_DIVINE_INTERVENTION_FEATURE_ID = 'greater-divine-intervention'

export const CLERIC_SUBCLASS_SLUGS_2024 = {
  life: 'cleric__life-domain',
  light: 'cleric__light-domain',
  trickery: 'cleric__trickery-domain',
  war: 'cleric__war-domain',
} as const

/** Shared Channel Divinity pool + subclass pools (see `buildSubclassResources2024`). */
export const CHANNEL_DIVINITY_POOL_ID = 'channel_divinity'
export const WARDING_FLARE_POOL_ID = 'warding_flare'
export const WAR_PRIEST_POOL_ID = 'war_priest'
export const CORONA_OF_LIGHT_POOL_ID = 'corona_of_light'
export const DIVINE_INTERVENTION_POOL_ID = 'divine_intervention'

export const CLERIC_CHANNEL_DIVINITY_MIN_LEVEL_2024 = 2
export const SEAR_UNDEAD_MIN_LEVEL_2024 = 5
export const BLESSED_STRIKES_MIN_LEVEL_2024 = 7
export const IMPROVED_BLESSED_STRIKES_MIN_LEVEL_2024 = 14
export const DIVINE_INTERVENTION_MIN_LEVEL_2024 = 10
export const GREATER_DIVINE_INTERVENTION_MIN_LEVEL_2024 = 20
export const DIVINE_INTERVENTION_MAX_SPELL_CIRCLE_2024 = 5

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function lvl(value: number): number {
  return Math.max(0, Math.floor(value || 0))
}

function mod(value: number | undefined): number {
  return Math.floor(value ?? 0)
}

function signedBonus(value: number): string {
  if (value > 0) return `+${value}`
  if (value < 0) return `${value}`
  return ''
}

/** `2к8+4`, `4к8`, `1к8-1`. */
export function diceFormulaRu2024(count: number, die: number, bonus = 0): string {
  return `${Math.max(0, Math.floor(count))}к${die}${signedBonus(Math.floor(bonus))}`
}

export function isClericClassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return key === CLERIC_CLASS_SLUG_2024 || /жрец/.test(key)
}

/* ------------------------------------------------------------------ */
/* Divine Order                                                        */
/* ------------------------------------------------------------------ */

export const DIVINE_ORDER_PROTECTOR = 'protector'
export const DIVINE_ORDER_THAUMATURGE = 'thaumaturge'
export const DIVINE_ORDER_PICK_ID_2024 = 'divine_order'

export type DivineOrder2024 = typeof DIVINE_ORDER_PROTECTOR | typeof DIVINE_ORDER_THAUMATURGE

export const DIVINE_ORDER_OPTIONS_2024: ReadonlyArray<{
  id: DivineOrder2024
  nameRu: string
  summaryRu: string
}> = [
  {
    id: DIVINE_ORDER_PROTECTOR,
    nameRu: DIVINE_ORDER_PROTECTOR_NAME_RU,
    summaryRu: 'Тренировка с воинским оружием и тяжёлыми доспехами.',
  },
  {
    id: DIVINE_ORDER_THAUMATURGE,
    nameRu: DIVINE_ORDER_THAUMATURGE_NAME_RU,
    summaryRu:
      'Один дополнительный заговор жреца; бонус к Магии и Религии (оба навыка) = мод. Мудрости (мин. +1).',
  },
]

function normalizeDivineOrder(raw: unknown): DivineOrder2024 | null {
  const key = String(raw ?? '').trim().toLowerCase()
  if (key === DIVINE_ORDER_PROTECTOR) return DIVINE_ORDER_PROTECTOR
  if (key === DIVINE_ORDER_THAUMATURGE) return DIVINE_ORDER_THAUMATURGE
  return null
}

function isPicksState(value: unknown): value is FeaturePicksState {
  if (!value || typeof value !== 'object') return false
  const values = (value as { values?: unknown }).values
  return Boolean(values) && typeof values === 'object' && !Array.isArray(values)
}

/**
 * Read Divine Order from `class_options_2024.divine_order` or from feature picks
 * (`{classEntryId}:divine_order` / `divine-order`). Pass `classEntryId` with picks.
 */
export function readDivineOrder2024(
  source: unknown,
  classEntryId?: string | null,
): DivineOrder2024 | null {
  if (!source || typeof source !== 'object') return null
  if (isPicksState(source)) {
    const entry = (classEntryId ?? '').trim()
    if (entry) {
      return (
        normalizeDivineOrder(getFeaturePick(source, entry, DIVINE_ORDER_PICK_ID_2024)) ??
        normalizeDivineOrder(getFeaturePick(source, entry, DIVINE_ORDER_FEATURE_ID))
      )
    }
    for (const [key, value] of Object.entries(source.values)) {
      const featureId = key.slice(key.lastIndexOf(':') + 1)
      if (featureId === DIVINE_ORDER_PICK_ID_2024 || featureId === DIVINE_ORDER_FEATURE_ID) {
        const found = normalizeDivineOrder(value)
        if (found) return found
      }
    }
    return null
  }
  return normalizeDivineOrder((source as Record<string, unknown>).divine_order)
}

/**
 * Thaumaturge: the bonus applies to BOTH Arcana AND Religion (not «choose one»).
 * Bonus = Wisdom modifier, minimum +1.
 */
export function thaumaturgeSkillBonus2024(wisMod: number): { arcana: number; religion: number } {
  const bonus = Math.max(1, mod(wisMod))
  return { arcana: bonus, religion: bonus }
}

/** Protector: martial weapon training and heavy armor training. */
export function protectorGrants2024(): { martialWeapons: true; heavyArmor: true } {
  return { martialWeapons: true, heavyArmor: true }
}

/** Thaumaturge: one extra cleric cantrip. */
export function thaumaturgeExtraCantrips2024(): number {
  return 1
}

/* ------------------------------------------------------------------ */
/* Channel Divinity / Divine Spark / Turn Undead / Sear Undead         */
/* ------------------------------------------------------------------ */

/** Divine Spark d8 ladder: 1 / 2 / 3 / 4 dice at cleric levels 2 / 7 / 13 / 18. */
export function divineSparkDiceCount2024(clericLevel: number): number {
  const level = lvl(clericLevel)
  if (level >= 18) return 4
  if (level >= 13) return 3
  if (level >= 7) return 2
  if (level >= 2) return 1
  return 0
}

export function divineSparkFormulaRu2024(clericLevel: number, wisMod: number): string {
  const count = divineSparkDiceCount2024(clericLevel)
  if (count <= 0) return ''
  return diceFormulaRu2024(count, 8, mod(wisMod))
}

/** Sear Undead: Wisdom modifier d8 (minimum 1) radiant to each undead that fails Turn Undead. */
export function searUndeadDiceCount2024(wisMod: number): number {
  return Math.max(1, mod(wisMod))
}

export function searUndeadFormulaRu2024(wisMod: number): string {
  return diceFormulaRu2024(searUndeadDiceCount2024(wisMod), 8)
}

/** Light domain Radiance of the Dawn: 2d10 + cleric level radiant. */
export function radianceOfTheDawnFormulaRu2024(clericLevel: number): string {
  return `2к10+${lvl(clericLevel)}`
}

/** Life domain Preserve Life: healing pool = 5 × cleric level. */
export function preserveLifePool2024(clericLevel: number): number {
  return lvl(clericLevel) * 5
}

export const DIVINE_SPARK_MODES_2024 = [
  { id: 'heal', nameRu: 'Лечение' },
  { id: 'necrotic', nameRu: 'Некротический урон' },
  { id: 'radiant', nameRu: 'Урон излучением' },
] as const

export type DivineSparkMode2024 = (typeof DIVINE_SPARK_MODES_2024)[number]['id']

export const CLERIC_BASE_CHANNEL_OPTIONS_2024: ReadonlyArray<SharedPoolOption2024> = [
  {
    feature_id: DIVINE_SPARK_FEATURE_ID,
    name_ru: DIVINE_SPARK_NAME_RU,
    spend_pool: CHANNEL_DIVINITY_POOL_ID,
    cost: 1,
    kind: 'action',
    min_level: CLERIC_CHANNEL_DIVINITY_MIN_LEVEL_2024,
  },
  {
    feature_id: TURN_UNDEAD_FEATURE_ID,
    name_ru: TURN_UNDEAD_NAME_RU,
    spend_pool: CHANNEL_DIVINITY_POOL_ID,
    cost: 1,
    kind: 'action',
    min_level: CLERIC_CHANNEL_DIVINITY_MIN_LEVEL_2024,
  },
]

/** Base options available at `clericLevel` (Divine Spark + Turn Undead from level 2). */
export function clericBaseChannelOptionsAtLevel2024(clericLevel: number): SharedPoolOption2024[] {
  return CLERIC_BASE_CHANNEL_OPTIONS_2024.filter((row) => lvl(clericLevel) >= row.min_level).map(
    (row) => ({ ...row }),
  )
}

/* ------------------------------------------------------------------ */
/* Blessed Strikes                                                     */
/* ------------------------------------------------------------------ */

export const BLESSED_STRIKES_PICK_ID_2024 = 'blessed-strikes'
export const BLESSED_STRIKES_DIVINE_STRIKE = 'divine_strike'
export const BLESSED_STRIKES_POTENT_SPELLCASTING = 'potent_spellcasting'

export type BlessedStrikesPick2024 =
  | typeof BLESSED_STRIKES_DIVINE_STRIKE
  | typeof BLESSED_STRIKES_POTENT_SPELLCASTING

/** FeatureChoice shape for `pendingFeatureChoices` (like wizard Scholar). */
export const blessedStrikesChoice2024: FeatureChoiceDef = {
  id: BLESSED_STRIKES_PICK_ID_2024,
  label_ru: BLESSED_STRIKES_NAME_RU,
  options: [BLESSED_STRIKES_DIVINE_STRIKE, BLESSED_STRIKES_POTENT_SPELLCASTING],
  option_labels_ru: {
    [BLESSED_STRIKES_DIVINE_STRIKE]: DIVINE_STRIKE_NAME_RU,
    [BLESSED_STRIKES_POTENT_SPELLCASTING]: POTENT_SPELLCASTING_NAME_RU,
  },
  max_picks: 1,
}

function normalizeBlessedStrikes(raw: unknown): BlessedStrikesPick2024 | null {
  const key = String(raw ?? '').trim().toLowerCase()
  if (key === BLESSED_STRIKES_DIVINE_STRIKE || key === BLESSED_STRIKES_POTENT_SPELLCASTING) {
    return key
  }
  return null
}

/**
 * Blessed Strikes pick: feature picks (`{classEntryId}:blessed_strikes` / `blessed-strikes`) first,
 * then `class_options_2024.blessed_strikes` (create-at-N fallback).
 */
export function readBlessedStrikes2024(
  picks: FeaturePicksState,
  classEntryId: string,
  classOptions?: unknown,
): BlessedStrikesPick2024 | null {
  const fromPicks = normalizeBlessedStrikes(
    getFeaturePick(picks, classEntryId, 'blessed_strikes') ??
      getFeaturePick(picks, classEntryId, BLESSED_STRIKES_PICK_ID_2024),
  )
  if (fromPicks) return fromPicks
  if (classOptions && typeof classOptions === 'object') {
    return normalizeBlessedStrikes((classOptions as Record<string, unknown>).blessed_strikes)
  }
  return null
}

/** Divine Strike: once per turn extra weapon damage — 1d8 at 7–13, 2d8 at 14+. */
export function divineStrikeDice2024(clericLevel: number): number {
  const level = lvl(clericLevel)
  if (level >= IMPROVED_BLESSED_STRIKES_MIN_LEVEL_2024) return 2
  if (level >= BLESSED_STRIKES_MIN_LEVEL_2024) return 1
  return 0
}

export function divineStrikeFormulaRu2024(clericLevel: number): string {
  const count = divineStrikeDice2024(clericLevel)
  return count > 0 ? diceFormulaRu2024(count, 8) : ''
}

/** Improved Blessed Strikes (L14) Potent Spellcasting: temp HP = 2 × Wis mod. */
export function potentSpellcastingTempHp2024(wisMod: number, clericLevel: number): number {
  if (lvl(clericLevel) < IMPROVED_BLESSED_STRIKES_MIN_LEVEL_2024) return 0
  return Math.max(0, mod(wisMod)) * 2
}

/** Potent Spellcasting (L7): + Wis mod to cleric cantrip damage (minimum +0). */
export function potentSpellcastingCantripBonus2024(wisMod: number, clericLevel: number): number {
  if (lvl(clericLevel) < BLESSED_STRIKES_MIN_LEVEL_2024) return 0
  return Math.max(0, mod(wisMod))
}

/**
 * Wis-mod cantrip damage bonus for a sheet, or 0 when the character is not a 2024
 * cleric (L7+) with the Potent Spellcasting pick.
 */
export function potentSpellcastingBonusForSheet2024(input: {
  rulesEdition: string | null | undefined
  classes: ReadonlyArray<{ id: string; name: string; level: number }>
  featurePicks: FeaturePicksState
  classOptions?: unknown
  wisScore: number | null | undefined
}): number {
  if (String(input.rulesEdition ?? '2014').trim() !== '2024') return 0
  const cleric = input.classes.find((row) => /жрец|cleric/i.test(row.name))
  if (!cleric) return 0
  if (readBlessedStrikes2024(input.featurePicks, cleric.id, input.classOptions) !== BLESSED_STRIKES_POTENT_SPELLCASTING) {
    return 0
  }
  const wisMod = Math.floor(((input.wisScore ?? 10) - 10) / 2)
  return potentSpellcastingCantripBonus2024(wisMod, cleric.level)
}

/** Damaging cantrips of the cleric list (unlabeled class counts; other classes do not). */
export function isPotentSpellcastingCantrip2024(
  spell: {
    level: number
    class_slug?: string | null
  },
  potentClass: 'cleric' | 'druid' = CLERIC_CLASS_SLUG_2024,
): boolean {
  if (spell.level > 0) return false
  const slug = (spell.class_slug ?? '').trim().toLowerCase()
  return !slug || slug === potentClass
}

/** Add the bonus to the first dice term: `3d8 излучение` → `3d8+3 излучение`. */
export function applyPotentSpellcastingToDamage2024(effect: string, bonus: number): string {
  if (!effect || bonus <= 0) return effect
  return effect.replace(
    /(\d+\s*[dDкК]\s*\d+)(?:\s*([+-])\s*(\d+))?/,
    (_whole, dice: string, sign?: string, num?: string) => {
      const existing = sign && num ? (sign === '-' ? -Number(num) : Number(num)) : 0
      const total = existing + bonus
      return `${dice}${total > 0 ? `+${total}` : total < 0 ? `${total}` : ''}`
    },
  )
}

export function divineStrikeAttackRiderRu2024(clericLevel: number): string {
  const formula = divineStrikeFormulaRu2024(clericLevel)
  if (!formula) return ''
  return `${DIVINE_STRIKE_NAME_RU}: +${formula} некротического или излучением (раз за ход, попадание оружием)`
}

export function potentSpellcastingCantripRiderRu2024(wisMod: number, clericLevel: number): string {
  const bonus = potentSpellcastingCantripBonus2024(wisMod, clericLevel)
  if (bonus <= 0 && lvl(clericLevel) < BLESSED_STRIKES_MIN_LEVEL_2024) return ''
  const temp = potentSpellcastingTempHp2024(wisMod, clericLevel)
  const tail = temp > 0 ? `; врем. хиты существу в 60 фт.: ${temp}` : ''
  return `${POTENT_SPELLCASTING_NAME_RU}: +${bonus} к урону заговоров жреца${tail}`
}

/* ------------------------------------------------------------------ */
/* Divine Intervention / Greater Divine Intervention                   */
/* ------------------------------------------------------------------ */

export const DIVINE_INTERVENTION_WISH_LOCK_PICK_ID_2024 = 'divine_intervention_wish_lock'
export const WISH_SPELL_ID_2024 = 'wish'
export const WISH_SPELL_NAME_RU_2024 = 'Желание'

/** Wish lock: 2d4 long rests during which Divine Intervention cannot be used. */
export function rollWishLockLongRests2024(rng: () => number = Math.random): number {
  const d4 = () => Math.min(4, Math.floor(rng() * 4) + 1)
  return d4() + d4()
}

/** Remaining long rests of the Wish lock (0 = free). */
export function readWishLock2024(picks: FeaturePicksState, classEntryId: string): number {
  const raw = getFeaturePick(picks, classEntryId, DIVINE_INTERVENTION_WISH_LOCK_PICK_ID_2024)
  const n = Math.floor(Number(raw))
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function setWishLock2024(
  picks: FeaturePicksState,
  classEntryId: string,
  remaining: number,
): FeaturePicksState {
  const n = Math.max(0, Math.floor(remaining))
  return setFeaturePick(
    picks,
    classEntryId,
    DIVINE_INTERVENTION_WISH_LOCK_PICK_ID_2024,
    n > 0 ? String(n) : null,
  )
}

/** Decrement the Wish lock on long rest. */
export function decrementWishLockOnLongRest2024(
  picks: FeaturePicksState,
  classEntryId: string,
): FeaturePicksState {
  const left = readWishLock2024(picks, classEntryId)
  if (left <= 0) return picks
  return setWishLock2024(picks, classEntryId, left - 1)
}

export type DivineInterventionAvailability2024 =
  | { available: true; wishAvailable: boolean }
  | { available: false; reasonRu: string }

export function divineInterventionAvailability2024(input: {
  clericLevel: number
  resources: SheetResource[]
  featurePicks: FeaturePicksState
  classEntryId: string
}): DivineInterventionAvailability2024 {
  const level = lvl(input.clericLevel)
  if (level < DIVINE_INTERVENTION_MIN_LEVEL_2024) {
    return {
      available: false,
      reasonRu: `${DIVINE_INTERVENTION_NAME_RU} доступно с ${DIVINE_INTERVENTION_MIN_LEVEL_2024} уровня жреца`,
    }
  }
  const lock = readWishLock2024(input.featurePicks, input.classEntryId)
  if (lock > 0) {
    return {
      available: false,
      reasonRu: `После «Желания» вмешательство недоступно ещё ${lock} долг. отд.`,
    }
  }
  const row = findClericPool2024(input.resources, DIVINE_INTERVENTION_POOL_ID, input.classEntryId)
  if (!row) return { available: false, reasonRu: `Ресурс «${DIVINE_INTERVENTION_NAME_RU}» не найден` }
  if (row.used >= row.max) {
    return {
      available: false,
      reasonRu: `${DIVINE_INTERVENTION_NAME_RU} уже использовано (до долгого отдыха)`,
    }
  }
  return {
    available: true,
    wishAvailable: level >= GREATER_DIVINE_INTERVENTION_MIN_LEVEL_2024,
  }
}

export type DivineInterventionSpellRow = {
  slug: string
  name_ru?: string
  level?: number
  circle?: number
  classes?: readonly string[] | null
  casting_time?: string | { unit?: string; amount?: number } | null
}

function isReactionCasting(time: DivineInterventionSpellRow['casting_time']): boolean {
  if (!time) return false
  if (typeof time === 'string') return /реакц|reaction/i.test(time)
  return String(time.unit ?? '').toLowerCase() === 'reaction'
}

/** Cleric list, circle 1–5, casting time is not a reaction. */
export function filterDivineInterventionSpells2024(
  spells: readonly DivineInterventionSpellRow[],
): DivineInterventionSpellRow[] {
  return spells.filter((spell) => {
    const circle = Math.floor(spell.level ?? spell.circle ?? 0)
    if (circle < 1 || circle > DIVINE_INTERVENTION_MAX_SPELL_CIRCLE_2024) return false
    const classes = (spell.classes ?? []).map((c) => String(c).toLowerCase())
    if (!classes.includes(CLERIC_CLASS_SLUG_2024)) return false
    return !isReactionCasting(spell.casting_time)
  })
}

/* ------------------------------------------------------------------ */
/* Subclass helpers                                                    */
/* ------------------------------------------------------------------ */

/** Life domain Disciple of Life (L3) and Blessed Healer (L6): bonus HP = 2 + spell slot level. */
export function discipleOfLifeBonus2024(slotLevel: number): number {
  return 2 + Math.max(1, Math.floor(slotLevel || 0))
}

export function blessedHealerSelfHeal2024(slotLevel: number, clericLevel: number): number {
  return lvl(clericLevel) >= 6 ? discipleOfLifeBonus2024(slotLevel) : 0
}

/** Supreme Healing (L17): healing spell / Channel dice are maximized instead of rolled. */
export function supremeHealingActive2024(clericLevel: number): boolean {
  return lvl(clericLevel) >= 17
}

export function supremeHealingMaxRoll2024(diceCount: number, die: number): number {
  return Math.max(0, Math.floor(diceCount)) * die
}

/** War domain Avatar of Battle (L17): resistance to B/P/S. */
export const AVATAR_OF_BATTLE_RESISTANCES_2024 = ['bludgeoning', 'piercing', 'slashing'] as const

export function warAvatarResistances2024(clericLevel: number): string[] {
  return lvl(clericLevel) >= 17 ? [...AVATAR_OF_BATTLE_RESISTANCES_2024] : []
}

/** Trickery Improved Duplicity (L17): HP regained when the duplicate ends = cleric level. */
export function trickeryDuplicityEndHeal2024(clericLevel: number): number {
  return lvl(clericLevel) >= 17 ? lvl(clericLevel) : 0
}

export function tricksterTranspositionAvailable2024(clericLevel: number): boolean {
  return lvl(clericLevel) >= 6
}

/** Light domain Corona of Light (L17): Wisdom modifier uses (minimum 1) per long rest. */
export function coronaOfLightMaxUses2024(wisMod: number, clericLevel: number): number {
  return lvl(clericLevel) >= 17 ? Math.max(1, mod(wisMod)) : 0
}

export const INVOKE_DUPLICITY_ACTIVE_PICK_ID_2024 = 'invoke_duplicity_active'

export const WAR_GODS_BLESSING_SPELLS_2024 = [
  { id: 'shield-of-faith', nameRu: 'Щит веры' },
  { id: 'spiritual-weapon', nameRu: 'Духовное оружие' },
] as const

export const INVOKE_DUPLICITY_MODES_2024 = [
  { id: 'create', nameRu: 'Создать' },
  { id: 'move', nameRu: 'Переместить' },
  { id: 'dismiss', nameRu: 'Рассеять' },
] as const

export type InvokeDuplicityMode2024 = (typeof INVOKE_DUPLICITY_MODES_2024)[number]['id']

/* ------------------------------------------------------------------ */
/* Card buttons / feature id routing                                   */
/* ------------------------------------------------------------------ */

/** Card buttons on ClassFeaturesPanel (edition 2024 only). */
export const CLERIC_2024_CARD_BUTTONS: Record<string, string> = {
  'divine-spark': 'Искра…',
  divine_spark: 'Искра…',
  'turn-undead': 'Изгнать…',
  turn_undead: 'Изгнать…',
  'sear-undead': 'Испепелить…',
  sear_undead: 'Испепелить…',
  'preserve-life': 'Сохранить жизнь…',
  preserve_life: 'Сохранить жизнь…',
  'radiance-of-the-dawn': 'Сияние…',
  radiance_of_the_dawn: 'Сияние…',
  'guided-strike': 'Направить удар',
  guided_strike: 'Направить удар',
  'war-gods-blessing': 'Благословение…',
  war_gods_blessing: 'Благословение…',
  'invoke-duplicity': 'Двуличность…',
  invoke_duplicity: 'Двуличность…',
  'warding-flare': 'Вспышка',
  warding_flare: 'Вспышка',
  'war-priest': 'Удар священника',
  war_priest: 'Удар священника',
  'corona-of-light': 'Корона…',
  corona_of_light: 'Корона…',
  'divine-intervention': 'Вмешательство…',
  divine_intervention: 'Вмешательство…',
  'greater-divine-intervention': 'Вмешательство…',
  greater_divine_intervention: 'Вмешательство…',
}

const CLERIC_USE_FEATURE_IDS = new Set([
  'divine-spark',
  'turn-undead',
  'sear-undead',
  'preserve-life',
  'radiance-of-the-dawn',
  'guided-strike',
  'war-gods-blessing',
  'invoke-duplicity',
  'warding-flare',
  'war-priest',
  'corona-of-light',
  'divine-intervention',
])

/** Normalize feature ids that open the dialog (`_` → `-`; Greater DI → divine-intervention). */
export function cleric2024UseFeatureId(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.trim().replace(/_/g, '-')
  if (key === GREATER_DIVINE_INTERVENTION_FEATURE_ID) return DIVINE_INTERVENTION_FEATURE_ID
  return CLERIC_USE_FEATURE_IDS.has(key) ? key : null
}

/* ------------------------------------------------------------------ */
/* Resource lookup                                                     */
/* ------------------------------------------------------------------ */

export function findClericPool2024(
  resources: SheetResource[],
  poolId: string,
  classEntryId?: string,
): SheetResource | null {
  const matches = (row: SheetResource) => parseFeatureResourceId(row.id)?.poolId === poolId
  if (classEntryId) {
    const exact = resources.find((row) => {
      const parsed = parseFeatureResourceId(row.id)
      return parsed?.poolId === poolId && parsed.classEntryId === classEntryId
    })
    if (exact) return exact
    const cleric = resources.find((row) => {
      const parsed = parseFeatureResourceId(row.id)
      return parsed?.poolId === poolId && parsed.classSlug === CLERIC_CLASS_SLUG_2024
    })
    if (cleric) return cleric
  }
  return resources.find(matches) ?? null
}

export function findChannelDivinityResource2024(
  resources: SheetResource[],
  classEntryId?: string,
): SheetResource | null {
  return findClericPool2024(resources, CHANNEL_DIVINITY_POOL_ID, classEntryId)
}

/* ------------------------------------------------------------------ */
/* Apply                                                               */
/* ------------------------------------------------------------------ */

export type Cleric2024UseInput = {
  featureId: string
  resourceId: string | null
  resources: SheetResource[]
  classEntryId: string
  clericLevel: number
  wisMod?: number
  /**
   * divine-spark: heal | necrotic | radiant
   * invoke-duplicity: create | move | dismiss | transposition
   * divine-intervention: spell | wish
   */
  mode?: string | null
  /** war-gods-blessing: shield-of-faith | spiritual-weapon. */
  choice?: string | null
  /** divine-intervention: chosen spell slug. */
  spellId?: string | null
  /** preserve-life: HP actually spent from the pool (defaults to the full pool). */
  amount?: number
  featurePicks?: FeaturePicksState | null
  rng?: () => number
}

export type Cleric2024Patches = {
  featurePicks?: FeaturePicksState
  diceExpression?: string | null
  tempHp?: number
  healPool?: number
  damageType?: string
  activeLabels?: string[]
  resistances?: string[]
  concentrationName?: string | null
  wishLockLongRests?: number
}

export type Cleric2024UseResult = {
  ok: boolean
  resources: SheetResource[]
  feedLineRu: string
  message?: string
  patches?: Cleric2024Patches
}

function patchRow(
  resources: SheetResource[],
  id: string,
  patch: (row: SheetResource) => SheetResource,
): SheetResource[] {
  return resources.map((row) => (row.id === id ? clampResource(patch(row)) : row))
}

function poolRow(input: Cleric2024UseInput, poolId: string): SheetResource | null {
  if (input.resourceId) {
    const byId = input.resources.find((row) => row.id === input.resourceId)
    if (byId && parseFeatureResourceId(byId.id)?.poolId === poolId) return byId
  }
  return findClericPool2024(input.resources, poolId, input.classEntryId)
}

function ok(
  input: Cleric2024UseInput,
  feedLineRu: string,
  extra: { resources?: SheetResource[]; patches?: Cleric2024Patches } = {},
): Cleric2024UseResult {
  return {
    ok: true,
    resources: extra.resources ?? input.resources,
    feedLineRu,
    ...(extra.patches ? { patches: extra.patches } : {}),
  }
}

function refuse(input: Cleric2024UseInput, message: string): Cleric2024UseResult {
  return { ok: false, resources: input.resources, feedLineRu: '', message }
}

function spendPool(
  input: Cleric2024UseInput,
  poolId: string,
  missingRu: string,
  exhaustedRu: string,
):
  | { ok: true; resources: SheetResource[] }
  | { ok: false; result: Cleric2024UseResult } {
  const row = poolRow(input, poolId)
  if (!row) return { ok: false, result: refuse(input, missingRu) }
  if (row.used >= row.max) return { ok: false, result: refuse(input, exhaustedRu) }
  return {
    ok: true,
    resources: patchRow(input.resources, row.id, (item) => ({ ...item, used: item.used + 1 })),
  }
}

function spendChannel(input: Cleric2024UseInput) {
  return spendPool(
    input,
    CHANNEL_DIVINITY_POOL_ID,
    `Ресурс «${CHANNEL_DIVINITY_NAME_RU}» не найден`,
    `${CHANNEL_DIVINITY_NAME_RU}: использования закончились (короткий отдых вернёт одно, долгий — все)`,
  )
}

function norm(featureId: string): string {
  return featureId.trim().replace(/_/g, '-')
}

export function applyCleric2024FeatureUse(input: Cleric2024UseInput): Cleric2024UseResult {
  const fid = cleric2024UseFeatureId(input.featureId) ?? norm(input.featureId)
  const level = lvl(input.clericLevel)
  const wisMod = mod(input.wisMod)
  const picks = input.featurePicks ?? { values: {} }

  switch (fid) {
    case 'divine-spark': {
      if (level < CLERIC_CHANNEL_DIVINITY_MIN_LEVEL_2024) {
        return refuse(input, `${DIVINE_SPARK_NAME_RU} с 2 уровня жреца`)
      }
      const mode = (input.mode ?? 'heal') as DivineSparkMode2024
      if (!DIVINE_SPARK_MODES_2024.some((row) => row.id === mode)) {
        return refuse(input, 'Выбери: лечение или урон (некротический / излучением)')
      }
      const spent = spendChannel(input)
      if (!spent.ok) return spent.result
      const formula = divineSparkFormulaRu2024(level, wisMod)
      const line =
        mode === 'heal'
          ? `${DIVINE_SPARK_NAME_RU}: лечение ${formula} хитов существу в 30 фт. (действие «Магия»)`
          : `${DIVINE_SPARK_NAME_RU}: ${formula} ${mode === 'necrotic' ? 'некротического урона' : 'урона излучением'}, спас Тел — половина при успехе (30 фт.)`
      return ok(input, line, {
        resources: spent.resources,
        patches: {
          diceExpression: formula,
          ...(mode === 'heal' ? {} : { damageType: mode }),
        },
      })
    }

    case 'turn-undead': {
      if (level < CLERIC_CHANNEL_DIVINITY_MIN_LEVEL_2024) {
        return refuse(input, `${TURN_UNDEAD_NAME_RU} с 2 уровня жреца`)
      }
      const spent = spendChannel(input)
      if (!spent.ok) return spent.result
      const sear =
        level >= SEAR_UNDEAD_MIN_LEVEL_2024
          ? `; ${SEAR_UNDEAD_NAME_RU}: ${searUndeadFormulaRu2024(wisMod)} излучения каждой нежити, провалившей спасбросок`
          : ''
      return ok(
        input,
        `${TURN_UNDEAD_NAME_RU}: нежить в 30 фт., спас Мдр — при провале Испугана и Недееспособна на 1 мин. (до получения урона)${sear}`,
        {
          resources: spent.resources,
          patches: level >= SEAR_UNDEAD_MIN_LEVEL_2024 ? { diceExpression: searUndeadFormulaRu2024(wisMod) } : undefined,
        },
      )
    }

    case 'sear-undead': {
      if (level < SEAR_UNDEAD_MIN_LEVEL_2024) {
        return refuse(input, `${SEAR_UNDEAD_NAME_RU} с 5 уровня жреца`)
      }
      const formula = searUndeadFormulaRu2024(wisMod)
      return ok(
        input,
        `${SEAR_UNDEAD_NAME_RU}: при «${TURN_UNDEAD_NAME_RU}» — ${formula} излучения каждой нежити, провалившей спасбросок (без траты ресурса)`,
        { patches: { diceExpression: formula } },
      )
    }

    case 'preserve-life': {
      if (level < 3) return refuse(input, `${PRESERVE_LIFE_NAME_RU} с 3 уровня жреца`)
      const pool = preserveLifePool2024(level)
      const hp = Math.floor(input.amount ?? pool)
      if (hp < 1) return refuse(input, 'Распредели хотя бы 1 хит')
      if (hp > pool) return refuse(input, `В пуле только ${pool} хитов`)
      const spent = spendChannel(input)
      if (!spent.ok) return spent.result
      return ok(
        input,
        `${PRESERVE_LIFE_NAME_RU}: ${hp} из ${pool} хитов существам в 30 фт.; каждому — не выше половины максимума (только Окровавленные)`,
        { resources: spent.resources, patches: { healPool: pool } },
      )
    }

    case 'radiance-of-the-dawn': {
      if (level < 3) return refuse(input, `${RADIANCE_OF_THE_DAWN_NAME_RU} с 3 уровня жреца`)
      const spent = spendChannel(input)
      if (!spent.ok) return spent.result
      const formula = radianceOfTheDawnFormulaRu2024(level)
      return ok(
        input,
        `${RADIANCE_OF_THE_DAWN_NAME_RU}: ${formula} излучения, спас Тел — половина при успехе (30 фт.); рассеивает магическую тьму`,
        { resources: spent.resources, patches: { diceExpression: formula, damageType: 'radiant' } },
      )
    }

    case 'guided-strike': {
      if (level < 3) return refuse(input, `${GUIDED_STRIKE_NAME_RU} с 3 уровня жреца`)
      const spent = spendChannel(input)
      if (!spent.ok) return spent.result
      return ok(
        input,
        `${GUIDED_STRIKE_NAME_RU}: +10 к броску атаки (твоей или существа в 30 фт.) — после броска, до определения исхода`,
        { resources: spent.resources },
      )
    }

    case 'war-gods-blessing': {
      if (level < 6) return refuse(input, `${WAR_GODS_BLESSING_NAME_RU} с 6 уровня жреца`)
      const spell = WAR_GODS_BLESSING_SPELLS_2024.find((row) => row.id === input.choice)
      if (!spell) return refuse(input, 'Выбери заклинание: «Щит веры» или «Духовное оружие»')
      const spent = spendChannel(input)
      if (!spent.ok) return spent.result
      return ok(
        input,
        `${WAR_GODS_BLESSING_NAME_RU}: «${spell.nameRu}» через ${CHANNEL_DIVINITY_NAME_RU} вместо ячейки; концентрация не нужна`,
        { resources: spent.resources },
      )
    }

    case 'invoke-duplicity': {
      if (level < 3) return refuse(input, `${INVOKE_DUPLICITY_NAME_RU} с 3 уровня жреца`)
      const mode = (input.mode ?? 'create') as InvokeDuplicityMode2024 | 'transposition'
      const active = getFeaturePick(picks, input.classEntryId, INVOKE_DUPLICITY_ACTIVE_PICK_ID_2024) === 'on'
      const transposition = tricksterTranspositionAvailable2024(level)
        ? `; ${TRICKSTERS_TRANSPOSITION_NAME_RU}: можно поменяться местами с иллюзией`
        : ''
      if (mode === 'create') {
        if (active) return refuse(input, 'Двойник уже создан — перемести или рассей его')
        const spent = spendChannel(input)
        if (!spent.ok) return spent.result
        return ok(
          input,
          `${INVOKE_DUPLICITY_NAME_RU}: иллюзорный двойник в 30 фт. на 1 мин. (бонусное действие, концентрация)${transposition}`,
          {
            resources: spent.resources,
            patches: {
              featurePicks: setFeaturePick(picks, input.classEntryId, INVOKE_DUPLICITY_ACTIVE_PICK_ID_2024, 'on'),
              concentrationName: INVOKE_DUPLICITY_NAME_RU,
              activeLabels: [INVOKE_DUPLICITY_NAME_RU],
            },
          },
        )
      }
      if (!active) return refuse(input, 'Двойник не создан')
      if (mode === 'move') {
        return ok(input, `${INVOKE_DUPLICITY_NAME_RU}: двойник перемещён на 30 фт. (бонусное действие)${transposition}`)
      }
      if (mode === 'transposition') {
        if (!tricksterTranspositionAvailable2024(level)) {
          return refuse(input, `${TRICKSTERS_TRANSPOSITION_NAME_RU} с 6 уровня жреца`)
        }
        return ok(input, `${TRICKSTERS_TRANSPOSITION_NAME_RU}: ты и двойник поменялись местами`)
      }
      if (mode === 'dismiss') {
        const heal = trickeryDuplicityEndHeal2024(level)
        const healLine =
          heal > 0 ? `; ${IMPROVED_DUPLICITY_NAME_RU}: ты или существо в 5 фт. восстанавливает ${heal} хитов` : ''
        return ok(input, `${INVOKE_DUPLICITY_NAME_RU}: двойник рассеян${healLine}`, {
          patches: {
            featurePicks: setFeaturePick(picks, input.classEntryId, INVOKE_DUPLICITY_ACTIVE_PICK_ID_2024, null),
            concentrationName: null,
            activeLabels: [],
            ...(heal > 0 ? { healPool: heal } : {}),
          },
        })
      }
      return refuse(input, 'Выбери действие с двойником')
    }

    case 'warding-flare': {
      const spent = spendPool(
        input,
        WARDING_FLARE_POOL_ID,
        `Ресурс «${WARDING_FLARE_NAME_RU}» не найден`,
        `${WARDING_FLARE_NAME_RU}: использования закончились`,
      )
      if (!spent.ok) return spent.result
      return ok(input, `${WARDING_FLARE_NAME_RU} (реакция): помеха на атаку по тебе от существа в 30 фт.`, {
        resources: spent.resources,
      })
    }

    case 'war-priest': {
      const spent = spendPool(
        input,
        WAR_PRIEST_POOL_ID,
        `Ресурс «${WAR_PRIEST_NAME_RU}» не найден`,
        `${WAR_PRIEST_NAME_RU}: использования закончились`,
      )
      if (!spent.ok) return spent.result
      return ok(input, `${WAR_PRIEST_NAME_RU}: атака оружием бонусным действием после действия «Атака»`, {
        resources: spent.resources,
      })
    }

    case 'corona-of-light': {
      if (level < 17) return refuse(input, `${CORONA_OF_LIGHT_NAME_RU} с 17 уровня жреца`)
      const spent = spendPool(
        input,
        CORONA_OF_LIGHT_POOL_ID,
        `Ресурс «${CORONA_OF_LIGHT_NAME_RU}» не найден`,
        `${CORONA_OF_LIGHT_NAME_RU}: использования закончились (до долгого отдыха)`,
      )
      if (!spent.ok) return spent.result
      return ok(
        input,
        `${CORONA_OF_LIGHT_NAME_RU}: яркий свет 60 фт. на 1 мин.; помеха врагам на спасброски от «${RADIANCE_OF_THE_DAWN_NAME_RU}» и заклинаний огня/излучения`,
        { resources: spent.resources, patches: { activeLabels: [CORONA_OF_LIGHT_NAME_RU] } },
      )
    }

    case 'divine-intervention': {
      const availability = divineInterventionAvailability2024({
        clericLevel: level,
        resources: input.resources,
        featurePicks: picks,
        classEntryId: input.classEntryId,
      })
      if (!availability.available) return refuse(input, availability.reasonRu)
      const row = poolRow(input, DIVINE_INTERVENTION_POOL_ID)!
      const spend = patchRow(input.resources, row.id, (item) => ({ ...item, used: item.used + 1 }))
      const mode = input.mode === 'wish' ? 'wish' : 'spell'

      if (mode === 'wish') {
        if (!availability.wishAvailable) {
          return refuse(input, `${GREATER_DIVINE_INTERVENTION_NAME_RU} с 20 уровня жреца`)
        }
        const lock = rollWishLockLongRests2024(input.rng)
        return ok(
          input,
          `${GREATER_DIVINE_INTERVENTION_NAME_RU}: «${WISH_SPELL_NAME_RU_2024}» без ячейки; ${DIVINE_INTERVENTION_NAME_RU} недоступно ${lock} долг. отд. (2к4)`,
          {
            resources: spend,
            patches: {
              featurePicks: setWishLock2024(picks, input.classEntryId, lock),
              wishLockLongRests: lock,
            },
          },
        )
      }

      const spellId = (input.spellId ?? '').trim()
      if (!spellId) return refuse(input, 'Выбери заклинание жреца до 5 круга')
      return ok(
        input,
        `${DIVINE_INTERVENTION_NAME_RU}: «${spellId}» без ячейки и материальных компонентов (действие «Магия»)`,
        { resources: spend },
      )
    }

    default:
      return refuse(input, `Умение «${input.featureId}» не настроено в диалоге 2024`)
  }
}
