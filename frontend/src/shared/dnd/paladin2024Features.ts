/**
 * Paladin 2024 (PHB): Lay on Hands, Weapon Mastery, Spellcasting, Fighting Style /
 * Blessed Warrior, Paladin's Smite, Channel Divinity (Divine Sense, Abjure Foes + oaths),
 * Extra Attack, Faithful Steed, auras, Radiant Strikes, Restoring Touch, Aura Expansion,
 * and the four PHB oaths (Devotion, Glory, Ancients, Vengeance).
 *
 * Callers branch on `rules_edition === '2024'`; nothing here feeds the 2014 pack
 * (`paladin_2014.json`, «Божественный канал», «Наложение рук», «Использование заклинаний»).
 * Names follow the FINAL Russian list for this slice (next.dnd.su / 2014 analogue where noted).
 */

import {
  getFeaturePick,
  getFeaturePickList,
  setFeaturePick,
  type FeaturePicksState,
} from './featurePicks'
import { parseFeatureResourceId } from './featureResources'
import { clampResource, type SheetResource } from './rest'
import type { SpellSlotState } from './spells'

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL)                                                  */
/* ------------------------------------------------------------------ */

export const LAY_ON_HANDS_NAME_RU = 'Возложение рук'
export const WEAPON_MASTERY_NAME_RU = 'Оружейное мастерство'
export const SPELLCASTING_NAME_RU = 'Сотворение заклинаний'
export const FIGHTING_STYLE_NAME_RU = 'Боевой стиль'
export const BLESSED_WARRIOR_NAME_RU = 'Благословенный воин'
export const PALADINS_SMITE_NAME_RU = 'Кара паладина'
export const DIVINE_SMITE_SPELL_NAME_RU = 'Божественная кара'
export const CHANNEL_DIVINITY_NAME_RU = 'Проведение божественности'
export const DIVINE_SENSE_NAME_RU = 'Божественное чувство'
export const EXTRA_ATTACK_NAME_RU = 'Дополнительная атака'
export const FAITHFUL_STEED_NAME_RU = 'Верный скакун'
/** 2014 / next.dnd.su accepted name for find-steed. */
export const FIND_STEED_SPELL_NAME_RU = 'Обретение скакуна'
export const AURA_OF_PROTECTION_NAME_RU = 'Аура защиты'
export const ABJURE_FOES_NAME_RU = 'Порицание врагов'
export const AURA_OF_COURAGE_NAME_RU = 'Аура отваги'
export const RADIANT_STRIKES_NAME_RU = 'Сияющие удары'
export const RESTORING_TOUCH_NAME_RU = 'Восстанавливающее касание'
export const AURA_EXPANSION_NAME_RU = 'Расширение ауры'

export const OATH_OF_DEVOTION_NAME_RU = 'Клятва преданности'
export const OATH_OF_GLORY_NAME_RU = 'Клятва славы'
export const OATH_OF_THE_ANCIENTS_NAME_RU = 'Клятва древних'
export const OATH_OF_VENGEANCE_NAME_RU = 'Клятва мести'

export const SACRED_WEAPON_NAME_RU = 'Священное оружие'
export const AURA_OF_DEVOTION_NAME_RU = 'Аура преданности'
export const SMITE_OF_PROTECTION_NAME_RU = 'Кара защитника'
export const HOLY_NIMBUS_NAME_RU = 'Священный нимб'

export const INSPIRING_SMITE_NAME_RU = 'Воодушевляющая кара'
export const PEERLESS_ATHLETE_NAME_RU = 'Непревзойдённый атлет'
export const AURA_OF_ALACRITY_NAME_RU = 'Аура рвения'
export const GLORIOUS_DEFENSE_NAME_RU = 'Славная оборона'
export const LIVING_LEGEND_NAME_RU = 'Живая легенда'

export const NATURES_WRATH_NAME_RU = 'Гнев природы'
export const AURA_OF_WARDING_NAME_RU = 'Аура опеки'
export const UNDYING_SENTINEL_NAME_RU = 'Бессмертный страж'
export const ELDER_CHAMPION_NAME_RU = 'Древний чемпион'

export const VOW_OF_ENMITY_NAME_RU = 'Обет вражды'
export const RELENTLESS_AVENGER_NAME_RU = 'Неумолимый мститель'
export const SOUL_OF_VENGEANCE_NAME_RU = 'Душа мести'
export const AVENGING_ANGEL_NAME_RU = 'Ангел возмездия'

/* ------------------------------------------------------------------ */
/* Ids / pools                                                         */
/* ------------------------------------------------------------------ */

export const PALADIN_CLASS_SLUG_2024 = 'paladin'

export const PALADIN_OATH_SLUGS_2024 = {
  devotion: 'paladin__oath-of-devotion',
  glory: 'paladin__oath-of-glory',
  ancients: 'paladin__oath-of-the-ancients',
  vengeance: 'paladin__oath-of-vengeance',
} as const

export type PaladinOathKey2024 = keyof typeof PALADIN_OATH_SLUGS_2024

export const CHANNEL_DIVINITY_POOL_ID = 'channel_divinity'
export const LAY_ON_HANDS_POOL_ID = 'lay_on_hands_hp'
export const PALADIN_FREE_SMITE_POOL_ID = 'paladin_free_smite'
export const PALADIN_FREE_STEED_POOL_ID = 'paladin_free_steed'
export const GLORIOUS_DEFENSE_POOL_ID = 'glorious_defense'
export const UNDYING_SENTINEL_POOL_ID = 'undying_sentinel'
export const HOLY_NIMBUS_POOL_ID = 'holy_nimbus'
export const LIVING_LEGEND_POOL_ID = 'living_legend'
export const ELDER_CHAMPION_POOL_ID = 'elder_champion'
export const AVENGING_ANGEL_POOL_ID = 'avenging_angel'

/** L20 oath capstone pools (1/long; regain via a 5th-circle slot). */
export const PALADIN_L20_CAPSTONE_POOL_IDS_2024 = [
  HOLY_NIMBUS_POOL_ID,
  LIVING_LEGEND_POOL_ID,
  ELDER_CHAMPION_POOL_ID,
  AVENGING_ANGEL_POOL_ID,
] as const

export const BLESSED_WARRIOR_ID = 'blessed-warrior'
export const BLESSED_WARRIOR_CANTRIPS_ID = 'blessed-warrior-cantrips'
export const BLESSED_WARRIOR_CANTRIP_LIMIT_2024 = 2

export const CHANNEL_DIVINITY_MIN_LEVEL_2024 = 3
export const ABJURE_FOES_MIN_LEVEL_2024 = 9
export const AURA_OF_PROTECTION_MIN_LEVEL_2024 = 6
export const AURA_EXPANSION_MIN_LEVEL_2024 = 18
export const RADIANT_STRIKES_MIN_LEVEL_2024 = 11
export const RESTORING_TOUCH_MIN_LEVEL_2024 = 14
export const FAITHFUL_STEED_MIN_LEVEL_2024 = 5
export const PALADINS_SMITE_MIN_LEVEL_2024 = 2
export const FIGHTING_STYLE_MIN_LEVEL_2024 = 2
export const SUBCLASS_MIN_LEVEL_2024 = 3
export const CAPSTONE_MIN_LEVEL_2024 = 20
export const CAPSTONE_REGAIN_SLOT_MIN_2024 = 5

export const RESTORING_TOUCH_CONDITIONS_2024 = [
  'frightened',
  'deafened',
  'blinded',
  'charmed',
  'stunned',
  'paralyzed',
] as const

export type RestoringTouchCondition2024 = (typeof RESTORING_TOUCH_CONDITIONS_2024)[number]

const RESTORING_TOUCH_SET = new Set<string>(RESTORING_TOUCH_CONDITIONS_2024)

const CONDITION_NAME_RU: Record<RestoringTouchCondition2024, string> = {
  frightened: 'Испуганный',
  deafened: 'Оглохший',
  blinded: 'Ослеплённый',
  charmed: 'Очарованный',
  stunned: 'Ошеломлённый',
  paralyzed: 'Парализованный',
}

/* ------------------------------------------------------------------ */
/* Feature names by id (leveling step labels)                          */
/* ------------------------------------------------------------------ */

export const PALADIN_FEATURE_NAMES_BY_ID: Record<string, string> = {
  'lay-on-hands': LAY_ON_HANDS_NAME_RU,
  lay_on_hands: LAY_ON_HANDS_NAME_RU,
  'weapon-mastery': WEAPON_MASTERY_NAME_RU,
  weapon_mastery: WEAPON_MASTERY_NAME_RU,
  spellcasting: SPELLCASTING_NAME_RU,
  'fighting-style': FIGHTING_STYLE_NAME_RU,
  fighting_style: FIGHTING_STYLE_NAME_RU,
  'blessed-warrior': BLESSED_WARRIOR_NAME_RU,
  blessed_warrior: BLESSED_WARRIOR_NAME_RU,
  'paladins-smite': PALADINS_SMITE_NAME_RU,
  paladins_smite: PALADINS_SMITE_NAME_RU,
  'divine-smite': DIVINE_SMITE_SPELL_NAME_RU,
  divine_smite: DIVINE_SMITE_SPELL_NAME_RU,
  'channel-divinity': CHANNEL_DIVINITY_NAME_RU,
  channel_divinity: CHANNEL_DIVINITY_NAME_RU,
  'divine-sense': DIVINE_SENSE_NAME_RU,
  divine_sense: DIVINE_SENSE_NAME_RU,
  'extra-attack': EXTRA_ATTACK_NAME_RU,
  extra_attack: EXTRA_ATTACK_NAME_RU,
  'faithful-steed': FAITHFUL_STEED_NAME_RU,
  faithful_steed: FAITHFUL_STEED_NAME_RU,
  'find-steed': FIND_STEED_SPELL_NAME_RU,
  find_steed: FIND_STEED_SPELL_NAME_RU,
  'aura-of-protection': AURA_OF_PROTECTION_NAME_RU,
  aura_of_protection: AURA_OF_PROTECTION_NAME_RU,
  'abjure-foes': ABJURE_FOES_NAME_RU,
  abjure_foes: ABJURE_FOES_NAME_RU,
  'aura-of-courage': AURA_OF_COURAGE_NAME_RU,
  aura_of_courage: AURA_OF_COURAGE_NAME_RU,
  'radiant-strikes': RADIANT_STRIKES_NAME_RU,
  radiant_strikes: RADIANT_STRIKES_NAME_RU,
  'restoring-touch': RESTORING_TOUCH_NAME_RU,
  restoring_touch: RESTORING_TOUCH_NAME_RU,
  'aura-expansion': AURA_EXPANSION_NAME_RU,
  aura_expansion: AURA_EXPANSION_NAME_RU,
  'sacred-weapon': SACRED_WEAPON_NAME_RU,
  sacred_weapon: SACRED_WEAPON_NAME_RU,
  'aura-of-devotion': AURA_OF_DEVOTION_NAME_RU,
  aura_of_devotion: AURA_OF_DEVOTION_NAME_RU,
  'smite-of-protection': SMITE_OF_PROTECTION_NAME_RU,
  smite_of_protection: SMITE_OF_PROTECTION_NAME_RU,
  'holy-nimbus': HOLY_NIMBUS_NAME_RU,
  holy_nimbus: HOLY_NIMBUS_NAME_RU,
  'inspiring-smite': INSPIRING_SMITE_NAME_RU,
  inspiring_smite: INSPIRING_SMITE_NAME_RU,
  'peerless-athlete': PEERLESS_ATHLETE_NAME_RU,
  peerless_athlete: PEERLESS_ATHLETE_NAME_RU,
  'aura-of-alacrity': AURA_OF_ALACRITY_NAME_RU,
  aura_of_alacrity: AURA_OF_ALACRITY_NAME_RU,
  'glorious-defense': GLORIOUS_DEFENSE_NAME_RU,
  glorious_defense: GLORIOUS_DEFENSE_NAME_RU,
  'living-legend': LIVING_LEGEND_NAME_RU,
  living_legend: LIVING_LEGEND_NAME_RU,
  'natures-wrath': NATURES_WRATH_NAME_RU,
  natures_wrath: NATURES_WRATH_NAME_RU,
  'aura-of-warding': AURA_OF_WARDING_NAME_RU,
  aura_of_warding: AURA_OF_WARDING_NAME_RU,
  'undying-sentinel': UNDYING_SENTINEL_NAME_RU,
  undying_sentinel: UNDYING_SENTINEL_NAME_RU,
  'elder-champion': ELDER_CHAMPION_NAME_RU,
  elder_champion: ELDER_CHAMPION_NAME_RU,
  'vow-of-enmity': VOW_OF_ENMITY_NAME_RU,
  vow_of_enmity: VOW_OF_ENMITY_NAME_RU,
  'relentless-avenger': RELENTLESS_AVENGER_NAME_RU,
  relentless_avenger: RELENTLESS_AVENGER_NAME_RU,
  'soul-of-vengeance': SOUL_OF_VENGEANCE_NAME_RU,
  soul_of_vengeance: SOUL_OF_VENGEANCE_NAME_RU,
  'avenging-angel': AVENGING_ANGEL_NAME_RU,
  avenging_angel: AVENGING_ANGEL_NAME_RU,
  'free-smite': `${PALADINS_SMITE_NAME_RU} (бесплатно)`,
  free_smite: `${PALADINS_SMITE_NAME_RU} (бесплатно)`,
  'paladin-free-smite': `${PALADINS_SMITE_NAME_RU} (бесплатно)`,
  paladin_free_smite: `${PALADINS_SMITE_NAME_RU} (бесплатно)`,
  'free-steed': `${FAITHFUL_STEED_NAME_RU} (бесплатно)`,
  free_steed: `${FAITHFUL_STEED_NAME_RU} (бесплатно)`,
  'paladin-free-steed': `${FAITHFUL_STEED_NAME_RU} (бесплатно)`,
  paladin_free_steed: `${FAITHFUL_STEED_NAME_RU} (бесплатно)`,
  'oath-of-devotion': OATH_OF_DEVOTION_NAME_RU,
  'oath-of-glory': OATH_OF_GLORY_NAME_RU,
  'oath-of-the-ancients': OATH_OF_THE_ANCIENTS_NAME_RU,
  'oath-of-vengeance': OATH_OF_VENGEANCE_NAME_RU,
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function lvl(value: number): number {
  return Math.max(0, Math.floor(value || 0))
}

function mod(value: number | undefined): number {
  return Math.floor(value ?? 0)
}

function norm(featureId: string): string {
  return featureId.trim().replace(/_/g, '-')
}

export function isPaladinClassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return key === PALADIN_CLASS_SLUG_2024 || /паладин/.test(key)
}

/** Pool max: 5 × paladin level. */
export function layOnHandsMax2024(level: number): number {
  return lvl(level) * 5
}

/** Channel Divinity uses: 0 below 3, 2 below 11, 3 at 11+. */
export function channelDivinityMax2024(level: number): number {
  const levelN = lvl(level)
  if (levelN < CHANNEL_DIVINITY_MIN_LEVEL_2024) return 0
  if (levelN < RADIANT_STRIKES_MIN_LEVEL_2024) return 2
  return 3
}

/** Aura of Protection radius: 0 below 6, 10 ft at 6–17, 30 ft at 18+. */
export function auraProtectionRadiusFt2024(level: number): number {
  const levelN = lvl(level)
  if (levelN < AURA_OF_PROTECTION_MIN_LEVEL_2024) return 0
  if (levelN < AURA_EXPANSION_MIN_LEVEL_2024) return 10
  return 30
}

/** Bonus to saves in the aura = Cha mod, minimum +1. */
export function auraProtectionSaveBonus2024(chaMod: number): number {
  return Math.max(1, mod(chaMod))
}

/** Radiant Strikes rider (L11+). */
export function radiantStrikesRiderRu2024(): string {
  return '+1к8 излучения'
}

/** Inspiring Smite temp HP pool formula label: `2к8+N`. */
export function inspiringSmiteTempHpFormulaRu2024(paladinLevel: number): string {
  return `2к8+${lvl(paladinLevel)}`
}

/** Holy Nimbus start-of-turn radiant = Cha mod + proficiency bonus. */
export function holyNimbusDamageFormulaRu2024(chaMod: number, pb: number): string {
  const total = mod(chaMod) + Math.max(0, Math.floor(pb || 0))
  return String(Math.max(0, total))
}

/* ------------------------------------------------------------------ */
/* Blessed Warrior                                                     */
/* ------------------------------------------------------------------ */

function normalizeBlessedWarriorStyle(raw: unknown): boolean {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
  return key === BLESSED_WARRIOR_ID || key === 'blessed-warrior'
}

export function isBlessedWarriorStyleId(styleId: string | null | undefined): boolean {
  return normalizeBlessedWarriorStyle(styleId)
}

/** Read Blessed Warrior cantrip picks (max 2). */
export function readBlessedWarriorCantrips2024(
  picks: FeaturePicksState,
  classEntryId: string,
): string[] {
  const fromHyphen = getFeaturePickList(picks, classEntryId, BLESSED_WARRIOR_CANTRIPS_ID)
  if (fromHyphen.length) return fromHyphen.slice(0, BLESSED_WARRIOR_CANTRIP_LIMIT_2024)
  return getFeaturePickList(picks, classEntryId, 'blessed_warrior_cantrips').slice(
    0,
    BLESSED_WARRIOR_CANTRIP_LIMIT_2024,
  )
}

/** Persist Blessed Warrior cantrips (comma-joined, max 2). */
export function writeBlessedWarriorCantrips2024(
  picks: FeaturePicksState,
  classEntryId: string,
  cantrips: readonly string[],
): FeaturePicksState {
  const cleaned = cantrips
    .map((row) => String(row).trim())
    .filter(Boolean)
    .slice(0, BLESSED_WARRIOR_CANTRIP_LIMIT_2024)
  return setFeaturePick(
    picks,
    classEntryId,
    BLESSED_WARRIOR_CANTRIPS_ID,
    cleaned.length ? cleaned.join(',') : null,
  )
}

/** True when the paladin fighting-style pick is Blessed Warrior. */
export function readBlessedWarriorActive2024(
  picks: FeaturePicksState,
  classEntryId: string,
): boolean {
  const style =
    getFeaturePick(picks, classEntryId, 'fighting_style_paladin') ??
    getFeaturePick(picks, classEntryId, 'fighting-style') ??
    getFeaturePick(picks, classEntryId, 'fighting_style')
  return isBlessedWarriorStyleId(style)
}

/* ------------------------------------------------------------------ */
/* Lay on Hands spend evaluation                                       */
/* ------------------------------------------------------------------ */

export type LayOnHandsSpendInput2024 = {
  heal?: number
  poison?: boolean
  conditions?: readonly string[]
  paladinLevel: number
}

export type LayOnHandsSpendResult2024 = {
  ok: boolean
  cost: number
  message?: string
}

/**
 * Cost model: heal HP = heal; poison = 5 (no heal from that 5);
 * each Restoring Touch condition = 5 (no heal); Restoring Touch requires L14+.
 */
export function evaluateLayOnHandsSpend2024(
  input: LayOnHandsSpendInput2024,
): LayOnHandsSpendResult2024 {
  const heal = Math.floor(input.heal ?? 0)
  if (heal < 0) {
    return { ok: false, cost: 0, message: 'Лечение не может быть отрицательным' }
  }
  const conditions = (input.conditions ?? []).map((row) => String(row).trim().toLowerCase())
  for (const cond of conditions) {
    if (!RESTORING_TOUCH_SET.has(cond)) {
      return {
        ok: false,
        cost: 0,
        message: `Состояние «${cond}» нельзя снять «${RESTORING_TOUCH_NAME_RU}»`,
      }
    }
  }
  if (conditions.length > 0 && lvl(input.paladinLevel) < RESTORING_TOUCH_MIN_LEVEL_2024) {
    return {
      ok: false,
      cost: 0,
      message: `${RESTORING_TOUCH_NAME_RU} с ${RESTORING_TOUCH_MIN_LEVEL_2024} уровня паладина`,
    }
  }
  const poison = Boolean(input.poison)
  if (heal <= 0 && !poison && conditions.length === 0) {
    return {
      ok: false,
      cost: 0,
      message: `Укажи лечение, снятие яда или состояние для «${LAY_ON_HANDS_NAME_RU}»`,
    }
  }
  const cost = heal + (poison ? 5 : 0) + conditions.length * 5
  return { ok: true, cost }
}

/* ------------------------------------------------------------------ */
/* Card buttons / feature id routing                                   */
/* ------------------------------------------------------------------ */

/** Card buttons on ClassFeaturesPanel (edition 2024 only). */
export const PALADIN_2024_CARD_BUTTONS: Record<string, string> = {
  'lay-on-hands': 'Возложение…',
  lay_on_hands: 'Возложение…',
  'divine-sense': 'Чувство…',
  divine_sense: 'Чувство…',
  'abjure-foes': 'Порицать…',
  abjure_foes: 'Порицать…',
  'sacred-weapon': 'Оружие…',
  sacred_weapon: 'Оружие…',
  'natures-wrath': 'Гнев…',
  natures_wrath: 'Гнев…',
  'vow-of-enmity': 'Обет…',
  vow_of_enmity: 'Обет…',
  'inspiring-smite': 'Воодушевить…',
  inspiring_smite: 'Воодушевить…',
  'peerless-athlete': 'Атлет…',
  peerless_athlete: 'Атлет…',
  'free-smite': 'Кара (бесплатно)',
  free_smite: 'Кара (бесплатно)',
  'paladin-free-smite': 'Кара (бесплатно)',
  paladin_free_smite: 'Кара (бесплатно)',
  'free-steed': 'Скакун (бесплатно)',
  free_steed: 'Скакун (бесплатно)',
  'paladin-free-steed': 'Скакун (бесплатно)',
  paladin_free_steed: 'Скакун (бесплатно)',
  'glorious-defense': 'Оборона…',
  glorious_defense: 'Оборона…',
  'undying-sentinel': 'Страж…',
  undying_sentinel: 'Страж…',
  'holy-nimbus': 'Нимб…',
  holy_nimbus: 'Нимб…',
  'living-legend': 'Легенда…',
  living_legend: 'Легенда…',
  'elder-champion': 'Чемпион…',
  elder_champion: 'Чемпион…',
  'avenging-angel': 'Ангел…',
  avenging_angel: 'Ангел…',
}

const PALADIN_USE_FEATURE_IDS = new Set([
  'lay-on-hands',
  'divine-sense',
  'abjure-foes',
  'sacred-weapon',
  'natures-wrath',
  'vow-of-enmity',
  'inspiring-smite',
  'peerless-athlete',
  'free-smite',
  'paladin-free-smite',
  'free-steed',
  'paladin-free-steed',
  'glorious-defense',
  'undying-sentinel',
  'holy-nimbus',
  'living-legend',
  'elder-champion',
  'avenging-angel',
])

const CHANNEL_OPTION_IDS = new Set([
  'divine-sense',
  'abjure-foes',
  'sacred-weapon',
  'natures-wrath',
  'vow-of-enmity',
  'inspiring-smite',
  'peerless-athlete',
])

const FREE_SMITE_IDS = new Set(['free-smite', 'paladin-free-smite'])
const FREE_STEED_IDS = new Set(['free-steed', 'paladin-free-steed'])

const CAPSTONE_BY_FEATURE: Record<string, { poolId: string; nameRu: string }> = {
  'holy-nimbus': { poolId: HOLY_NIMBUS_POOL_ID, nameRu: HOLY_NIMBUS_NAME_RU },
  'living-legend': { poolId: LIVING_LEGEND_POOL_ID, nameRu: LIVING_LEGEND_NAME_RU },
  'elder-champion': { poolId: ELDER_CHAMPION_POOL_ID, nameRu: ELDER_CHAMPION_NAME_RU },
  'avenging-angel': { poolId: AVENGING_ANGEL_POOL_ID, nameRu: AVENGING_ANGEL_NAME_RU },
}

/** Normalize feature ids that open the dialog (`_` → `-`). */
export function paladin2024UseFeatureId(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.trim().replace(/_/g, '-')
  if (FREE_SMITE_IDS.has(key)) return 'free-smite'
  if (FREE_STEED_IDS.has(key)) return 'free-steed'
  return PALADIN_USE_FEATURE_IDS.has(key) ? key : null
}

/* ------------------------------------------------------------------ */
/* Resource lookup                                                     */
/* ------------------------------------------------------------------ */

export function findPaladinPool2024(
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
    const paladin = resources.find((row) => {
      const parsed = parseFeatureResourceId(row.id)
      return parsed?.poolId === poolId && parsed.classSlug === PALADIN_CLASS_SLUG_2024
    })
    if (paladin) return paladin
  }
  return resources.find(matches) ?? null
}

/* ------------------------------------------------------------------ */
/* Level-down                                                          */
/* ------------------------------------------------------------------ */

type UnlockRow = { id: string; nameRu: string; unlockLevel: number }

const PALADIN_UNLOCK_LADDER_2024: readonly UnlockRow[] = [
  { id: 'lay-on-hands', nameRu: LAY_ON_HANDS_NAME_RU, unlockLevel: 1 },
  { id: 'spellcasting', nameRu: SPELLCASTING_NAME_RU, unlockLevel: 1 },
  { id: 'weapon-mastery', nameRu: WEAPON_MASTERY_NAME_RU, unlockLevel: 1 },
  { id: 'fighting-style', nameRu: FIGHTING_STYLE_NAME_RU, unlockLevel: 2 },
  { id: 'paladins-smite', nameRu: PALADINS_SMITE_NAME_RU, unlockLevel: 2 },
  { id: 'channel-divinity', nameRu: CHANNEL_DIVINITY_NAME_RU, unlockLevel: 3 },
  { id: 'subclass', nameRu: 'Подкласс паладина', unlockLevel: 3 },
  { id: 'extra-attack', nameRu: EXTRA_ATTACK_NAME_RU, unlockLevel: 5 },
  { id: 'faithful-steed', nameRu: FAITHFUL_STEED_NAME_RU, unlockLevel: 5 },
  { id: 'aura-of-protection', nameRu: AURA_OF_PROTECTION_NAME_RU, unlockLevel: 6 },
  { id: 'abjure-foes', nameRu: ABJURE_FOES_NAME_RU, unlockLevel: 9 },
  { id: 'aura-of-courage', nameRu: AURA_OF_COURAGE_NAME_RU, unlockLevel: 10 },
  { id: 'radiant-strikes', nameRu: RADIANT_STRIKES_NAME_RU, unlockLevel: 11 },
  { id: 'restoring-touch', nameRu: RESTORING_TOUCH_NAME_RU, unlockLevel: 14 },
  { id: 'aura-expansion', nameRu: AURA_EXPANSION_NAME_RU, unlockLevel: 18 },
]

export type PaladinLevelDownDrops2024 = {
  fromLevel: number
  toLevel: number
  features: UnlockRow[]
  subclass: boolean
  fighting_style: boolean
  blessed_warrior: boolean
  free_smite: boolean
  free_steed: boolean
  restoring_touch: boolean
  aura_expansion: boolean
  channel_max_before: number
  channel_max_after: number
}

/** What a paladin loses when dropping from `fromLevel` to `toLevel`. */
export function paladinLevelDownDrops2024(
  fromLevel: number,
  toLevel: number,
): PaladinLevelDownDrops2024 {
  const from = lvl(fromLevel)
  const to = lvl(toLevel)
  const features = PALADIN_UNLOCK_LADDER_2024.filter(
    (row) => row.unlockLevel <= from && row.unlockLevel > to,
  )
  const dropped = new Set(features.map((row) => row.id))
  return {
    fromLevel: from,
    toLevel: to,
    features,
    subclass: dropped.has('subclass'),
    fighting_style: dropped.has('fighting-style'),
    blessed_warrior: dropped.has('fighting-style'),
    free_smite: dropped.has('paladins-smite'),
    free_steed: dropped.has('faithful-steed'),
    restoring_touch: dropped.has('restoring-touch'),
    aura_expansion: dropped.has('aura-expansion'),
    channel_max_before: channelDivinityMax2024(from),
    channel_max_after: channelDivinityMax2024(to),
  }
}

/* ------------------------------------------------------------------ */
/* Apply                                                               */
/* ------------------------------------------------------------------ */

export type Paladin2024UseInput = {
  featureId: string
  resourceId: string | null
  resources: SheetResource[]
  classEntryId: string
  paladinLevel: number
  chaMod?: number
  proficiencyBonus?: number
  /**
   * channel options / free smite|steed / capstones:
   * `spend` (default) | `refund` | `regain` (capstone via 5th+ slot).
   */
  mode?: string | null
  /** lay-on-hands: HP to restore. */
  heal?: number
  /** lay-on-hands: spend 5 to end Poisoned. */
  poison?: boolean
  /** lay-on-hands Restoring Touch condition slugs. */
  conditions?: readonly string[]
  /** Capstone regain: spell slot circle (≥5). */
  slotLevel?: number
  slots?: Record<string, SpellSlotState>
  featurePicks?: FeaturePicksState | null
}

export type Paladin2024Patches = {
  featurePicks?: FeaturePicksState
  diceExpression?: string | null
  tempHp?: number
  healPool?: number
  damageType?: string
  activeLabels?: string[]
  concentrationName?: string | null
  conditionsEnded?: string[]
}

export type Paladin2024UseResult = {
  ok: boolean
  resources: SheetResource[]
  slots?: Record<string, SpellSlotState>
  feedLineRu: string
  message?: string
  patches?: Paladin2024Patches
}

function patchRow(
  resources: SheetResource[],
  id: string,
  patch: (row: SheetResource) => SheetResource,
): SheetResource[] {
  return resources.map((row) => (row.id === id ? clampResource(patch(row)) : row))
}

function poolRow(input: Paladin2024UseInput, poolId: string): SheetResource | null {
  if (input.resourceId) {
    const byId = input.resources.find((row) => row.id === input.resourceId)
    if (byId && parseFeatureResourceId(byId.id)?.poolId === poolId) return byId
  }
  return findPaladinPool2024(input.resources, poolId, input.classEntryId)
}

function ok(
  input: Paladin2024UseInput,
  feedLineRu: string,
  extra: {
    resources?: SheetResource[]
    slots?: Record<string, SpellSlotState>
    patches?: Paladin2024Patches
  } = {},
): Paladin2024UseResult {
  return {
    ok: true,
    resources: extra.resources ?? input.resources,
    feedLineRu,
    ...(extra.slots ? { slots: extra.slots } : {}),
    ...(extra.patches ? { patches: extra.patches } : {}),
  }
}

function refuse(input: Paladin2024UseInput, message: string): Paladin2024UseResult {
  return { ok: false, resources: input.resources, feedLineRu: '', message }
}

function spendPool(
  input: Paladin2024UseInput,
  poolId: string,
  missingRu: string,
  exhaustedRu: string,
):
  | { ok: true; resources: SheetResource[] }
  | { ok: false; result: Paladin2024UseResult } {
  const row = poolRow(input, poolId)
  if (!row) return { ok: false, result: refuse(input, missingRu) }
  if (row.used >= row.max) return { ok: false, result: refuse(input, exhaustedRu) }
  return {
    ok: true,
    resources: patchRow(input.resources, row.id, (item) => ({ ...item, used: item.used + 1 })),
  }
}

function refundPool(
  input: Paladin2024UseInput,
  poolId: string,
  nameRu: string,
):
  | { ok: true; resources: SheetResource[] }
  | { ok: false; result: Paladin2024UseResult } {
  const row = poolRow(input, poolId)
  if (!row) return { ok: false, result: refuse(input, `Ресурс «${nameRu}» не найден`) }
  if (row.used <= 0) {
    return { ok: false, result: refuse(input, `«${nameRu}» уже полностью доступно`) }
  }
  return {
    ok: true,
    resources: patchRow(input.resources, row.id, (item) => ({
      ...item,
      used: Math.max(0, item.used - 1),
    })),
  }
}

function spendChannel(input: Paladin2024UseInput) {
  return spendPool(
    input,
    CHANNEL_DIVINITY_POOL_ID,
    `Ресурс «${CHANNEL_DIVINITY_NAME_RU}» не найден`,
    `${CHANNEL_DIVINITY_NAME_RU}: использования закончились (короткий отдых вернёт одно, долгий — все)`,
  )
}

function refundChannel(input: Paladin2024UseInput) {
  return refundPool(input, CHANNEL_DIVINITY_POOL_ID, CHANNEL_DIVINITY_NAME_RU)
}

function channelOptionName(fid: string): string {
  switch (fid) {
    case 'divine-sense':
      return DIVINE_SENSE_NAME_RU
    case 'abjure-foes':
      return ABJURE_FOES_NAME_RU
    case 'sacred-weapon':
      return SACRED_WEAPON_NAME_RU
    case 'natures-wrath':
      return NATURES_WRATH_NAME_RU
    case 'vow-of-enmity':
      return VOW_OF_ENMITY_NAME_RU
    case 'inspiring-smite':
      return INSPIRING_SMITE_NAME_RU
    case 'peerless-athlete':
      return PEERLESS_ATHLETE_NAME_RU
    default:
      return fid
  }
}

function channelOptionMinLevel(fid: string): number {
  if (fid === 'abjure-foes') return ABJURE_FOES_MIN_LEVEL_2024
  return CHANNEL_DIVINITY_MIN_LEVEL_2024
}

function channelOptionFeed(fid: string, level: number): string {
  const name = channelOptionName(fid)
  switch (fid) {
    case 'divine-sense':
      return `${CHANNEL_DIVINITY_NAME_RU}: ${name} (бонусное, 10 мин., 60 фт.)`
    case 'abjure-foes':
      return `${CHANNEL_DIVINITY_NAME_RU}: ${name} — выбранные враги в 60 фт., спас Мдр; провал: Испуганы и скорость 0 (1 мин.)`
    case 'sacred-weapon':
      return `${CHANNEL_DIVINITY_NAME_RU}: ${name} — оружие на 10 мин. (бонус Хар к атаке; опционально урон излучением и свет)`
    case 'natures-wrath':
      return `${CHANNEL_DIVINITY_NAME_RU}: ${name} — призрачные лозы опутывают врагов (спас Силы)`
    case 'vow-of-enmity':
      return `${CHANNEL_DIVINITY_NAME_RU}: ${name} — преимущество к атакам по одной цели (1 мин., бонусное)`
    case 'inspiring-smite':
      return `${CHANNEL_DIVINITY_NAME_RU}: ${name} — после «${DIVINE_SMITE_SPELL_NAME_RU}» раздай врем. хиты ${inspiringSmiteTempHpFormulaRu2024(level)} существам в 30 фт. (бонусное)`
    case 'peerless-athlete':
      return `${CHANNEL_DIVINITY_NAME_RU}: ${name} — преимущество к СИЛ/ЛОВ проверкам и прыжкам (1 час, бонусное)`
    default:
      return `${CHANNEL_DIVINITY_NAME_RU}: ${name}`
  }
}

function spendLayOnHandsHp(
  input: Paladin2024UseInput,
  cost: number,
):
  | { ok: true; resources: SheetResource[] }
  | { ok: false; result: Paladin2024UseResult } {
  const row = poolRow(input, LAY_ON_HANDS_POOL_ID)
  if (!row) {
    return { ok: false, result: refuse(input, `Ресурс «${LAY_ON_HANDS_NAME_RU}» не найден`) }
  }
  const left = Math.max(0, row.max - row.used)
  if (cost > left) {
    return {
      ok: false,
      result: refuse(input, `${LAY_ON_HANDS_NAME_RU}: в пуле только ${left} хитов`),
    }
  }
  return {
    ok: true,
    resources: patchRow(input.resources, row.id, (item) => ({
      ...item,
      used: item.used + cost,
    })),
  }
}

function regainCapstoneViaSlot(
  input: Paladin2024UseInput,
  poolId: string,
  nameRu: string,
): Paladin2024UseResult {
  const row = poolRow(input, poolId)
  if (!row) return refuse(input, `Ресурс «${nameRu}» не найден`)
  if (row.used <= 0) return refuse(input, `«${nameRu}» уже доступно`)
  const slotLevel = Math.floor(input.slotLevel ?? 0)
  if (slotLevel < CAPSTONE_REGAIN_SLOT_MIN_2024) {
    return refuse(input, `Нужна ячейка ${CAPSTONE_REGAIN_SLOT_MIN_2024} круга или выше`)
  }
  const slots = input.slots ?? {}
  const slot = slots[String(slotLevel)]
  if (!slot || slot.max <= 0 || slot.used >= slot.max) {
    return refuse(input, `Нет свободной ячейки ${slotLevel} круга`)
  }
  return ok(
    input,
    `${nameRu}: ячейка ${slotLevel} круга (без действия) — использование вернулось`,
    {
      resources: patchRow(input.resources, row.id, (item) => ({
        ...item,
        used: Math.max(0, item.used - 1),
      })),
      slots: { ...slots, [String(slotLevel)]: { ...slot, used: slot.used + 1 } },
    },
  )
}

function applyCapstone(
  input: Paladin2024UseInput,
  fid: string,
  level: number,
  chaMod: number,
  pb: number,
): Paladin2024UseResult {
  const meta = CAPSTONE_BY_FEATURE[fid]
  if (!meta) return refuse(input, `Умение «${input.featureId}» не настроено в диалоге 2024`)
  if (level < CAPSTONE_MIN_LEVEL_2024) {
    return refuse(input, `${meta.nameRu} с ${CAPSTONE_MIN_LEVEL_2024} уровня паладина`)
  }
  const mode = (input.mode ?? 'spend').trim().toLowerCase()
  if (mode === 'regain' || mode === 'refund') {
    return regainCapstoneViaSlot(input, meta.poolId, meta.nameRu)
  }
  const spent = spendPool(
    input,
    meta.poolId,
    `Ресурс «${meta.nameRu}» не найден`,
    `${meta.nameRu}: использования закончились (долгий отдых или ячейка ${CAPSTONE_REGAIN_SLOT_MIN_2024}+ вернут)`,
  )
  if (!spent.ok) return spent.result

  if (fid === 'holy-nimbus') {
    const dmg = holyNimbusDamageFormulaRu2024(chaMod, pb)
    return ok(
      input,
      `${HOLY_NIMBUS_NAME_RU}: 10 мин. яркий свет 30 фт.; враг в начале хода в ярком свете получает ${dmg} излучения; преимущество на спас vs заклинаний исчадий/нежити`,
      {
        resources: spent.resources,
        patches: {
          damageType: 'radiant',
          activeLabels: [HOLY_NIMBUS_NAME_RU],
          diceExpression: dmg,
        },
      },
    )
  }
  if (fid === 'living-legend') {
    return ok(
      input,
      `${LIVING_LEGEND_NAME_RU}: 1 мин. — преимущество к проверкам Харизмы; реакцией перебросить провал проверки; чудо «Убеждения» (1/эффект)`,
      { resources: spent.resources, patches: { activeLabels: [LIVING_LEGEND_NAME_RU] } },
    )
  }
  if (fid === 'elder-champion') {
    return ok(
      input,
      `${ELDER_CHAMPION_NAME_RU}: 1 мин. — реген в начале хода; заклинания паладина действием — как бонусное; враги в 10 фт. с помехой на спас от твоих заклинаний`,
      { resources: spent.resources, patches: { activeLabels: [ELDER_CHAMPION_NAME_RU] } },
    )
  }
  return ok(
    input,
    `${AVENGING_ANGEL_NAME_RU}: крылья (полёт), аура страха на 1 час`,
    { resources: spent.resources, patches: { activeLabels: [AVENGING_ANGEL_NAME_RU] } },
  )
}

export function applyPaladin2024FeatureUse(input: Paladin2024UseInput): Paladin2024UseResult {
  const fid = paladin2024UseFeatureId(input.featureId) ?? norm(input.featureId)
  const level = lvl(input.paladinLevel)
  const chaMod = mod(input.chaMod)
  const pb = Math.max(0, Math.floor(input.proficiencyBonus ?? 2))
  const mode = (input.mode ?? 'spend').trim().toLowerCase()

  if (CHANNEL_OPTION_IDS.has(fid)) {
    const minLevel = channelOptionMinLevel(fid)
    if (level < minLevel) {
      return refuse(input, `${channelOptionName(fid)} с ${minLevel} уровня паладина`)
    }
    if (mode === 'refund') {
      const refunded = refundChannel(input)
      if (!refunded.ok) return refunded.result
      return ok(
        input,
        `${CHANNEL_DIVINITY_NAME_RU}: возврат использования («${channelOptionName(fid)}»)`,
        { resources: refunded.resources },
      )
    }
    const spent = spendChannel(input)
    if (!spent.ok) return spent.result
    const patches: Paladin2024Patches | undefined =
      fid === 'inspiring-smite'
        ? {
            diceExpression: inspiringSmiteTempHpFormulaRu2024(level),
            tempHp: undefined,
          }
        : fid === 'sacred-weapon' || fid === 'vow-of-enmity' || fid === 'peerless-athlete'
          ? { activeLabels: [channelOptionName(fid)] }
          : undefined
    return ok(input, channelOptionFeed(fid, level), {
      resources: spent.resources,
      ...(patches ? { patches } : {}),
    })
  }

  if (FREE_SMITE_IDS.has(fid) || fid === 'free-smite') {
    if (level < PALADINS_SMITE_MIN_LEVEL_2024) {
      return refuse(input, `${PALADINS_SMITE_NAME_RU} с ${PALADINS_SMITE_MIN_LEVEL_2024} уровня паладина`)
    }
    if (mode === 'refund') {
      const refunded = refundPool(input, PALADIN_FREE_SMITE_POOL_ID, PALADINS_SMITE_NAME_RU)
      if (!refunded.ok) return refunded.result
      return ok(input, `${PALADINS_SMITE_NAME_RU}: бесплатное применение «${DIVINE_SMITE_SPELL_NAME_RU}» возвращено`, {
        resources: refunded.resources,
      })
    }
    const spent = spendPool(
      input,
      PALADIN_FREE_SMITE_POOL_ID,
      `Ресурс бесплатной «${DIVINE_SMITE_SPELL_NAME_RU}» не найден`,
      `${PALADINS_SMITE_NAME_RU}: бесплатное применение уже использовано (долгий отдых вернёт)`,
    )
    if (!spent.ok) return spent.result
    return ok(
      input,
      `${PALADINS_SMITE_NAME_RU}: «${DIVINE_SMITE_SPELL_NAME_RU}» без ячейки (1/долг. отд.)`,
      { resources: spent.resources },
    )
  }

  if (FREE_STEED_IDS.has(fid) || fid === 'free-steed') {
    if (level < FAITHFUL_STEED_MIN_LEVEL_2024) {
      return refuse(input, `${FAITHFUL_STEED_NAME_RU} с ${FAITHFUL_STEED_MIN_LEVEL_2024} уровня паладина`)
    }
    if (mode === 'refund') {
      const refunded = refundPool(input, PALADIN_FREE_STEED_POOL_ID, FAITHFUL_STEED_NAME_RU)
      if (!refunded.ok) return refunded.result
      return ok(input, `${FAITHFUL_STEED_NAME_RU}: бесплатное «${FIND_STEED_SPELL_NAME_RU}» возвращено`, {
        resources: refunded.resources,
      })
    }
    const spent = spendPool(
      input,
      PALADIN_FREE_STEED_POOL_ID,
      `Ресурс бесплатного «${FIND_STEED_SPELL_NAME_RU}» не найден`,
      `${FAITHFUL_STEED_NAME_RU}: бесплатное применение уже использовано (долгий отдых вернёт)`,
    )
    if (!spent.ok) return spent.result
    return ok(
      input,
      `${FAITHFUL_STEED_NAME_RU}: «${FIND_STEED_SPELL_NAME_RU}» без ячейки (1/долг. отд.)`,
      { resources: spent.resources },
    )
  }

  switch (fid) {
    case 'lay-on-hands': {
      const evalResult = evaluateLayOnHandsSpend2024({
        heal: input.heal,
        poison: input.poison,
        conditions: input.conditions,
        paladinLevel: level,
      })
      if (!evalResult.ok) return refuse(input, evalResult.message ?? 'Нельзя применить')
      const spent = spendLayOnHandsHp(input, evalResult.cost)
      if (!spent.ok) return spent.result
      const parts: string[] = []
      const heal = Math.floor(input.heal ?? 0)
      if (heal > 0) parts.push(`лечение ${heal} хитов`)
      if (input.poison) parts.push('снят яд (−5)')
      const conds = (input.conditions ?? [])
        .map((row) => String(row).trim().toLowerCase())
        .filter((row): row is RestoringTouchCondition2024 => RESTORING_TOUCH_SET.has(row))
      if (conds.length) {
        parts.push(
          `${RESTORING_TOUCH_NAME_RU}: ${conds.map((c) => CONDITION_NAME_RU[c]).join(', ')} (−${conds.length * 5})`,
        )
      }
      return ok(input, `${LAY_ON_HANDS_NAME_RU}: ${parts.join('; ')} (всего −${evalResult.cost})`, {
        resources: spent.resources,
        patches: {
          healPool: heal > 0 ? heal : undefined,
          conditionsEnded: [
            ...(input.poison ? ['poisoned'] : []),
            ...conds,
          ],
        },
      })
    }

    case 'glorious-defense': {
      if (level < 15) return refuse(input, `${GLORIOUS_DEFENSE_NAME_RU} с 15 уровня паладина`)
      if (mode === 'refund') {
        const refunded = refundPool(input, GLORIOUS_DEFENSE_POOL_ID, GLORIOUS_DEFENSE_NAME_RU)
        if (!refunded.ok) return refunded.result
        return ok(input, `${GLORIOUS_DEFENSE_NAME_RU}: использование возвращено`, {
          resources: refunded.resources,
        })
      }
      const spent = spendPool(
        input,
        GLORIOUS_DEFENSE_POOL_ID,
        `Ресурс «${GLORIOUS_DEFENSE_NAME_RU}» не найден`,
        `${GLORIOUS_DEFENSE_NAME_RU}: использования закончились`,
      )
      if (!spent.ok) return spent.result
      const bonus = auraProtectionSaveBonus2024(chaMod)
      return ok(
        input,
        `${GLORIOUS_DEFENSE_NAME_RU} (реакция): +${bonus} к КД против атаки по тебе или союзнику в 10 фт.; при промахе — одна атака по атакующему`,
        { resources: spent.resources },
      )
    }

    case 'undying-sentinel': {
      if (level < 15) return refuse(input, `${UNDYING_SENTINEL_NAME_RU} с 15 уровня паладина`)
      if (mode === 'refund') {
        const refunded = refundPool(input, UNDYING_SENTINEL_POOL_ID, UNDYING_SENTINEL_NAME_RU)
        if (!refunded.ok) return refunded.result
        return ok(input, `${UNDYING_SENTINEL_NAME_RU}: использование возвращено`, {
          resources: refunded.resources,
        })
      }
      const spent = spendPool(
        input,
        UNDYING_SENTINEL_POOL_ID,
        `Ресурс «${UNDYING_SENTINEL_NAME_RU}» не найден`,
        `${UNDYING_SENTINEL_NAME_RU}: уже использовано (до долгого отдыха)`,
      )
      if (!spent.ok) return spent.result
      return ok(
        input,
        `${UNDYING_SENTINEL_NAME_RU}: при снижении до 0 хитов без мгновенной смерти — остаёшься с 1 хитом`,
        { resources: spent.resources, patches: { healPool: 1 } },
      )
    }

    case 'holy-nimbus':
    case 'living-legend':
    case 'elder-champion':
    case 'avenging-angel':
      return applyCapstone(input, fid, level, chaMod, pb)

    default:
      return refuse(input, `Умение «${input.featureId}» не настроено в диалоге 2024`)
  }
}
