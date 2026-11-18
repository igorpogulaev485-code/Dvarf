/**
 * Artificer 2024 (Eberron: Forge of the Artificer): Magic of Making, Replicate
 * Magic Item, Flash of Genius, Magic Item Tinker, Spell-Storing Item, Soul of
 * Artifice, and five EFA specialties (Alchemist, Armorer, Artillerist,
 * Battle Smith, Cartographer).
 *
 * Callers branch on `rules_edition === '2024'`; nothing here feeds the 2014
 * «Изобретатель» pack (infusions / Magical Tinkering / Soul of Artifice 2014).
 * Names follow the FINAL Russian list approved by Игорь 18.11.2026.
 */

import type { FeatureChoiceDef } from './classFeatures'
import type { ClassLevelEntry } from './classLevels'
import { normalizeClassSlug2024 } from './edition2024Classes'
import {
  getFeaturePick,
  setFeaturePick,
  type FeaturePicksState,
} from './featurePicks'
import { parseFeatureResourceId } from './featureResources'
import { clampResource, type SheetResource } from './rest'

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL)                                                  */
/* ------------------------------------------------------------------ */

export const ARTIFICER_CLASS_NAME_RU_2024 = 'Артефактор'
export const ARTIFICER_CLASS_NAME_RU_2014 = 'Изобретатель'

export const SPELLCASTING_NAME_RU = 'Сотворение заклинаний'
export const MAGIC_OF_MAKING_NAME_RU = 'Магия вещей'
export const MENDING_NAME_RU = 'Починка'
export const REPLICATE_MAGIC_ITEM_NAME_RU = 'Реплики магических предметов'
export const PLANS_KNOWN_COLUMN_RU = 'Известные схемы'
export const MAGIC_ITEMS_COLUMN_RU = 'Магические предметы'
export const ARTIFICER_SUBCLASS_NAME_RU = 'Подкласс артефактора'
export const TOOLS_OF_THE_TRADE_NAME_RU = 'Инструменты специализации'
export const MAGIC_ITEM_TINKER_NAME_RU = 'Магический мастеровой'
export const FLASH_OF_GENIUS_NAME_RU = 'Вспышка гениальности'
export const MAGIC_ITEM_ADEPT_NAME_RU = 'Адепт магических предметов'
export const SPELL_STORING_ITEM_NAME_RU = 'Предмет, хранящий заклинание'
export const ADVANCED_ARTIFICE_NAME_RU = 'Изобретательность'
export const MAGIC_ITEM_EXPLORER_NAME_RU = 'Исследователь магических предметов'
export const RESTED_GENIUS_NAME_RU = 'Отдохнувший гений'
export const MAGIC_ITEM_MASTER_NAME_RU = 'Мастер магических предметов'
export const SOUL_OF_ARTIFICE_NAME_RU = 'Душа творения'
export const CHEAT_DEATH_NAME_RU = 'Обман смерти'
export const MAGICAL_GUIDANCE_NAME_RU = 'Магическое наставление'
export const ASI_NAME_RU = 'Увеличение характеристик'
export const EPIC_BOON_NAME_RU = 'Эпический дар'
export const SUBCLASS_FEATURE_NAME_RU = 'Умение подкласса'
export const EXTRA_ATTACK_NAME_RU = 'Дополнительная атака'

/* Alchemist */
export const EXPERIMENTAL_ELIXIR_NAME_RU = 'Экспериментальный эликсир'
export const ALCHEMICAL_SAVANT_NAME_RU = 'Знаток алхимии'
export const RESTORATIVE_REAGENTS_NAME_RU = 'Восстанавливающие реагенты'
export const CHEMICAL_MASTERY_NAME_RU = 'Химическое мастерство'

/* Artillerist */
export const ELDRITCH_CANNON_NAME_RU = 'Мистическая пушка'
export const CANNON_MODE_FLAMETHROWER_RU = 'Огнемёт'
export const CANNON_MODE_FORCE_BALLISTA_RU = 'Силовая баллиста'
export const CANNON_MODE_PROTECTOR_RU = 'Защитник'
export const ARCANE_FIREARM_NAME_RU = 'Магическое огнестрельное'
export const EXPLOSIVE_CANNON_NAME_RU = 'Взрывная пушка'
export const FORTIFIED_POSITION_NAME_RU = 'Укреплённая позиция'

/* Battle Smith */
export const BATTLE_READY_NAME_RU = 'Готов к бою'
export const STEEL_DEFENDER_NAME_RU = 'Стальной защитник'
export const ARCANE_JOLT_NAME_RU = 'Магический импульс'
export const IMPROVED_DEFENDER_NAME_RU = 'Улучшенный защитник'

/* Armorer */
export const ARCANE_ARMOR_NAME_RU = 'Арканный доспех'
export const ARMOR_MODEL_NAME_RU = 'Модель доспеха'
export const ARMOR_MODEL_DREADNAUGHT_RU = 'Дредноут'
export const ARMOR_MODEL_INFILTRATOR_RU = 'Диверсант'
export const ARMOR_MODEL_GUARDIAN_RU = 'Страж'
export const ARMOR_MODIFICATIONS_NAME_RU = 'Модификации доспеха'
export const PERFECTED_ARMOR_NAME_RU = 'Совершенный доспех'

/* Cartographer */
export const ADVENTURERS_ATLAS_NAME_RU = 'Атлас приключений'
export const MAPPING_MAGIC_NAME_RU = 'Магия карты'
export const GUIDED_PRECISION_NAME_RU = 'Направленная точность'
export const INGENIOUS_MOVEMENT_NAME_RU = 'Гениальный ход'
export const SUPERIOR_ATLAS_NAME_RU = 'Превосходный атлас'

export const HOMUNCULUS_SERVANT_NAME_RU = 'Гомункул-слуга'

/* ------------------------------------------------------------------ */
/* Ids / pools                                                         */
/* ------------------------------------------------------------------ */

export const ARTIFICER_CLASS_SLUG_2024 = 'artificer'

export const ARTIFICER_SUBCLASS_SLUGS_2024 = {
  alchemist: 'artificer__alchemist',
  armorer: 'artificer__armorer',
  artillerist: 'artificer__artillerist',
  battleSmith: 'artificer__battle-smith',
  cartographer: 'artificer__cartographer',
} as const

export type ArtificerSubclassKey2024 = keyof typeof ARTIFICER_SUBCLASS_SLUGS_2024

/** Book / other — not in EFA picker for this pack. */
export const OUT_OF_PACK_ARTIFICER_SUBCLASSES_2024 = ['artificer__reanimator'] as const

export const MAGIC_OF_MAKING_POOL_ID = 'magic_of_making'
export const FLASH_OF_GENIUS_POOL_ID = 'flash_of_genius'
export const MAGIC_ITEM_TINKER_DRAIN_POOL_ID = 'magic_item_tinker_drain'
export const MAGIC_ITEM_TINKER_TRANSFORM_POOL_ID = 'magic_item_tinker_transform'
export const EXPERIMENTAL_ELIXIR_POOL_ID = 'experimental_elixir'
export const RESTORATIVE_REAGENTS_POOL_ID = 'restorative_reagents'
export const ELDRITCH_CANNON_POOL_ID = 'eldritch_cannon'
export const STEEL_DEFENDER_POOL_ID = 'steel_defender'
export const ARCANE_JOLT_POOL_ID = 'arcane_jolt'
export const ADVENTURE_ATLAS_POOL_ID = 'adventure_atlas'
export const GIANT_STANCE_POOL_ID = 'giant_stance'
export const PERFECTED_FLIGHT_POOL_ID = 'perfected_infiltrator_flight'
export const PERFECTED_PULL_POOL_ID = 'perfected_guardian_pull'
export const MAPPING_FAERIE_FIRE_POOL_ID = 'mapping_faerie_fire'
export const CHEMICAL_MASTERY_CAULDRON_POOL_ID = 'chemical_mastery_cauldron'
export const SPELL_STORING_ITEM_POOL_ID = 'spell_storing_item'

export const FLASH_OF_GENIUS_MIN_LEVEL_2024 = 7
export const MAGIC_ITEM_TINKER_MIN_LEVEL_2024 = 6
export const MAGIC_ITEM_ADEPT_MIN_LEVEL_2024 = 10
export const SPELL_STORING_ITEM_MIN_LEVEL_2024 = 11
export const ADVANCED_ARTIFICE_MIN_LEVEL_2024 = 14
export const MAGIC_ITEM_MASTER_MIN_LEVEL_2024 = 18
export const SOUL_OF_ARTIFICE_MIN_LEVEL_2024 = 20
export const SUBCLASS_MIN_LEVEL_2024 = 3
export const REPLICATE_MIN_LEVEL_2024 = 2

export const ARMOR_MODELS_2024 = [
  { id: 'dreadnaught', nameRu: ARMOR_MODEL_DREADNAUGHT_RU },
  { id: 'infiltrator', nameRu: ARMOR_MODEL_INFILTRATOR_RU },
  { id: 'guardian', nameRu: ARMOR_MODEL_GUARDIAN_RU },
] as const

export type ArmorModel2024 = (typeof ARMOR_MODELS_2024)[number]['id']

export const CANNON_MODES_2024 = [
  { id: 'flamethrower', nameRu: CANNON_MODE_FLAMETHROWER_RU },
  { id: 'force_ballista', nameRu: CANNON_MODE_FORCE_BALLISTA_RU },
  { id: 'protector', nameRu: CANNON_MODE_PROTECTOR_RU },
] as const

export type CannonMode2024 = (typeof CANNON_MODES_2024)[number]['id']

export const ELIXIR_EFFECTS_2024 = [
  { id: 'healing', nameRu: 'Лечение', roll: 1 },
  { id: 'swiftness', nameRu: 'Проворность', roll: 2 },
  { id: 'resilience', nameRu: 'Устойчивость', roll: 3 },
  { id: 'boldness', nameRu: 'Смелость', roll: 4 },
  { id: 'flight', nameRu: 'Полёт', roll: 5 },
  { id: 'choice', nameRu: 'Выбор', roll: 6 },
] as const

export type ElixirEffect2024 = (typeof ELIXIR_EFFECTS_2024)[number]['id']

/* ------------------------------------------------------------------ */
/* Feature names by id (leveling step labels)                          */
/* ------------------------------------------------------------------ */

export const ARTIFICER_FEATURE_NAMES_BY_ID: Record<string, string> = {
  spellcasting: SPELLCASTING_NAME_RU,
  'magic-of-making': MAGIC_OF_MAKING_NAME_RU,
  magic_of_making: MAGIC_OF_MAKING_NAME_RU,
  'replicate-magic-item': REPLICATE_MAGIC_ITEM_NAME_RU,
  replicate_magic_item: REPLICATE_MAGIC_ITEM_NAME_RU,
  'artificer-subclass': ARTIFICER_SUBCLASS_NAME_RU,
  artificer_subclass: ARTIFICER_SUBCLASS_NAME_RU,
  subclass: ARTIFICER_SUBCLASS_NAME_RU,
  'ability-score-improvement': ASI_NAME_RU,
  ability_score_improvement: ASI_NAME_RU,
  asi: ASI_NAME_RU,
  'subclass-feature': SUBCLASS_FEATURE_NAME_RU,
  subclass_feature: SUBCLASS_FEATURE_NAME_RU,
  'magic-item-tinker': MAGIC_ITEM_TINKER_NAME_RU,
  magic_item_tinker: MAGIC_ITEM_TINKER_NAME_RU,
  'flash-of-genius': FLASH_OF_GENIUS_NAME_RU,
  flash_of_genius: FLASH_OF_GENIUS_NAME_RU,
  'magic-item-adept': MAGIC_ITEM_ADEPT_NAME_RU,
  magic_item_adept: MAGIC_ITEM_ADEPT_NAME_RU,
  'spell-storing-item': SPELL_STORING_ITEM_NAME_RU,
  spell_storing_item: SPELL_STORING_ITEM_NAME_RU,
  'magic-item-savant': ADVANCED_ARTIFICE_NAME_RU,
  magic_item_savant: ADVANCED_ARTIFICE_NAME_RU,
  'advanced-artifice': ADVANCED_ARTIFICE_NAME_RU,
  advanced_artifice: ADVANCED_ARTIFICE_NAME_RU,
  'magic-item-master': MAGIC_ITEM_MASTER_NAME_RU,
  magic_item_master: MAGIC_ITEM_MASTER_NAME_RU,
  'epic-boon': EPIC_BOON_NAME_RU,
  epic_boon: EPIC_BOON_NAME_RU,
  'soul-of-artifice': SOUL_OF_ARTIFICE_NAME_RU,
  soul_of_artifice: SOUL_OF_ARTIFICE_NAME_RU,
  'tools-of-the-trade': TOOLS_OF_THE_TRADE_NAME_RU,
  tools_of_the_trade: TOOLS_OF_THE_TRADE_NAME_RU,
  'experimental-elixir': EXPERIMENTAL_ELIXIR_NAME_RU,
  experimental_elixir: EXPERIMENTAL_ELIXIR_NAME_RU,
  'alchemical-savant': ALCHEMICAL_SAVANT_NAME_RU,
  alchemical_savant: ALCHEMICAL_SAVANT_NAME_RU,
  'restorative-reagents': RESTORATIVE_REAGENTS_NAME_RU,
  restorative_reagents: RESTORATIVE_REAGENTS_NAME_RU,
  'chemical-mastery': CHEMICAL_MASTERY_NAME_RU,
  chemical_mastery: CHEMICAL_MASTERY_NAME_RU,
  'eldritch-cannon': ELDRITCH_CANNON_NAME_RU,
  eldritch_cannon: ELDRITCH_CANNON_NAME_RU,
  'arcane-firearm': ARCANE_FIREARM_NAME_RU,
  arcane_firearm: ARCANE_FIREARM_NAME_RU,
  'explosive-cannon': EXPLOSIVE_CANNON_NAME_RU,
  explosive_cannon: EXPLOSIVE_CANNON_NAME_RU,
  'fortified-position': FORTIFIED_POSITION_NAME_RU,
  fortified_position: FORTIFIED_POSITION_NAME_RU,
  'battle-ready': BATTLE_READY_NAME_RU,
  battle_ready: BATTLE_READY_NAME_RU,
  'steel-defender': STEEL_DEFENDER_NAME_RU,
  steel_defender: STEEL_DEFENDER_NAME_RU,
  'extra-attack': EXTRA_ATTACK_NAME_RU,
  extra_attack: EXTRA_ATTACK_NAME_RU,
  'arcane-jolt': ARCANE_JOLT_NAME_RU,
  arcane_jolt: ARCANE_JOLT_NAME_RU,
  'improved-defender': IMPROVED_DEFENDER_NAME_RU,
  improved_defender: IMPROVED_DEFENDER_NAME_RU,
  'arcane-armor': ARCANE_ARMOR_NAME_RU,
  arcane_armor: ARCANE_ARMOR_NAME_RU,
  'armor-model': ARMOR_MODEL_NAME_RU,
  armor_model: ARMOR_MODEL_NAME_RU,
  'improved-armorer': ARMOR_MODIFICATIONS_NAME_RU,
  improved_armorer: ARMOR_MODIFICATIONS_NAME_RU,
  'armor-modifications': ARMOR_MODIFICATIONS_NAME_RU,
  armor_modifications: ARMOR_MODIFICATIONS_NAME_RU,
  'perfected-armor': PERFECTED_ARMOR_NAME_RU,
  perfected_armor: PERFECTED_ARMOR_NAME_RU,
  'adventure-atlas': ADVENTURERS_ATLAS_NAME_RU,
  adventure_atlas: ADVENTURERS_ATLAS_NAME_RU,
  'adventurers-atlas': ADVENTURERS_ATLAS_NAME_RU,
  adventurers_atlas: ADVENTURERS_ATLAS_NAME_RU,
  'mapping-magic': MAPPING_MAGIC_NAME_RU,
  mapping_magic: MAPPING_MAGIC_NAME_RU,
  'guided-precision': GUIDED_PRECISION_NAME_RU,
  guided_precision: GUIDED_PRECISION_NAME_RU,
  'ingenious-movement': INGENIOUS_MOVEMENT_NAME_RU,
  ingenious_movement: INGENIOUS_MOVEMENT_NAME_RU,
  'brilliant-path': INGENIOUS_MOVEMENT_NAME_RU,
  brilliant_path: INGENIOUS_MOVEMENT_NAME_RU,
  'superior-atlas': SUPERIOR_ATLAS_NAME_RU,
  superior_atlas: SUPERIOR_ATLAS_NAME_RU,
  'homunculus-servant': HOMUNCULUS_SERVANT_NAME_RU,
  homunculus_servant: HOMUNCULUS_SERVANT_NAME_RU,
}

export function artificerFeatureNameRu2024(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.trim().replace(/_/g, '-')
  return (
    ARTIFICER_FEATURE_NAMES_BY_ID[featureId]
    || ARTIFICER_FEATURE_NAMES_BY_ID[key]
    || ARTIFICER_FEATURE_NAMES_BY_ID[featureId.replace(/-/g, '_')]
    || null
  )
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

export function isArtificerClassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  if (key === ARTIFICER_CLASS_SLUG_2024) return true
  return /артефактор|изобретател|artificer/.test(key)
}

export function normalizeArtificerClassSlug(
  slug: string | null | undefined,
): string | null {
  const n = normalizeClassSlug2024(slug ?? '')
  return n === ARTIFICER_CLASS_SLUG_2024 ? n : isArtificerClassSlug(slug) ? ARTIFICER_CLASS_SLUG_2024 : null
}

export function artificerLevelsFromClasses(classes: ClassLevelEntry[] | undefined | null): number {
  let total = 0
  for (const row of classes ?? []) {
    const slug = normalizeArtificerClassSlug(row.name) || normalizeArtificerClassSlug((row as { catalog_id?: string }).catalog_id)
    if (!slug && !isArtificerClassSlug(row.name)) {
      const id = String((row as { catalog_id?: string }).catalog_id ?? '').toLowerCase()
      if (!id.includes('artificer') && !/артефактор|изобретат/i.test(row.name || '')) continue
    } else if (!slug && !isArtificerClassSlug(row.name)) {
      continue
    }
    if (
      normalizeArtificerClassSlug(row.name)
      || String((row as { catalog_id?: string }).catalog_id ?? '').toLowerCase().includes('artificer')
      || /артефактор|изобретат/i.test(row.name || '')
    ) {
      total += Math.max(0, Math.floor(row.level))
    }
  }
  return total
}

/** EFA attunement caps: same numbers as Tasha (10→4, 14→5, 18→6). */
export function artificerAttunementLimit2024(artificerLevel: number): number {
  const level = lvl(artificerLevel)
  if (level >= MAGIC_ITEM_MASTER_MIN_LEVEL_2024) return 6
  if (level >= ADVANCED_ARTIFICE_MIN_LEVEL_2024) return 5
  if (level >= MAGIC_ITEM_ADEPT_MIN_LEVEL_2024) return 4
  return 3
}

/** Replicate plans known / magic items max from class table. */
export function replicateLimits2024(artificerLevel: number): { plansKnown: number; magicItems: number } {
  const level = lvl(artificerLevel)
  if (level < REPLICATE_MIN_LEVEL_2024) return { plansKnown: 0, magicItems: 0 }
  if (level >= 18) return { plansKnown: 8, magicItems: 6 }
  if (level >= 14) return { plansKnown: 7, magicItems: 5 }
  if (level >= 10) return { plansKnown: 6, magicItems: 4 }
  if (level >= 6) return { plansKnown: 5, magicItems: 3 }
  return { plansKnown: 4, magicItems: 2 }
}

/** Experimental elixir count after a long rest (Alchemist). */
export function experimentalElixirCount2024(artificerLevel: number): number {
  const level = lvl(artificerLevel)
  if (level >= 15) return 5
  if (level >= 9) return 4
  if (level >= 5) return 3
  if (level >= 3) return 2
  return 0
}

/** Spell-storing item charges = INT mod × 2 (min 2). */
export function spellStoringItemCharges2024(intMod: number): number {
  return Math.max(2, mod(intMod) * 2)
}

/** Cheat Death: HP restored = 20 × number of Uncommon/Rare replicas dissolved. */
export function cheatDeathHpRestored2024(dissolvedCount: number): number {
  return 20 * Math.max(0, Math.floor(dissolvedCount))
}

export function flashOfGeniusUses2024(intMod: number): number {
  return Math.max(1, mod(intMod))
}

export function magicOfMakingUses2024(intMod: number): number {
  return Math.max(1, mod(intMod))
}

export const armorModelChoice2024: FeatureChoiceDef = {
  id: 'armor_model',
  label_ru: ARMOR_MODEL_NAME_RU,
  max_picks: 1,
  options: ARMOR_MODELS_2024.map((row) => row.id),
}

const ARMOR_MODEL_IDS = new Set<string>(ARMOR_MODELS_2024.map((row) => row.id))

export function isArmorModel2024(id: string | null | undefined): id is ArmorModel2024 {
  return ARMOR_MODEL_IDS.has(String(id ?? '').trim().toLowerCase())
}

export function armorModelLabelRu2024(id: string | null | undefined): string | null {
  const key = String(id ?? '').trim().toLowerCase()
  return ARMOR_MODELS_2024.find((row) => row.id === key)?.nameRu ?? null
}

export function readArmorModel2024(
  picks: FeaturePicksState,
  classEntryId: string,
): ArmorModel2024 | null {
  const raw =
    getFeaturePick(picks, classEntryId, 'armor_model')
    || getFeaturePick(picks, classEntryId, 'armor-model')
  const key = String(raw ?? '').trim().toLowerCase()
  return isArmorModel2024(key) ? key : null
}

export function writeArmorModel2024(
  picks: FeaturePicksState,
  classEntryId: string,
  model: ArmorModel2024,
): FeaturePicksState {
  return setFeaturePick(picks, classEntryId, 'armor_model', model)
}

export function isEfaArtificerSubclassSlug(slug: string | null | undefined): boolean {
  const key = String(slug ?? '').trim().toLowerCase()
  return Object.values(ARTIFICER_SUBCLASS_SLUGS_2024).includes(
    key as (typeof ARTIFICER_SUBCLASS_SLUGS_2024)[ArtificerSubclassKey2024],
  )
}

export function isOutOfPackArtificerSubclassSlug(slug: string | null | undefined): boolean {
  const key = String(slug ?? '').trim().toLowerCase()
  return (OUT_OF_PACK_ARTIFICER_SUBCLASSES_2024 as readonly string[]).includes(key)
}

/** Card buttons on ClassFeaturesPanel (edition 2024 only). */
export const ARTIFICER_2024_CARD_BUTTONS: Record<string, string> = {
  'magic-of-making': 'Магия вещей…',
  magic_of_making: 'Магия вещей…',
  'flash-of-genius': 'Вспышка…',
  flash_of_genius: 'Вспышка…',
  'magic-item-tinker': 'Мастеровой…',
  magic_item_tinker: 'Мастеровой…',
  'spell-storing-item': 'Хранящий предмет…',
  spell_storing_item: 'Хранящий предмет…',
  'replicate-magic-item': 'Реплики…',
  replicate_magic_item: 'Реплики…',
  'experimental-elixir': 'Эликсир…',
  experimental_elixir: 'Эликсир…',
  'eldritch-cannon': 'Пушка…',
  eldritch_cannon: 'Пушка…',
  'steel-defender': 'Защитник…',
  steel_defender: 'Защитник…',
  'adventure-atlas': 'Атлас…',
  adventure_atlas: 'Атлас…',
  'soul-of-artifice': 'Обман смерти…',
  soul_of_artifice: 'Обман смерти…',
}

const ARTIFICER_USE_FEATURE_IDS = new Set([
  'magic-of-making',
  'flash-of-genius',
  'magic-item-tinker',
  'spell-storing-item',
  'replicate-magic-item',
  'experimental-elixir',
  'eldritch-cannon',
  'steel-defender',
  'adventure-atlas',
  'soul-of-artifice',
])

export function artificer2024UseFeatureId(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.trim().replace(/_/g, '-')
  if (ARTIFICER_2024_CARD_BUTTONS[key] || ARTIFICER_USE_FEATURE_IDS.has(key)) return key
  return null
}

export function findArtificerPool2024(
  resources: SheetResource[],
  poolId: string,
  classEntryId?: string,
): SheetResource | null {
  const matches = (row: SheetResource) =>
    row.pool_id === poolId || parseFeatureResourceId(row.id)?.poolId === poolId
  if (classEntryId) {
    const exact = resources.find((row) => {
      const parsed = parseFeatureResourceId(row.id)
      return parsed?.poolId === poolId && parsed.classEntryId === classEntryId
    })
    if (exact) return exact
    const art = resources.find((row) => {
      const parsed = parseFeatureResourceId(row.id)
      return parsed?.poolId === poolId && parsed.classSlug === ARTIFICER_CLASS_SLUG_2024
    })
    if (art) return art
  }
  return resources.find(matches) ?? null
}

export type Artificer2024UseResult = {
  ok: boolean
  resources: SheetResource[]
  feedLineRu: string
  message?: string
}

export function applyArtificer2024FeatureUse(input: {
  featureId: string
  resourceId: string | null
  resources: SheetResource[]
  classEntryId: string
  refund?: boolean
}): Artificer2024UseResult {
  const fid = artificer2024UseFeatureId(input.featureId) ?? input.featureId.replace(/_/g, '-')
  const poolId =
    fid === 'magic-of-making'
      ? MAGIC_OF_MAKING_POOL_ID
      : fid === 'flash-of-genius'
        ? FLASH_OF_GENIUS_POOL_ID
        : null
  if (!poolId) {
    return {
      ok: false,
      resources: input.resources,
      feedLineRu: '',
      message: 'Это умение пока без автотраты — см. карточку.',
    }
  }
  const pool =
    (input.resourceId
      ? input.resources.find((row) => row.id === input.resourceId)
      : null)
    ?? findArtificerPool2024(input.resources, poolId, input.classEntryId)
  if (!pool) {
    return {
      ok: false,
      resources: input.resources,
      feedLineRu: '',
      message: 'Пул не найден',
    }
  }
  const refund = Boolean(input.refund)
  if (refund) {
    if (pool.used <= 0) {
      return {
        ok: false,
        resources: input.resources,
        feedLineRu: '',
        message: 'Нечего возвращать',
      }
    }
    const next = input.resources.map((row) =>
      row.id === pool.id ? clampResource({ ...row, used: Math.max(0, row.used - 1) }) : row,
    )
    return {
      ok: true,
      resources: next,
      feedLineRu: `${pool.name || fid}: возврат использования`,
    }
  }
  if (pool.used >= pool.max) {
    return {
      ok: false,
      resources: input.resources,
      feedLineRu: '',
      message: 'Нет использований',
    }
  }
  const next = input.resources.map((row) =>
    row.id === pool.id ? clampResource({ ...row, used: Math.min(row.max, row.used + 1) }) : row,
  )
  return {
    ok: true,
    resources: next,
    feedLineRu: `${pool.name || fid}: потрачено`,
  }
}

/** Sync Flash of Genius pool onto sheet resources (2024 only callers). */
export function syncFlashOfGeniusResource2024(input: {
  resources: SheetResource[]
  artificerLevel: number
  intMod: number
}): SheetResource[] {
  const level = lvl(input.artificerLevel)
  const max = level >= FLASH_OF_GENIUS_MIN_LEVEL_2024 ? flashOfGeniusUses2024(input.intMod) : 0
  const existing = input.resources.find((r) => r.pool_id === FLASH_OF_GENIUS_POOL_ID)
  if (max <= 0) {
    return input.resources.filter((r) => r.pool_id !== FLASH_OF_GENIUS_POOL_ID)
  }
  const next = clampResource({
    id: existing?.id ?? `pool:${FLASH_OF_GENIUS_POOL_ID}`,
    pool_id: FLASH_OF_GENIUS_POOL_ID,
    name: FLASH_OF_GENIUS_NAME_RU,
    max,
    used: existing?.used ?? 0,
    reset: 'long',
  })
  if (existing) {
    return input.resources.map((r) => (r.pool_id === FLASH_OF_GENIUS_POOL_ID ? next : r))
  }
  return [...input.resources, next]
}

/** Infiltrator model: +5 walk speed (Arcane Armor model). */
export function armorerInfiltratorSpeedBonusFt2024(input: {
  artificerLevel: number
  armorModel: ArmorModel2024 | null
}): number {
  if (lvl(input.artificerLevel) < SUBCLASS_MIN_LEVEL_2024) return 0
  return input.armorModel === 'infiltrator' ? 5 : 0
}

/* ------------------------------------------------------------------ */
/* Companion stat blocks (EFA 2024 — not Tasha)                        */
/* ------------------------------------------------------------------ */

export type EldritchCannonStats2024 = {
  ac: number
  hp: number
  modesRu: string
  notesRu: string
  maxCannons: number
  damageDice: string
  protectorTempFormulaRu: string
  detonationRu: string | null
}

/** Eldritch Cannon — https://next.dnd.su/bestiary/27369-eldritch-cannon */
export function eldritchCannonStats2024(input: {
  artificerLevel: number
  intMod: number
}): EldritchCannonStats2024 {
  const level = Math.max(1, Math.min(20, lvl(input.artificerLevel) || 1))
  const intM = mod(input.intMod)
  const explosive = level >= 9
  const fortified = level >= 15
  const damageDice = explosive ? '3к8' : '2к8'
  const protector = explosive ? `1к8+1к8+${intM}` : `1к8+${intM}`
  return {
    ac: 18,
    hp: 5 * level,
    maxCannons: fortified ? 2 : 1,
    damageDice,
    protectorTempFormulaRu: protector,
    modesRu: [
      `${CANNON_MODE_FLAMETHROWER_RU}: конус 15 фт., спас Ловкости, ${damageDice} огня`,
      `${CANNON_MODE_FORCE_BALLISTA_RU}: дальнобойная атака заклинанием 120 фт., ${damageDice} силового + толчок 5 фт.`,
      `${CANNON_MODE_PROTECTOR_RU}: временные хиты ${protector} в 10 фт. (включая пушку)`,
    ].join(' · '),
    notesRu:
      'EFA 2024: режим выбирается при каждой активации (не при создании). Иммунитеты: психический, яд. «Починка» — 2к8 хитов.',
    detonationRu: explosive
      ? 'Взрывная пушка: реакция при уроне по пушке в 60 фт. — детонация 20 фт., 3к10 силового (спас Ловкости).'
      : null,
  }
}

export type SteelDefenderStats2024 = {
  ac: number
  hp: number
  speed: number
  actionsRu: string
  notesRu: string
  repairMax: number
}

/** Steel Defender — https://next.dnd.su/bestiary/27372-steel-defender */
export function steelDefenderStats2024(input: {
  artificerLevel: number
  intMod: number
}): SteelDefenderStats2024 {
  const level = Math.max(1, Math.min(20, lvl(input.artificerLevel) || 1))
  const intM = mod(input.intMod)
  const improved = level >= 15
  const rendDice = improved ? '4к6' : '1к8'
  const rend = `${rendDice}+2+${intM} силового`
  const deflectExtra = improved
    ? ` При «Отражении атаки» атакующий получает 1к4+${intM} силового.`
    : ''
  return {
    ac: 12 + intM,
    hp: 5 + 5 * level,
    speed: 40,
    repairMax: 3,
    actionsRu: [
      `Силовой разрыв: атака заклинанием; ${rend}.`,
      `Ремонт 3/день: 2к8+${intM} себе / конструкту / объекту в 5 фт.`,
      `Реакция «Отражение атаки»: помеха на атаку по существу в 5 фт. (не по защитнику).${deflectExtra}`,
    ].join(' '),
    notesRu:
      'EFA 2024: Средний конструкт. Стальная связь — ваш БВ ко всем проверкам и спасброскам защитника. Иммунитеты — как в официальном блоке.',
  }
}
