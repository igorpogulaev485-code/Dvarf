/**
 * P24-M02B-artificer: all six book specialties (5 EFA + RTW Reanimator).
 * Callers must branch on rules_edition === '2024'; does not feed 2014 «Изобретатель».
 */

import { alwaysPreparedForSubclass2024, isPhb2024CreateSubclass } from './edition2024Subclasses'
import {
  ARTIFICER_SUBCLASS_SLUGS_2024,
  ADVENTURERS_ATLAS_NAME_RU,
  ALCHEMICAL_SAVANT_NAME_RU,
  ARCANE_ARMOR_NAME_RU,
  ARCANE_FIREARM_NAME_RU,
  ARCANE_JOLT_NAME_RU,
  ARMOR_MODEL_NAME_RU,
  ARMOR_MODIFICATIONS_NAME_RU,
  BATTLE_READY_NAME_RU,
  CHEMICAL_MASTERY_NAME_RU,
  ELDRITCH_CANNON_NAME_RU,
  EXPERIMENTAL_ELIXIR_NAME_RU,
  EXTRA_ATTACK_NAME_RU,
  FORTIFIED_POSITION_NAME_RU,
  GUIDED_PRECISION_NAME_RU,
  IMPROVED_DEFENDER_NAME_RU,
  INGENIOUS_MOVEMENT_NAME_RU,
  MAPPING_MAGIC_NAME_RU,
  PERFECTED_ARMOR_NAME_RU,
  RESTORATIVE_REAGENTS_NAME_RU,
  STEEL_DEFENDER_NAME_RU,
  SUPERIOR_ATLAS_NAME_RU,
  TOOLS_OF_THE_TRADE_NAME_RU,
  EXPLOSIVE_CANNON_NAME_RU,
} from './artificer2024Features'

export const M02B_ARTIFICER_BOOK_SLUGS = [
  'artificer__alchemist',
  'artificer__armorer',
  'artificer__artillerist',
  'artificer__battle-smith',
  'artificer__cartographer',
  'artificer__reanimator',
] as const

export type M02bArtificerBookSlug = (typeof M02B_ARTIFICER_BOOK_SLUGS)[number]

export const REANIMATOR_SLUG = 'artificer__reanimator'

export function isM02bArtificerBookSubclass(slug: string | null | undefined): boolean {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
  return (M02B_ARTIFICER_BOOK_SLUGS as readonly string[]).includes(key)
}

export function isReanimator2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === REANIMATOR_SLUG
}

/** Assert allowlist opens these six book paths (selfcheck). */
export function artificerBookAllowlistOpen2024(slug: string): boolean {
  return isPhb2024CreateSubclass(slug) && isM02bArtificerBookSubclass(slug)
}

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL for this pack)                                    */
/* ------------------------------------------------------------------ */

export const REANIMATOR_NAME_RU = 'Реаниматор'
export const REANIMATOR_SPELLS_NAME_RU = 'Заклинания Реаниматора'
export const REANIMATOR_SKILL_SET_NAME_RU = 'Навыки Реаниматора'
export const REVIVING_BOLT_NAME_RU = 'Оживляющий разряд'
export const REANIMATOR_TOOLS_NAME_RU = 'Инструменты Реаниматора'
export const REANIMATED_COMPANION_NAME_RU = 'Реанимированный спутник'
export const DEATH_BURST_NAME_RU = 'Взрыв смерти'
export const LIGHTNING_ABSORPTION_NAME_RU = 'Поглощение электричества'
export const DREADFUL_SWIPE_NAME_RU = 'Ужасающий замах'
export const STRANGE_MODIFICATIONS_NAME_RU = 'Чуждые модификации'
export const MAGICAL_CONDUIT_NAME_RU = 'Магический проводник'
export const FEROCITY_NAME_RU = 'Свирепость'
export const IMPROVED_REANIMATION_NAME_RU = 'Улучшенная реанимация'
export const MACABRE_MODIFICATIONS_NAME_RU = 'Ужасные модификации'
export const BLOATED_NAME_RU = 'Раздутый'
export const GAUNT_NAME_RU = 'Тощий'
export const SODDEN_NAME_RU = 'Влажный'
export const REFINED_REANIMATION_NAME_RU = 'Отточенная реанимация'
export const EASED_RAISE_NAME_RU = 'Облегчённое воскрешение'
export const LIFE_TRANSFER_NAME_RU = 'Перекачивание жизни'
export const PERFECT_MODIFICATIONS_NAME_RU = 'Совершенные модификации'

/** Forbidden labels for this pack (catalog / UI). */
export const FORBIDDEN_ARTIFICER_BOOK_LABELS_2024 = ['Оживлённый спутник'] as const

/* ------------------------------------------------------------------ */
/* Feature / pool ids                                                  */
/* ------------------------------------------------------------------ */

export const REANIMATOR_SPELLS_FEATURE_ID = 'reanimator-spells'
export const REANIMATOR_SKILL_SET_FEATURE_ID = 'reanimator-s-skill-set'
export const REANIMATED_COMPANION_FEATURE_ID = 'reanimated-companion'
export const STRANGE_MODIFICATIONS_FEATURE_ID = 'strange-modifications'
export const IMPROVED_REANIMATION_FEATURE_ID = 'improved-reanimation'
export const MACABRE_MODIFICATIONS_FEATURE_ID = 'macabre-modifications'
export const REFINED_REANIMATION_FEATURE_ID = 'refined-reanimation'

export const REANIMATED_COMPANION_POOL_ID = 'reanimated_companion'
export const REVIVING_BOLT_POOL_ID = 'reviving_bolt'
export const EASED_RAISE_POOL_ID = 'eased_raise_dead'
export const MAPPING_FAERIE_FIRE_POOL_ID = 'mapping_faerie_fire'
export const CHEMICAL_MASTERY_CAULDRON_POOL_ID = 'chemical_mastery_cauldron'

export const STRANGE_MODIFICATION_IDS = [
  'magical_conduit',
  'ferocity',
  'bloated',
  'gaunt',
  'sodden',
] as const

export type StrangeModificationId2024 = (typeof STRANGE_MODIFICATION_IDS)[number]

export const STRANGE_MODIFICATION_OPTIONS_L5 = [
  { id: 'magical_conduit', nameRu: MAGICAL_CONDUIT_NAME_RU },
  { id: 'ferocity', nameRu: FEROCITY_NAME_RU },
] as const

export const STRANGE_MODIFICATION_OPTIONS_L9 = [
  ...STRANGE_MODIFICATION_OPTIONS_L5,
  { id: 'bloated', nameRu: BLOATED_NAME_RU },
  { id: 'gaunt', nameRu: GAUNT_NAME_RU },
  { id: 'sodden', nameRu: SODDEN_NAME_RU },
] as const

export function strangeModificationPickCount2024(artificerLevel: number): number {
  const n = Math.max(0, Math.floor(artificerLevel) || 0)
  if (n >= 15) return 3
  if (n >= 9) return 2
  if (n >= 5) return 1
  return 0
}

export function strangeModificationOptions2024(artificerLevel: number) {
  return artificerLevel >= 9 ? STRANGE_MODIFICATION_OPTIONS_L9 : STRANGE_MODIFICATION_OPTIONS_L5
}

export function revivingBoltDamageDice2024(artificerLevel: number): string {
  const n = Math.max(0, Math.floor(artificerLevel) || 0)
  if (n >= 17) return '4к4'
  if (n >= 11) return '3к4'
  return '2к4'
}

export function deathBurstDamageDice2024(artificerLevel: number): string {
  return Math.max(0, Math.floor(artificerLevel) || 0) >= 9 ? '4к4' : '2к4'
}

export function dreadfulSwipeDamageDice2024(input: {
  artificerLevel: number
  hasFerocity: boolean
}): string {
  return input.hasFerocity ? '1к6' : '1к4'
}

/* ------------------------------------------------------------------ */
/* Feature ids by level (grid 3 / 5 / 9 / 15)                          */
/* ------------------------------------------------------------------ */

export const ALCHEMIST_FEATURES_BY_LEVEL: Record<number, readonly string[]> = {
  3: ['tools-of-the-trade', 'alchemist-spells', 'experimental-elixir'],
  5: ['alchemical-savant'],
  9: ['restorative-reagents'],
  15: ['chemical-mastery'],
}

export const ARMORER_FEATURES_BY_LEVEL: Record<number, readonly string[]> = {
  3: ['tools-of-the-trade', 'armorer-spells', 'arcane-armor', 'armor-model'],
  5: ['extra-attack'],
  9: ['armor-modifications'],
  15: ['perfected-armor'],
}

export const ARTILLERIST_FEATURES_BY_LEVEL: Record<number, readonly string[]> = {
  3: ['tools-of-the-trade', 'artillerist-spells', 'eldritch-cannon'],
  5: ['arcane-firearm'],
  9: ['explosive-cannon'],
  15: ['fortified-position'],
}

export const BATTLE_SMITH_FEATURES_BY_LEVEL: Record<number, readonly string[]> = {
  3: ['tools-of-the-trade', 'battle-smith-spells', 'battle-ready', 'steel-defender'],
  5: ['extra-attack'],
  9: ['arcane-jolt'],
  15: ['improved-defender'],
}

export const CARTOGRAPHER_FEATURES_BY_LEVEL: Record<number, readonly string[]> = {
  3: ['tools-of-the-trade', 'cartographer-spells', 'adventure-atlas', 'mapping-magic'],
  5: ['guided-precision'],
  9: ['brilliant-path'],
  15: ['superior-atlas'],
}

export const REANIMATOR_FEATURES_BY_LEVEL: Record<number, readonly string[]> = {
  3: [REANIMATOR_SPELLS_FEATURE_ID, REANIMATOR_SKILL_SET_FEATURE_ID, REANIMATED_COMPANION_FEATURE_ID],
  5: [STRANGE_MODIFICATIONS_FEATURE_ID],
  9: [IMPROVED_REANIMATION_FEATURE_ID, MACABRE_MODIFICATIONS_FEATURE_ID],
  15: [REFINED_REANIMATION_FEATURE_ID],
}

const LEVEL_GATES = [3, 5, 9, 15] as const

function featuresAtGates(
  table: Record<number, readonly string[]>,
  level: number,
): string[] {
  const n = Math.max(0, Math.floor(level) || 0)
  const out: string[] = []
  for (const gate of LEVEL_GATES) {
    if (n >= gate) out.push(...(table[gate] ?? []))
  }
  return out
}

export function artificerBookFeatureIdsAtLevel2024(
  slug: string | null | undefined,
  level: number,
): string[] {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
  if (key === ARTIFICER_SUBCLASS_SLUGS_2024.alchemist) {
    return featuresAtGates(ALCHEMIST_FEATURES_BY_LEVEL, level)
  }
  if (key === ARTIFICER_SUBCLASS_SLUGS_2024.armorer) {
    return featuresAtGates(ARMORER_FEATURES_BY_LEVEL, level)
  }
  if (key === ARTIFICER_SUBCLASS_SLUGS_2024.artillerist) {
    return featuresAtGates(ARTILLERIST_FEATURES_BY_LEVEL, level)
  }
  if (key === ARTIFICER_SUBCLASS_SLUGS_2024.battleSmith) {
    return featuresAtGates(BATTLE_SMITH_FEATURES_BY_LEVEL, level)
  }
  if (key === ARTIFICER_SUBCLASS_SLUGS_2024.cartographer) {
    return featuresAtGates(CARTOGRAPHER_FEATURES_BY_LEVEL, level)
  }
  if (key === REANIMATOR_SLUG) {
    return featuresAtGates(REANIMATOR_FEATURES_BY_LEVEL, level)
  }
  return []
}

export const REANIMATOR_FEATURE_NAMES: Record<string, string> = {
  [REANIMATOR_SPELLS_FEATURE_ID]: REANIMATOR_SPELLS_NAME_RU,
  [REANIMATOR_SKILL_SET_FEATURE_ID]: REANIMATOR_SKILL_SET_NAME_RU,
  [REANIMATED_COMPANION_FEATURE_ID]: REANIMATED_COMPANION_NAME_RU,
  [STRANGE_MODIFICATIONS_FEATURE_ID]: STRANGE_MODIFICATIONS_NAME_RU,
  [IMPROVED_REANIMATION_FEATURE_ID]: IMPROVED_REANIMATION_NAME_RU,
  [MACABRE_MODIFICATIONS_FEATURE_ID]: MACABRE_MODIFICATIONS_NAME_RU,
  [REFINED_REANIMATION_FEATURE_ID]: REFINED_REANIMATION_NAME_RU,
}

export const EFA_FEATURE_NAME_HINTS: Record<string, string> = {
  'tools-of-the-trade': TOOLS_OF_THE_TRADE_NAME_RU,
  'experimental-elixir': EXPERIMENTAL_ELIXIR_NAME_RU,
  'alchemical-savant': ALCHEMICAL_SAVANT_NAME_RU,
  'restorative-reagents': RESTORATIVE_REAGENTS_NAME_RU,
  'chemical-mastery': CHEMICAL_MASTERY_NAME_RU,
  'arcane-armor': ARCANE_ARMOR_NAME_RU,
  'armor-model': ARMOR_MODEL_NAME_RU,
  'extra-attack': EXTRA_ATTACK_NAME_RU,
  'armor-modifications': ARMOR_MODIFICATIONS_NAME_RU,
  'perfected-armor': PERFECTED_ARMOR_NAME_RU,
  'eldritch-cannon': ELDRITCH_CANNON_NAME_RU,
  'arcane-firearm': ARCANE_FIREARM_NAME_RU,
  'explosive-cannon': EXPLOSIVE_CANNON_NAME_RU,
  'fortified-position': FORTIFIED_POSITION_NAME_RU,
  'battle-ready': BATTLE_READY_NAME_RU,
  'steel-defender': STEEL_DEFENDER_NAME_RU,
  'arcane-jolt': ARCANE_JOLT_NAME_RU,
  'improved-defender': IMPROVED_DEFENDER_NAME_RU,
  'adventure-atlas': ADVENTURERS_ATLAS_NAME_RU,
  'mapping-magic': MAPPING_MAGIC_NAME_RU,
  'guided-precision': GUIDED_PRECISION_NAME_RU,
  'brilliant-path': INGENIOUS_MOVEMENT_NAME_RU,
  'superior-atlas': SUPERIOR_ATLAS_NAME_RU,
}

/* ------------------------------------------------------------------ */
/* Always-prepared thresholds                                          */
/* ------------------------------------------------------------------ */

export const REANIMATOR_ALWAYS_PREPARED: Record<number, readonly string[]> = {
  3: ['witch-bolt', 'false-life', 'spare-the-dying'],
  5: ['blindness-deafness', 'enhance-ability'],
  9: ['lightning-bolt', 'animate-dead'],
  13: ['death-ward', 'blight'],
  17: ['raise-dead', 'antilife-shell'],
}

export function reanimatorAlwaysPreparedAtLevel2024(level: number): string[] {
  const n = Math.max(0, Math.floor(level) || 0)
  const out: string[] = []
  for (const gate of [3, 5, 9, 13, 17] as const) {
    if (n >= gate) out.push(...(REANIMATOR_ALWAYS_PREPARED[gate] ?? []))
  }
  return out
}

export function artificerBookAlwaysPreparedAtLevel2024(
  slug: string | null | undefined,
  level: number,
): string[] {
  if (isReanimator2024(slug)) return reanimatorAlwaysPreparedAtLevel2024(level)
  if (!isM02bArtificerBookSubclass(slug)) return []
  return alwaysPreparedForSubclass2024(String(slug), level)
}

/* ------------------------------------------------------------------ */
/* Companion stats                                                     */
/* ------------------------------------------------------------------ */

export type ReanimatedCompanionStats2024 = {
  ac: number
  hp: number
  speed: number
  sizeRu: string
  actionsRu: string
  notesRu: string
  deathBurstRu: string
  swipeDice: string
}

export function reanimatedCompanionStats2024(input: {
  artificerLevel: number
  intMod: number
  modifications?: readonly string[]
}): ReanimatedCompanionStats2024 {
  const level = Math.max(1, Math.min(20, Math.floor(input.artificerLevel) || 1))
  const intM = Math.floor(input.intMod || 0)
  const mods = new Set((input.modifications ?? []).map((m) => String(m).trim().toLowerCase()))
  const ferocity = mods.has('ferocity')
  const bloated = mods.has('bloated')
  const gaunt = mods.has('gaunt')
  const sodden = mods.has('sodden')
  const improved = level >= 9
  const swipe = dreadfulSwipeDamageDice2024({ artificerLevel: level, hasFerocity: ferocity })
  const burst = deathBurstDamageDice2024(level)
  const speed = gaunt ? 45 : 30
  const sizeRu = bloated ? 'Большой' : 'Средний'
  const extras: string[] = []
  if (mods.has('magical_conduit')) {
    extras.push(
      `${MAGICAL_CONDUIT_NAME_RU}: сотворение из пространства спутника; +ИНТ к одному броску урона Воплощения/Некромантии.`,
    )
  }
  if (ferocity) extras.push(`${FEROCITY_NAME_RU}: замах ${swipe}+ИНТ.`)
  if (bloated) {
    extras.push(
      `${BLOATED_NAME_RU}: отталкивание до 10 фт. при замахе; можно +ИНТ к урону Взрыва смерти.`,
    )
  }
  if (gaunt) {
    extras.push(
      `${GAUNT_NAME_RU}: лазание = Скорости (потолки); Испуганный в 10 фт. (спас Мдр.).`,
    )
  }
  if (sodden) {
    extras.push(
      `${SODDEN_NAME_RU}: плавание = Скорости; проходит 1 дюйм; кислота = мод. ИНТ атакующему в 10 фт.`,
    )
  }
  if (improved) extras.push('Некротический урон спутника игнорирует Сопротивление.')
  return {
    ac: 10 + intM,
    hp: 5 + 5 * level,
    speed,
    sizeRu,
    swipeDice: swipe,
    deathBurstRu: `${DEATH_BURST_NAME_RU}: спас Ловкости (ваша Сл) в 10-футовой Эманации; провал ${burst} Некротического, успех — половина.`,
    actionsRu: [
      `${DREADFUL_SWIPE_NAME_RU}: атака заклинанием, 5 фт.; ${swipe}+${intM} Некротического; цель без провоцированных атак до своего следующего хода.`,
      `${LIGHTNING_ABSORPTION_NAME_RU}: урон Электричеством лечит спутника на ту же величину.`,
    ].join(' '),
    notesRu: [
      `RTW: ${sizeRu} Нежить. СИЛ 11 ЛОВ 10 ТЕЛ 16 ИНТ 4 МДР 10 ХАР 6. Иммунитеты: Электричество; Истощение, Отравленный, Очарованный. Сопротивления: Некротический, Яд. Слепое зрение 60.`,
      ...extras,
    ].join(' '),
  }
}
