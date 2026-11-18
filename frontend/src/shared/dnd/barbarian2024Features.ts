/**
 * Barbarian 2024 (PHB / SRD 5.2): Rage, Unarmored Defense, Weapon Mastery,
 * Danger Sense, Reckless Attack, Primal Knowledge, Brutal Strike, Relentless /
 * Persistent Rage, and PHB subclasses (Berserker, Wild Heart, World Tree, Zealot).
 *
 * Callers branch on `rules_edition === '2024'`; nothing here feeds the 2014
 * barbarian pack. Names follow the FINAL Russian list approved by Игорь 18.11.2026.
 */

import type { ClassLevelEntry } from './classLevels'
import { normalizeClassSlug2024 } from './edition2024Classes'
import { parseFeatureResourceId } from './featureResources'
import { clampResource, type SheetResource } from './rest'

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL)                                                  */
/* ------------------------------------------------------------------ */

export const BARBARIAN_CLASS_NAME_RU = 'Варвар'

export const RAGE_NAME_RU = 'Ярость'
export const UNARMORED_DEFENSE_NAME_RU = 'Защита без доспехов'
export const WEAPON_MASTERY_NAME_RU = 'Оружейное мастерство'
export const DANGER_SENSE_NAME_RU = 'Чувство опасности'
export const RECKLESS_ATTACK_NAME_RU = 'Безрассудная атака'
export const BARBARIAN_SUBCLASS_NAME_RU = 'Подкласс варвара'
export const PRIMAL_KNOWLEDGE_NAME_RU = 'Изначальные знания'
export const ASI_NAME_RU = 'Увеличение характеристик'
export const EXTRA_ATTACK_NAME_RU = 'Дополнительная атака'
export const FAST_MOVEMENT_NAME_RU = 'Быстрое движение'
export const FERAL_INSTINCT_NAME_RU = 'Звериный инстинкт'
export const INSTINCTIVE_POUNCE_NAME_RU = 'Инстинктивный прыжок'
export const BRUTAL_STRIKE_NAME_RU = 'Жестокий удар'
export const IMPROVED_BRUTAL_STRIKE_NAME_RU = 'Улучшенный жестокий удар'
export const RELENTLESS_RAGE_NAME_RU = 'Непреклонная ярость'
export const PERSISTENT_RAGE_NAME_RU = 'Стойкая ярость'
export const INDOMITABLE_MIGHT_NAME_RU = 'Неукротимая мощь'
export const EPIC_BOON_NAME_RU = 'Эпический дар'
export const PRIMAL_CHAMPION_NAME_RU = 'Изначальный чемпион'
export const SUBCLASS_FEATURE_NAME_RU = 'Умение подкласса'

/* Berserker */
export const BERSERKER_NAME_RU = 'Путь берсерка'
export const FRENZY_NAME_RU = 'Безумие'
export const MINDLESS_RAGE_NAME_RU = 'Безумная ярость'
export const RETALIATION_NAME_RU = 'Возмездие'
export const INTIMIDATING_PRESENCE_NAME_RU = 'Устрашающее присутствие'

/* Wild Heart */
export const WILD_HEART_NAME_RU = 'Путь дикого сердца'
export const ANIMAL_SPEAKER_NAME_RU = 'Говорящий с животными'
export const RAGE_OF_THE_WILDS_NAME_RU = 'Ярость дикой природы'
export const ASPECT_OF_THE_WILDS_NAME_RU = 'Аспект дикой природы'
export const NATURE_SPEAKER_NAME_RU = 'Говорящий с природой'
export const POWER_OF_THE_WILDS_NAME_RU = 'Сила дикой природы'

/* World Tree */
export const WORLD_TREE_NAME_RU = 'Путь Мирового древа'
export const VITALITY_OF_THE_TREE_NAME_RU = 'Жизненная сила Древа'
export const BRANCHES_OF_THE_TREE_NAME_RU = 'Ветви Древа'
export const BATTERING_ROOTS_NAME_RU = 'Колотящее дубьё'
export const TRAVEL_ALONG_THE_TREE_NAME_RU = 'Путешествие по Древу'

/* Zealot */
export const ZEALOT_NAME_RU = 'Путь фанатика'
export const DIVINE_FURY_NAME_RU = 'Божественная ярость'
export const WARRIOR_OF_THE_GODS_NAME_RU = 'Воин богов'
export const FANATICAL_FOCUS_NAME_RU = 'Фанатичный фокус'
export const ZEALOUS_PRESENCE_NAME_RU = 'Ревностное присутствие'
export const RAGE_OF_THE_GODS_NAME_RU = 'Ярость богов'

/* ------------------------------------------------------------------ */
/* Ids / pools                                                         */
/* ------------------------------------------------------------------ */

export const BARBARIAN_CLASS_SLUG_2024 = 'barbarian'

export const BARBARIAN_SUBCLASS_SLUGS_2024 = {
  berserker: 'barbarian__berserker',
  wildHeart: 'barbarian__wild-heart',
  worldTree: 'barbarian__world-tree',
  zealot: 'barbarian__zealot',
} as const

export type BarbarianSubclassKey2024 = keyof typeof BARBARIAN_SUBCLASS_SLUGS_2024

/** Book / 2014-only — not in PHB 2024 picker for this pack. */
export const OUT_OF_PACK_BARBARIAN_SUBCLASSES_2024 = [
  'barbarian__totem-warrior',
  'barbarian__battlerager',
  'barbarian__ancestral-guardian',
  'barbarian__storm-herald',
  'barbarian__beast',
  'barbarian__wild-magic',
  'barbarian__giant',
] as const

export const RAGES_POOL_ID = 'rages'
export const WARRIOR_OF_THE_GODS_POOL_ID = 'warrior_of_the_gods'
export const ZEALOUS_PRESENCE_POOL_ID = 'zealous_presence'
export const INTIMIDATING_PRESENCE_POOL_ID = 'intimidating_presence'
export const FANATICAL_FOCUS_POOL_ID = 'fanatical_focus'
export const RAGE_OF_THE_GODS_POOL_ID = 'rage_of_the_gods'

export const SUBCLASS_MIN_LEVEL_2024 = 3
export const DANGER_SENSE_MIN_LEVEL_2024 = 2
export const RECKLESS_ATTACK_MIN_LEVEL_2024 = 2
export const PRIMAL_KNOWLEDGE_MIN_LEVEL_2024 = 3
export const EXTRA_ATTACK_MIN_LEVEL_2024 = 5
export const FAST_MOVEMENT_MIN_LEVEL_2024 = 5
export const FERAL_INSTINCT_MIN_LEVEL_2024 = 7
export const INSTINCTIVE_POUNCE_MIN_LEVEL_2024 = 7
export const BRUTAL_STRIKE_MIN_LEVEL_2024 = 9
export const RELENTLESS_RAGE_MIN_LEVEL_2024 = 11
export const IMPROVED_BRUTAL_STRIKE_MIN_LEVEL_2024 = 13
export const TRAVEL_ALONG_THE_TREE_MIN_LEVEL_2024 = 14
export const PERSISTENT_RAGE_MIN_LEVEL_2024 = 15
export const IMPROVED_BRUTAL_STRIKE_TWO_EFFECTS_LEVEL_2024 = 17
export const INDOMITABLE_MIGHT_MIN_LEVEL_2024 = 18
export const EPIC_BOON_MIN_LEVEL_2024 = 19
export const PRIMAL_CHAMPION_MIN_LEVEL_2024 = 20

export const BRUTAL_STRIKE_EFFECT_IDS_L9 = ['forceful-blow', 'hamstring-blow'] as const
export const BRUTAL_STRIKE_EFFECT_IDS_L13 = [
  'staggering-blow',
  'sundering-blow',
] as const
export const BRUTAL_STRIKE_EFFECT_NAMES_RU: Record<string, string> = {
  'forceful-blow': 'Мощный удар',
  'hamstring-blow': 'Калечащий удар',
  'hamstringing-blow': 'Калечащий удар',
  'staggering-blow': 'Потрясающий удар',
  'sundering-blow': 'Расшатывающий удар',
}

export const WILD_HEART_RAGE_OPTIONS_RU = {
  wolf: 'Волк',
  bear: 'Медведь',
  eagle: 'Орёл',
} as const

export const WILD_HEART_ASPECT_OPTIONS_RU = {
  salmon: 'Лосось',
  panther: 'Пантера',
  owl: 'Сова',
} as const

export const WILD_HEART_POWER_OPTIONS_RU = {
  falcon: 'Сокол',
  lion: 'Лев',
  ram: 'Баран',
} as const

/* ------------------------------------------------------------------ */
/* Feature names by id (leveling / sheet labels)                       */
/* ------------------------------------------------------------------ */

export const BARBARIAN_FEATURE_NAMES_BY_ID: Record<string, string> = {
  rage: RAGE_NAME_RU,
  'unarmored-defense': UNARMORED_DEFENSE_NAME_RU,
  unarmored_defense: UNARMORED_DEFENSE_NAME_RU,
  'weapon-mastery': WEAPON_MASTERY_NAME_RU,
  weapon_mastery: WEAPON_MASTERY_NAME_RU,
  'danger-sense': DANGER_SENSE_NAME_RU,
  danger_sense: DANGER_SENSE_NAME_RU,
  'reckless-attack': RECKLESS_ATTACK_NAME_RU,
  reckless_attack: RECKLESS_ATTACK_NAME_RU,
  'barbarian-subclass': BARBARIAN_SUBCLASS_NAME_RU,
  barbarian_subclass: BARBARIAN_SUBCLASS_NAME_RU,
  subclass: BARBARIAN_SUBCLASS_NAME_RU,
  'primal-knowledge': PRIMAL_KNOWLEDGE_NAME_RU,
  primal_knowledge: PRIMAL_KNOWLEDGE_NAME_RU,
  'ability-score-improvement': ASI_NAME_RU,
  ability_score_improvement: ASI_NAME_RU,
  asi: ASI_NAME_RU,
  'extra-attack': EXTRA_ATTACK_NAME_RU,
  extra_attack: EXTRA_ATTACK_NAME_RU,
  'fast-movement': FAST_MOVEMENT_NAME_RU,
  fast_movement: FAST_MOVEMENT_NAME_RU,
  'subclass-feature': SUBCLASS_FEATURE_NAME_RU,
  subclass_feature: SUBCLASS_FEATURE_NAME_RU,
  'feral-instinct': FERAL_INSTINCT_NAME_RU,
  feral_instinct: FERAL_INSTINCT_NAME_RU,
  'instinctive-pounce': INSTINCTIVE_POUNCE_NAME_RU,
  instinctive_pounce: INSTINCTIVE_POUNCE_NAME_RU,
  'brutal-strike': BRUTAL_STRIKE_NAME_RU,
  brutal_strike: BRUTAL_STRIKE_NAME_RU,
  'improved-brutal-strike': IMPROVED_BRUTAL_STRIKE_NAME_RU,
  improved_brutal_strike: IMPROVED_BRUTAL_STRIKE_NAME_RU,
  'relentless-rage': RELENTLESS_RAGE_NAME_RU,
  relentless_rage: RELENTLESS_RAGE_NAME_RU,
  'persistent-rage': PERSISTENT_RAGE_NAME_RU,
  persistent_rage: PERSISTENT_RAGE_NAME_RU,
  'indomitable-might': INDOMITABLE_MIGHT_NAME_RU,
  indomitable_might: INDOMITABLE_MIGHT_NAME_RU,
  'epic-boon': EPIC_BOON_NAME_RU,
  epic_boon: EPIC_BOON_NAME_RU,
  'primal-champion': PRIMAL_CHAMPION_NAME_RU,
  primal_champion: PRIMAL_CHAMPION_NAME_RU,

  /* Berserker */
  frenzy: FRENZY_NAME_RU,
  'mindless-rage': MINDLESS_RAGE_NAME_RU,
  mindless_rage: MINDLESS_RAGE_NAME_RU,
  retaliation: RETALIATION_NAME_RU,
  'intimidating-presence': INTIMIDATING_PRESENCE_NAME_RU,
  intimidating_presence: INTIMIDATING_PRESENCE_NAME_RU,

  /* Wild Heart */
  'animal-speaker': ANIMAL_SPEAKER_NAME_RU,
  animal_speaker: ANIMAL_SPEAKER_NAME_RU,
  'rage-of-the-wilds': RAGE_OF_THE_WILDS_NAME_RU,
  rage_of_the_wilds: RAGE_OF_THE_WILDS_NAME_RU,
  'aspect-of-the-wilds': ASPECT_OF_THE_WILDS_NAME_RU,
  aspect_of_the_wilds: ASPECT_OF_THE_WILDS_NAME_RU,
  'nature-speaker': NATURE_SPEAKER_NAME_RU,
  nature_speaker: NATURE_SPEAKER_NAME_RU,
  'power-of-the-wilds': POWER_OF_THE_WILDS_NAME_RU,
  power_of_the_wilds: POWER_OF_THE_WILDS_NAME_RU,

  /* World Tree */
  'vitality-of-the-tree': VITALITY_OF_THE_TREE_NAME_RU,
  vitality_of_the_tree: VITALITY_OF_THE_TREE_NAME_RU,
  'branches-of-the-tree': BRANCHES_OF_THE_TREE_NAME_RU,
  branches_of_the_tree: BRANCHES_OF_THE_TREE_NAME_RU,
  'battering-roots': BATTERING_ROOTS_NAME_RU,
  battering_roots: BATTERING_ROOTS_NAME_RU,
  'travel-along-the-tree': TRAVEL_ALONG_THE_TREE_NAME_RU,
  travel_along_the_tree: TRAVEL_ALONG_THE_TREE_NAME_RU,

  /* Zealot */
  'divine-fury': DIVINE_FURY_NAME_RU,
  divine_fury: DIVINE_FURY_NAME_RU,
  'warrior-of-the-gods': WARRIOR_OF_THE_GODS_NAME_RU,
  warrior_of_the_gods: WARRIOR_OF_THE_GODS_NAME_RU,
  'fanatical-focus': FANATICAL_FOCUS_NAME_RU,
  fanatical_focus: FANATICAL_FOCUS_NAME_RU,
  'zealous-presence': ZEALOUS_PRESENCE_NAME_RU,
  zealous_presence: ZEALOUS_PRESENCE_NAME_RU,
  'rage-of-the-gods': RAGE_OF_THE_GODS_NAME_RU,
  rage_of_the_gods: RAGE_OF_THE_GODS_NAME_RU,
}

export function barbarianFeatureNameRu2024(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.trim().replace(/_/g, '-')
  return (
    BARBARIAN_FEATURE_NAMES_BY_ID[featureId]
    || BARBARIAN_FEATURE_NAMES_BY_ID[key]
    || BARBARIAN_FEATURE_NAMES_BY_ID[featureId.replace(/-/g, '_')]
    || null
  )
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function lvl(value: number): number {
  return Math.max(0, Math.floor(value || 0))
}

export function isBarbarianClassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  if (key === BARBARIAN_CLASS_SLUG_2024) return true
  return /варвар|barbarian/.test(key)
}

export function normalizeBarbarianClassSlug(
  slug: string | null | undefined,
): string | null {
  const n = normalizeClassSlug2024(slug ?? '')
  return n === BARBARIAN_CLASS_SLUG_2024
    ? n
    : isBarbarianClassSlug(slug)
      ? BARBARIAN_CLASS_SLUG_2024
      : null
}

export function barbarianLevelsFromClasses(classes: ClassLevelEntry[] | undefined | null): number {
  let total = 0
  for (const row of classes ?? []) {
    const catalogId = String((row as { catalog_id?: string }).catalog_id ?? '').toLowerCase()
    if (
      normalizeBarbarianClassSlug(row.name)
      || catalogId.includes('barbarian')
      || /варвар/i.test(row.name || '')
    ) {
      total += Math.max(0, Math.floor(row.level))
    }
  }
  return total
}

export function isPhbBarbarianSubclassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return (Object.values(BARBARIAN_SUBCLASS_SLUGS_2024) as string[]).includes(key)
}

export function isOutOfPackBarbarianSubclassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return (OUT_OF_PACK_BARBARIAN_SUBCLASSES_2024 as readonly string[]).includes(key)
}

/** Rage uses: 2 / 3 / 4 / 5 / 6 by barbarian level (2024 table). */
export function rageUses2024(barbarianLevel: number): number {
  const level = lvl(barbarianLevel)
  if (level >= 17) return 6
  if (level >= 12) return 5
  if (level >= 6) return 4
  if (level >= 3) return 3
  if (level >= 1) return 2
  return 0
}

/** Rage damage bonus: +2 / +3@9 / +4@16. */
export function rageDamageBonus2024(barbarianLevel: number): number {
  const level = lvl(barbarianLevel)
  if (level >= 16) return 4
  if (level >= 9) return 3
  if (level >= 1) return 2
  return 0
}

/** Weapon Mastery slots (melee only): 2 / 3 / 4 at 1 / 4 / 10. */
export function weaponMasterySlots2024(barbarianLevel: number): number {
  const level = lvl(barbarianLevel)
  if (level >= 10) return 4
  if (level >= 4) return 3
  if (level >= 1) return 2
  return 0
}

/** Attacks from Extra Attack: 1 / 2 at 5+. */
export function barbarianAttackCount2024(barbarianLevel: number): number {
  return lvl(barbarianLevel) >= EXTRA_ATTACK_MIN_LEVEL_2024 ? 2 : 1
}

/** Fast Movement: +10 ft speed while not in heavy armor (2024). */
export function fastMovementBonus2024(barbarianLevel: number, wearingHeavyArmor: boolean): number {
  if (wearingHeavyArmor) return 0
  return lvl(barbarianLevel) >= FAST_MOVEMENT_MIN_LEVEL_2024 ? 10 : 0
}

/** Brutal Strike extra damage dice: 1d10 @9, 2d10 @17. */
export function brutalStrikeDice2024(barbarianLevel: number): number {
  const level = lvl(barbarianLevel)
  if (level >= IMPROVED_BRUTAL_STRIKE_TWO_EFFECTS_LEVEL_2024) return 2
  if (level >= BRUTAL_STRIKE_MIN_LEVEL_2024) return 1
  return 0
}

/** How many Brutal Strike effects may apply on one hit. */
export function brutalStrikeEffectCount2024(barbarianLevel: number): number {
  const level = lvl(barbarianLevel)
  if (level >= IMPROVED_BRUTAL_STRIKE_TWO_EFFECTS_LEVEL_2024) return 2
  if (level >= BRUTAL_STRIKE_MIN_LEVEL_2024) return 1
  return 0
}

export function brutalStrikeAvailableEffectIds2024(barbarianLevel: number): string[] {
  const level = lvl(barbarianLevel)
  if (level < BRUTAL_STRIKE_MIN_LEVEL_2024) return []
  const ids: string[] = [...BRUTAL_STRIKE_EFFECT_IDS_L9]
  if (level >= IMPROVED_BRUTAL_STRIKE_MIN_LEVEL_2024) {
    ids.push(...BRUTAL_STRIKE_EFFECT_IDS_L13)
  }
  return ids
}

/** Relentless Rage heal on success: barbarian level × 2 (not 1 HP). */
export function relentlessRageHeal2024(barbarianLevel: number): number {
  return lvl(barbarianLevel) >= RELENTLESS_RAGE_MIN_LEVEL_2024 ? lvl(barbarianLevel) * 2 : 0
}

/** Warrior of the Gods pool: 4 d12 @3; max 5@6, 6@12, 7@17. */
export function warriorOfTheGodsDice2024(barbarianLevel: number): { die: number; count: number } {
  const level = lvl(barbarianLevel)
  if (level < 3) return { die: 0, count: 0 }
  if (level >= 17) return { die: 12, count: 7 }
  if (level >= 12) return { die: 12, count: 6 }
  if (level >= 6) return { die: 12, count: 5 }
  return { die: 12, count: 4 }
}

/** Primal Champion: Str/Con +4, max 25. */
export function primalChampionAbilityBonus2024(barbarianLevel: number): {
  bonus: number
  max: number
} {
  if (lvl(barbarianLevel) >= PRIMAL_CHAMPION_MIN_LEVEL_2024) {
    return { bonus: 4, max: 25 }
  }
  return { bonus: 0, max: 20 }
}

/* ------------------------------------------------------------------ */
/* Sheet use / spend (2024 only)                                       */
/* ------------------------------------------------------------------ */

const BARBARIAN_USE_FEATURE_IDS = new Set([
  'rage',
  'relentless-rage',
  'persistent-rage',
  'warrior-of-the-gods',
  'fanatical-focus',
  'zealous-presence',
  'intimidating-presence',
  'rage-of-the-gods',
  'retaliation',
  'vitality-of-the-tree',
  'branches-of-the-tree',
  'travel-along-the-tree',
  'rage-of-the-wilds',
  'aspect-of-the-wilds',
  'power-of-the-wilds',
])

export const BARBARIAN_2024_CARD_BUTTONS: Record<string, string> = {
  rage: 'Ярость…',
  'relentless-rage': 'Спас…',
  relentless_rage: 'Спас…',
  'persistent-rage': 'Восстановить…',
  persistent_rage: 'Восстановить…',
  'warrior-of-the-gods': 'Исцелить…',
  warrior_of_the_gods: 'Исцелить…',
  'fanatical-focus': 'Перебросить…',
  fanatical_focus: 'Перебросить…',
  'zealous-presence': 'Присутствие…',
  zealous_presence: 'Присутствие…',
  'intimidating-presence': 'Устрашить…',
  intimidating_presence: 'Устрашить…',
  'rage-of-the-gods': 'Облик…',
  rage_of_the_gods: 'Облик…',
  retaliation: 'Возмездие…',
  'vitality-of-the-tree': 'Временные хиты…',
  vitality_of_the_tree: 'Временные хиты…',
  'branches-of-the-tree': 'Ветви…',
  branches_of_the_tree: 'Ветви…',
  'travel-along-the-tree': 'Путешествие…',
  travel_along_the_tree: 'Путешествие…',
  'rage-of-the-wilds': 'Форма ярости…',
  rage_of_the_wilds: 'Форма ярости…',
  'aspect-of-the-wilds': 'Аспект…',
  aspect_of_the_wilds: 'Аспект…',
  'power-of-the-wilds': 'Сила дикой природы…',
  power_of_the_wilds: 'Сила дикой природы…',
}

export function wildHeartRageLabelRu(id: string | null | undefined): string | null {
  if (!id) return null
  const key = id.trim().toLowerCase() as keyof typeof WILD_HEART_RAGE_OPTIONS_RU
  return WILD_HEART_RAGE_OPTIONS_RU[key] ?? null
}

export function wildHeartAspectLabelRu(id: string | null | undefined): string | null {
  if (!id) return null
  const key = id.trim().toLowerCase() as keyof typeof WILD_HEART_ASPECT_OPTIONS_RU
  return WILD_HEART_ASPECT_OPTIONS_RU[key] ?? null
}

export function wildHeartPowerLabelRu(id: string | null | undefined): string | null {
  if (!id) return null
  const key = id.trim().toLowerCase() as keyof typeof WILD_HEART_POWER_OPTIONS_RU
  return WILD_HEART_POWER_OPTIONS_RU[key] ?? null
}

export function isWildHeartRageOption2024(id: string | null | undefined): boolean {
  return wildHeartRageLabelRu(id) != null
}

export function isWildHeartAspectOption2024(id: string | null | undefined): boolean {
  return wildHeartAspectLabelRu(id) != null
}

export function isWildHeartPowerOption2024(id: string | null | undefined): boolean {
  return wildHeartPowerLabelRu(id) != null
}

export function barbarian2024UseFeatureId(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.trim().replace(/_/g, '-')
  if (key === 'rages') return 'rage'
  return BARBARIAN_USE_FEATURE_IDS.has(key) ? key : null
}

export function isBarbarianUseFeatureId2024(featureId: string | null | undefined): boolean {
  return barbarian2024UseFeatureId(featureId) != null
}

export function findBarbarianPool2024(
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
    const byClass = resources.find((row) => {
      const parsed = parseFeatureResourceId(row.id)
      return parsed?.poolId === poolId && parsed.classSlug === BARBARIAN_CLASS_SLUG_2024
    })
    if (byClass) return byClass
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

export function spendRageUse2024(
  resources: SheetResource[] | undefined | null,
  classEntryId?: string,
): { ok: true; resources: SheetResource[] } | { ok: false; reason_ru: string } {
  const list = [...(resources ?? [])]
  const pool = findBarbarianPool2024(list, RAGES_POOL_ID, classEntryId)
  if (!pool) return { ok: false, reason_ru: 'Нет пула ярости на листе.' }
  if (pool.used >= pool.max) return { ok: false, reason_ru: 'Нет использований ярости.' }
  return { ok: true, resources: bumpPool(list, pool, 1) }
}

export function restoreRageUse2024(
  resources: SheetResource[] | undefined | null,
  amount: number = 1,
  classEntryId?: string,
): SheetResource[] {
  const list = [...(resources ?? [])]
  const pool = findBarbarianPool2024(list, RAGES_POOL_ID, classEntryId)
  if (!pool) return list
  return bumpPool(list, pool, -Math.max(0, Math.floor(amount)))
}

export function restoreAllRageUses2024(
  resources: SheetResource[] | undefined | null,
  classEntryId?: string,
): SheetResource[] {
  const list = [...(resources ?? [])]
  const pool = findBarbarianPool2024(list, RAGES_POOL_ID, classEntryId)
  if (!pool) return list
  return bumpPool(list, pool, -pool.used)
}

export type Barbarian2024UseInput = {
  featureId: string
  resourceId: string | null
  resources: SheetResource[]
  classEntryId: string
  barbarianLevel: number
  refund?: boolean
  mode?: string | null
  /** Warrior of the Gods: how many d12 to spend. */
  diceCount?: number
  wearingHeavyArmor?: boolean
  incapacitated?: boolean
  unconscious?: boolean
  subclassSlug?: string | null
  /** Wild Heart — animal form when entering rage (L3+). */
  wildHeartRage?: 'wolf' | 'bear' | 'eagle' | null
  /** Wild Heart — power of the wilds (L14+, set on rage). */
  wildHeartPower?: 'falcon' | 'lion' | 'ram' | null
  /** Wild Heart — aspect of the wilds (sheet / long rest). */
  wildHeartAspect?: 'salmon' | 'panther' | 'owl' | null
  /** Already persisted on rage (combat panel / prior use). */
  rageWildHeart?: 'wolf' | 'bear' | 'eagle' | null
}

export type Barbarian2024UseResult = {
  ok: boolean
  resources: SheetResource[]
  message: string
  patches?: {
    healHp?: number
    tempHp?: number
    diceExpression?: string | null
    activeLabels?: string[]
    rageActive?: boolean
    restoreAllRages?: boolean
    classOptionsPatch?: {
      rage?: {
        wild_heart?: 'wolf' | 'bear' | 'eagle' | null
        wild_heart_power?: 'falcon' | 'lion' | 'ram' | null
        world_tree_travel_used?: boolean
        active?: boolean
        rounds_extended?: number
      }
      wild_heart_aspect?: 'salmon' | 'panther' | 'owl' | null
    }
  }
  tempHp?: number
}

function refuse(input: Barbarian2024UseInput, message: string): Barbarian2024UseResult {
  return { ok: false, resources: input.resources, message }
}

function ok(
  input: Barbarian2024UseInput,
  message: string,
  extra?: Partial<Barbarian2024UseResult>,
): Barbarian2024UseResult {
  return { ok: true, resources: input.resources, message, ...extra }
}

export function applyBarbarian2024FeatureUse(input: Barbarian2024UseInput): Barbarian2024UseResult {
  const fid = barbarian2024UseFeatureId(input.featureId) ?? input.featureId.replace(/_/g, '-')
  const level = lvl(input.barbarianLevel)
  const refund = Boolean(input.refund) || input.mode === 'refund'

  if (fid === 'rage') {
    const pool = findBarbarianPool2024(input.resources, RAGES_POOL_ID, input.classEntryId)
    if (!pool) return refuse(input, `${RAGE_NAME_RU}: пул не найден`)
    if (refund) {
      if (pool.used <= 0) return refuse(input, `${RAGE_NAME_RU}: нечего возвращать`)
      return ok(input, `${RAGE_NAME_RU}: использование возвращено`, {
        resources: bumpPool(input.resources, pool, -1),
      })
    }
    if (input.wearingHeavyArmor) {
      return refuse(input, `${RAGE_NAME_RU}: нельзя в тяжёлом доспехе`)
    }
    if (input.incapacitated) {
      return refuse(input, `${RAGE_NAME_RU}: нельзя, пока недееспособны`)
    }
    if (pool.used >= pool.max) return refuse(input, `${RAGE_NAME_RU}: нет использований`)
    const dmg = rageDamageBonus2024(level)
    const subclass = String(input.subclassSlug || '').trim().toLowerCase()
    const ragePatch: NonNullable<Barbarian2024UseResult['patches']>['classOptionsPatch'] = {
      rage: { active: true, rounds_extended: 0 },
    }
    let tempHp: number | undefined
    const labels = [RAGE_NAME_RU]

    if (subclass === BARBARIAN_SUBCLASS_SLUGS_2024.wildHeart) {
      const animal = input.wildHeartRage ?? input.rageWildHeart ?? null
      if (!animal || !isWildHeartRageOption2024(animal)) {
        return refuse(input, `${RAGE_OF_THE_WILDS_NAME_RU}: выберите Волка, Медведя или Орла`)
      }
      ragePatch!.rage!.wild_heart = animal
      const animalRu = wildHeartRageLabelRu(animal)
      if (animalRu) labels.push(`${RAGE_OF_THE_WILDS_NAME_RU}: ${animalRu}`)
      if (level >= 14) {
        const power = input.wildHeartPower ?? null
        if (power && isWildHeartPowerOption2024(power)) {
          ragePatch.rage!.wild_heart_power = power
          const powerRu = wildHeartPowerLabelRu(power)
          if (powerRu) labels.push(`${POWER_OF_THE_WILDS_NAME_RU}: ${powerRu}`)
        }
      }
    }

    if (subclass === BARBARIAN_SUBCLASS_SLUGS_2024.worldTree && level >= 3) {
      tempHp = level
      labels.push(`${VITALITY_OF_THE_TREE_NAME_RU}: временные хиты = ${level}`)
    }

    let message = `${RAGE_NAME_RU}: активна (урон +${dmg}; сопротивление дроб./кол./руб.; преим. к Силе)`
    if (tempHp) message += `; временные хиты = ${tempHp}`

    return ok(input, message, {
      resources: bumpPool(input.resources, pool, 1),
      tempHp,
      patches: {
        rageActive: true,
        tempHp,
        activeLabels: labels,
        classOptionsPatch: ragePatch,
      },
    })
  }

  if (fid === 'aspect-of-the-wilds') {
    const aspect = input.wildHeartAspect
    if (!aspect || !isWildHeartAspectOption2024(aspect)) {
      return refuse(input, `${ASPECT_OF_THE_WILDS_NAME_RU}: выберите аспект (лосось / пантера / сова)`)
    }
    const label = wildHeartAspectLabelRu(aspect)
    return ok(input, `${ASPECT_OF_THE_WILDS_NAME_RU}: ${label ?? aspect}`, {
      patches: {
        classOptionsPatch: { wild_heart_aspect: aspect },
        activeLabels: label ? [label] : [],
      },
    })
  }

  if (fid === 'power-of-the-wilds') {
    const power = input.wildHeartPower
    if (!power || !isWildHeartPowerOption2024(power)) {
      return refuse(input, `${POWER_OF_THE_WILDS_NAME_RU}: выберите Сокола, Льва или Барана`)
    }
    const label = wildHeartPowerLabelRu(power)
    return ok(input, `${POWER_OF_THE_WILDS_NAME_RU}: ${label ?? power} (при следующей ярости)`, {
      patches: {
        classOptionsPatch: { rage: { wild_heart_power: power } },
        activeLabels: label ? [label] : [],
      },
    })
  }

  if (fid === 'vitality-of-the-tree') {
    if (level < 3) return refuse(input, `${VITALITY_OF_THE_TREE_NAME_RU} с 3 уровня`)
    const thp = level
    return ok(input, `${VITALITY_OF_THE_TREE_NAME_RU}: временные хиты = ${thp}`, {
      tempHp: thp,
      patches: { tempHp: thp },
    })
  }

  if (fid === 'branches-of-the-tree') {
    if (level < 6) return refuse(input, `${BRANCHES_OF_THE_TREE_NAME_RU} с 6 уровня`)
    return ok(
      input,
      `${BRANCHES_OF_THE_TREE_NAME_RU}: удержание/телепорт союзников — отметьте на столе (мастер).`,
    )
  }

  if (fid === 'travel-along-the-tree') {
    if (level < TRAVEL_ALONG_THE_TREE_MIN_LEVEL_2024) {
      return refuse(
        input,
        `${TRAVEL_ALONG_THE_TREE_NAME_RU} с ${TRAVEL_ALONG_THE_TREE_MIN_LEVEL_2024} уровня`,
      )
    }
    // PHB 2024: while raging, bonus teleport ≤60 ft; once per rage ≤150 ft + up to six willing.
    return ok(
      input,
      `${TRAVEL_ALONG_THE_TREE_NAME_RU}: в ярости телепорт до 60 фт (бонусным); раз за ярость — до 150 фт и до шести согласных.`,
      {
        patches: {
          classOptionsPatch: { rage: { world_tree_travel_used: true } },
        },
      },
    )
  }

  if (fid === 'rage-of-the-wilds') {
    return ok(
      input,
      `${RAGE_OF_THE_WILDS_NAME_RU}: форму зверя выбирайте при входе в ярость (кнопка «Ярость»).`,
    )
  }

  if (fid === 'relentless-rage') {
    if (level < RELENTLESS_RAGE_MIN_LEVEL_2024) {
      return refuse(input, `${RELENTLESS_RAGE_NAME_RU} с ${RELENTLESS_RAGE_MIN_LEVEL_2024} уровня`)
    }
    const heal = relentlessRageHeal2024(level)
    return ok(
      input,
      `${RELENTLESS_RAGE_NAME_RU}: при успехе спасброска Тел — хиты = ${heal} (уровень × 2)`,
      { patches: { healHp: heal } },
    )
  }

  if (fid === 'persistent-rage') {
    if (level < PERSISTENT_RAGE_MIN_LEVEL_2024) {
      return refuse(input, `${PERSISTENT_RAGE_NAME_RU} с ${PERSISTENT_RAGE_MIN_LEVEL_2024} уровня`)
    }
    if (refund) {
      return refuse(input, `${PERSISTENT_RAGE_NAME_RU}: возврат не требуется`)
    }
    // Initiative restore-all (1 / long rest tracked by caller via mode or pool later).
    return ok(
      input,
      `${PERSISTENT_RAGE_NAME_RU}: при инициативе можно восстановить все использования ярости; ярость 10 мин без продления каждый раунд`,
      {
        resources: restoreAllRageUses2024(input.resources, input.classEntryId),
        patches: { restoreAllRages: true, rageActive: true },
      },
    )
  }

  if (fid === 'warrior-of-the-gods') {
    const stock = warriorOfTheGodsDice2024(level)
    if (stock.count <= 0) {
      return refuse(input, `${WARRIOR_OF_THE_GODS_NAME_RU} с 3 уровня (Путь фанатика)`)
    }
    const pool = findBarbarianPool2024(
      input.resources,
      WARRIOR_OF_THE_GODS_POOL_ID,
      input.classEntryId,
    )
    if (!pool) return refuse(input, `${WARRIOR_OF_THE_GODS_NAME_RU}: пул не найден`)
    if (refund) {
      if (pool.used <= 0) return refuse(input, `${WARRIOR_OF_THE_GODS_NAME_RU}: нечего возвращать`)
      return ok(input, `${WARRIOR_OF_THE_GODS_NAME_RU}: кости возвращены`, {
        resources: bumpPool(input.resources, pool, -Math.max(1, input.diceCount ?? 1)),
      })
    }
    const spend = Math.max(1, Math.min(stock.count, Math.floor(input.diceCount ?? 1)))
    const remaining = Math.max(0, pool.max - pool.used)
    if (spend > remaining) {
      return refuse(input, `${WARRIOR_OF_THE_GODS_NAME_RU}: недостаточно костей`)
    }
    return ok(input, `${WARRIOR_OF_THE_GODS_NAME_RU}: ${spend}к12 хитов`, {
      resources: bumpPool(input.resources, pool, spend),
      patches: { diceExpression: `${spend}d12`, healHp: spend },
    })
  }

  const simplePoolFeatures: Array<{
    id: string
    pool: string
    name: string
    minLevel: number
    spendMsg: string
  }> = [
    {
      id: 'fanatical-focus',
      pool: FANATICAL_FOCUS_POOL_ID,
      name: FANATICAL_FOCUS_NAME_RU,
      minLevel: 6,
      spendMsg: 'переброс спасброска с бонусом = урон ярости (1 раз за ярость)',
    },
    {
      id: 'zealous-presence',
      pool: ZEALOUS_PRESENCE_POOL_ID,
      name: ZEALOUS_PRESENCE_NAME_RU,
      minLevel: 10,
      spendMsg: 'до 10 существ с преимуществом к атакам и спасам до начала вашего след. хода',
    },
    {
      id: 'intimidating-presence',
      pool: INTIMIDATING_PRESENCE_POOL_ID,
      name: INTIMIDATING_PRESENCE_NAME_RU,
      minLevel: 14,
      spendMsg: 'существа в 30 фт. — спас Мудрости или Испуганы',
    },
    {
      id: 'rage-of-the-gods',
      pool: RAGE_OF_THE_GODS_POOL_ID,
      name: RAGE_OF_THE_GODS_NAME_RU,
      minLevel: 14,
      spendMsg: 'облик богов на 1 мин. (полёт, сопротивления; реакция спасает союзника)',
    },
  ]

  for (const row of simplePoolFeatures) {
    if (fid !== row.id) continue
    if (level < row.minLevel) {
      return refuse(input, `${row.name} с ${row.minLevel} уровня`)
    }
    const pool = findBarbarianPool2024(input.resources, row.pool, input.classEntryId)
    if (!pool) return refuse(input, `${row.name}: пул не найден`)
    if (refund) {
      if (pool.used <= 0) return refuse(input, `${row.name}: нечего возвращать`)
      return ok(input, `${row.name}: использование возвращено`, {
        resources: bumpPool(input.resources, pool, -1),
      })
    }
    if (input.mode === 'refund_with_rage') {
      const rage = findBarbarianPool2024(input.resources, RAGES_POOL_ID, input.classEntryId)
      if (!rage || rage.used >= rage.max) {
        return refuse(input, `${row.name}: нет ярости для восстановления`)
      }
      let next = bumpPool(input.resources, rage, 1)
      const refreshed = findBarbarianPool2024(next, row.pool, input.classEntryId)
      if (refreshed && refreshed.used > 0) {
        next = bumpPool(next, refreshed, -refreshed.used)
      }
      return ok(input, `${row.name}: восстановлено за использование ярости`, { resources: next })
    }
    if (pool.used >= pool.max) return refuse(input, `${row.name}: нет использований`)
    return ok(input, `${row.name}: ${row.spendMsg}`, {
      resources: bumpPool(input.resources, pool, 1),
    })
  }

  if (fid === 'retaliation') {
    return ok(
      input,
      `${RETALIATION_NAME_RU}: реакцией — одна рукопашная атака по существу в 5 фт., нанёсшему вам урон`,
    )
  }

  return refuse(input, 'Неизвестное умение варвара 2024')
}
