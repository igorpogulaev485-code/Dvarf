/**
 * Rogue 2024 (PHB / SRD 5.2): Sneak Attack, Expertise, Weapon Mastery,
 * Cunning Action, Steady Aim, Cunning / Improved / Devious Strikes,
 * Reliable Talent @7, Slippery Mind (Wis+Cha), Stroke of Luck, and PHB
 * subclasses (Thief, Assassin, Arcane Trickster, Soulknife).
 *
 * Callers branch on `rules_edition === '2024'`; nothing here feeds the 2014
 * rogue pack. Names follow the FINAL Russian list approved by Игорь 18.11.2026.
 */

import type { ClassLevelEntry } from './classLevels'
import type { FeatureChoiceDef } from './classFeatures'
import { normalizeClassSlug2024 } from './edition2024Classes'
import { parseFeatureResourceId } from './featureResources'
import { clampResource, type SheetResource } from './rest'

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL)                                                  */
/* ------------------------------------------------------------------ */

export const ROGUE_CLASS_NAME_RU = 'Плут'

export const EXPERTISE_NAME_RU = 'Компетентность'
export const SNEAK_ATTACK_NAME_RU = 'Скрытая атака'
export const WEAPON_MASTERY_NAME_RU = 'Оружейное мастерство'
export const THIEVES_CANT_NAME_RU = 'Воровской жаргон'
export const CUNNING_ACTION_NAME_RU = 'Хитрое действие'
export const ROGUE_SUBCLASS_NAME_RU = 'Подкласс плута'
export const STEADY_AIM_NAME_RU = 'Точное прицеливание'
export const ASI_NAME_RU = 'Увеличение характеристик'
export const CUNNING_STRIKE_NAME_RU = 'Хитрый удар'
export const UNCANNY_DODGE_NAME_RU = 'Невероятное уклонение'
export const RELIABLE_TALENT_NAME_RU = 'Надёжный талант'
export const EVASION_NAME_RU = 'Увёртливость'
export const IMPROVED_CUNNING_STRIKE_NAME_RU = 'Улучшенный Хитрый удар'
export const DEVIOUS_STRIKES_NAME_RU = 'Бесчестные удары'
export const SLIPPERY_MIND_NAME_RU = 'Скользкий ум'
export const ELUSIVE_NAME_RU = 'Неуловимость'
export const EPIC_BOON_NAME_RU = 'Эпический дар'
export const STROKE_OF_LUCK_NAME_RU = 'Удача'
export const SUBCLASS_FEATURE_NAME_RU = 'Умение подкласса'

/* Thief */
export const THIEF_NAME_RU = 'Вор'
export const FAST_HANDS_NAME_RU = 'Быстрые руки'
export const SECOND_STORY_WORK_NAME_RU = 'Работа на высоте'
export const SUPREME_SNEAK_NAME_RU = 'Превосходная скрытность'
export const USE_MAGIC_DEVICE_NAME_RU = 'Использование магических устройств'
export const THIEFS_REFLEXES_NAME_RU = 'Рефлексы вора'

/* Assassin */
export const ASSASSIN_NAME_RU = 'Убийца'
export const ASSASSINATE_NAME_RU = 'Убийство'
export const ASSASSINS_TOOLS_NAME_RU = 'Инструменты убийцы'
export const INFILTRATION_EXPERTISE_NAME_RU = 'Мастерство внедрения'
export const ENVENOM_WEAPONS_NAME_RU = 'Покрытое ядом оружие'
export const DEATH_STRIKE_NAME_RU = 'Смертельный удар'

/* Arcane Trickster */
export const ARCANE_TRICKSTER_NAME_RU = 'Мистический ловкач'
export const SPELLCASTING_NAME_RU = 'Сотворение заклинаний'
export const MAGE_HAND_LEGERDEMAIN_NAME_RU = 'Ловкость волшебной руки'
export const MAGICAL_AMBUSH_NAME_RU = 'Магическая засада'
export const VERSATILE_TRICKSTER_NAME_RU = 'Универсальный ловкач'
export const SPELL_THIEF_NAME_RU = 'Похититель заклинаний'

/* Soulknife */
export const SOULKNIFE_NAME_RU = 'Клинок душ'
export const PSIONIC_POWER_NAME_RU = 'Псионическая сила'
export const PSYCHIC_BLADES_NAME_RU = 'Психические клинки'
export const SOUL_BLADES_NAME_RU = 'Клинки души'
export const PSYCHIC_VEIL_NAME_RU = 'Психическая завеса'
export const REND_MIND_NAME_RU = 'Разрыв разума'

/* Cunning Strike effect names (FINAL) */
export const CUNNING_STRIKE_EFFECT_NAMES_RU: Record<string, string> = {
  poison: 'Отравление',
  trip: 'Подсечка',
  withdraw: 'Отступление',
  daze: 'Шок',
  'knock-out': 'Нокаут',
  knockout: 'Нокаут',
  obscure: 'Ослепление',
  blind: 'Ослепление',
  'supreme-sneak': 'Скрытная атака',
  supreme_sneak: 'Скрытная атака',
  'strike-fear': 'Удар страха',
  strike_fear: 'Удар страха',
}

/* ------------------------------------------------------------------ */
/* Ids / pools                                                         */
/* ------------------------------------------------------------------ */

export const ROGUE_CLASS_SLUG_2024 = 'rogue'

export const ROGUE_SUBCLASS_SLUGS_2024 = {
  thief: 'rogue__thief',
  assassin: 'rogue__assassin',
  arcaneTrickster: 'rogue__arcane-trickster',
  soulknife: 'rogue__soulknife',
} as const

export type RogueSubclassKey2024 = keyof typeof ROGUE_SUBCLASS_SLUGS_2024

/**
 * Still outside the 2024 picker after P24-M02B-rogue.
 * Scion + Phantom are opened via M02B_ROGUE_BOOK_SUBCLASS_SLUGS — not listed here.
 */
export const OUT_OF_PACK_ROGUE_SUBCLASSES_2024 = [
  'rogue__swashbuckler',
  'rogue__inquisitive',
  'rogue__mastermind',
  'rogue__scout',
  'rogue__soulknife-2014',
] as const

export const SNEAK_ATTACK_SCALE_ID = 'sneak_attack'
export const STROKE_OF_LUCK_POOL_ID = 'stroke_of_luck'
/** Matches subclass resource pool_id from edition2024Subclasses / backend. */
export const PSIONIC_ENERGY_POOL_ID = 'psionic_energy_dice'
export const PSYCHIC_VEIL_POOL_ID = 'psychic_veil'
export const REND_MIND_POOL_ID = 'rend_mind'
export const SPELL_THIEF_POOL_ID = 'spell_thief'

export const EXPERTISE_FEATURE_ID = 'expertise'
export const EXPERTISE_6_FEATURE_ID = 'expertise_6'

export const SUBCLASS_MIN_LEVEL_2024 = 3
export const CUNNING_ACTION_MIN_LEVEL_2024 = 2
export const STEADY_AIM_MIN_LEVEL_2024 = 3
export const CUNNING_STRIKE_MIN_LEVEL_2024 = 5
export const UNCANNY_DODGE_MIN_LEVEL_2024 = 5
export const EXPERTISE_MIN_LEVEL_2024 = 1
export const EXPERTISE_6_MIN_LEVEL_2024 = 6
export const RELIABLE_TALENT_MIN_LEVEL_2024 = 7
export const EVASION_MIN_LEVEL_2024 = 7
export const IMPROVED_CUNNING_STRIKE_MIN_LEVEL_2024 = 11
export const DEVIOUS_STRIKES_MIN_LEVEL_2024 = 14
export const SLIPPERY_MIND_MIN_LEVEL_2024 = 15
export const ELUSIVE_MIN_LEVEL_2024 = 18
export const EPIC_BOON_MIN_LEVEL_2024 = 19
export const STROKE_OF_LUCK_MIN_LEVEL_2024 = 20

export const WEAPON_MASTERY_SLOTS_2024 = 2

/* ------------------------------------------------------------------ */
/* Feature names by id (leveling / sheet labels)                       */
/* ------------------------------------------------------------------ */

export const ROGUE_FEATURE_NAMES_BY_ID: Record<string, string> = {
  expertise: EXPERTISE_NAME_RU,
  expertise_1: EXPERTISE_NAME_RU,
  expertise_6: EXPERTISE_NAME_RU,
  'sneak-attack': SNEAK_ATTACK_NAME_RU,
  sneak_attack: SNEAK_ATTACK_NAME_RU,
  'thieves-cant': THIEVES_CANT_NAME_RU,
  thieves_cant: THIEVES_CANT_NAME_RU,
  'weapon-mastery': WEAPON_MASTERY_NAME_RU,
  weapon_mastery: WEAPON_MASTERY_NAME_RU,
  'cunning-action': CUNNING_ACTION_NAME_RU,
  cunning_action: CUNNING_ACTION_NAME_RU,
  'rogue-subclass': ROGUE_SUBCLASS_NAME_RU,
  rogue_subclass: ROGUE_SUBCLASS_NAME_RU,
  subclass: ROGUE_SUBCLASS_NAME_RU,
  'steady-aim': STEADY_AIM_NAME_RU,
  steady_aim: STEADY_AIM_NAME_RU,
  'ability-score-improvement': ASI_NAME_RU,
  ability_score_improvement: ASI_NAME_RU,
  asi: ASI_NAME_RU,
  'cunning-strike': CUNNING_STRIKE_NAME_RU,
  cunning_strike: CUNNING_STRIKE_NAME_RU,
  'uncanny-dodge': UNCANNY_DODGE_NAME_RU,
  uncanny_dodge: UNCANNY_DODGE_NAME_RU,
  'reliable-talent': RELIABLE_TALENT_NAME_RU,
  reliable_talent: RELIABLE_TALENT_NAME_RU,
  evasion: EVASION_NAME_RU,
  'improved-cunning-strike': IMPROVED_CUNNING_STRIKE_NAME_RU,
  improved_cunning_strike: IMPROVED_CUNNING_STRIKE_NAME_RU,
  'devious-strikes': DEVIOUS_STRIKES_NAME_RU,
  devious_strikes: DEVIOUS_STRIKES_NAME_RU,
  'slippery-mind': SLIPPERY_MIND_NAME_RU,
  slippery_mind: SLIPPERY_MIND_NAME_RU,
  elusive: ELUSIVE_NAME_RU,
  'epic-boon': EPIC_BOON_NAME_RU,
  epic_boon: EPIC_BOON_NAME_RU,
  'stroke-of-luck': STROKE_OF_LUCK_NAME_RU,
  stroke_of_luck: STROKE_OF_LUCK_NAME_RU,
  'subclass-feature': SUBCLASS_FEATURE_NAME_RU,
  subclass_feature: SUBCLASS_FEATURE_NAME_RU,

  /* Thief */
  'fast-hands': FAST_HANDS_NAME_RU,
  fast_hands: FAST_HANDS_NAME_RU,
  'second-story-work': SECOND_STORY_WORK_NAME_RU,
  second_story_work: SECOND_STORY_WORK_NAME_RU,
  'supreme-sneak': SUPREME_SNEAK_NAME_RU,
  supreme_sneak: SUPREME_SNEAK_NAME_RU,
  'use-magic-device': USE_MAGIC_DEVICE_NAME_RU,
  use_magic_device: USE_MAGIC_DEVICE_NAME_RU,
  'thiefs-reflexes': THIEFS_REFLEXES_NAME_RU,
  thiefs_reflexes: THIEFS_REFLEXES_NAME_RU,

  /* Assassin */
  assassinate: ASSASSINATE_NAME_RU,
  'assassins-tools': ASSASSINS_TOOLS_NAME_RU,
  assassins_tools: ASSASSINS_TOOLS_NAME_RU,
  'infiltration-expertise': INFILTRATION_EXPERTISE_NAME_RU,
  infiltration_expertise: INFILTRATION_EXPERTISE_NAME_RU,
  'envenom-weapon': ENVENOM_WEAPONS_NAME_RU,
  'envenom-weapons': ENVENOM_WEAPONS_NAME_RU,
  envenom_weapon: ENVENOM_WEAPONS_NAME_RU,
  envenom_weapons: ENVENOM_WEAPONS_NAME_RU,
  'death-strike': DEATH_STRIKE_NAME_RU,
  death_strike: DEATH_STRIKE_NAME_RU,

  /* Arcane Trickster */
  spellcasting: SPELLCASTING_NAME_RU,
  'mage-hand-legerdemain': MAGE_HAND_LEGERDEMAIN_NAME_RU,
  mage_hand_legerdemain: MAGE_HAND_LEGERDEMAIN_NAME_RU,
  'magical-ambush': MAGICAL_AMBUSH_NAME_RU,
  magical_ambush: MAGICAL_AMBUSH_NAME_RU,
  'versatile-trickster': VERSATILE_TRICKSTER_NAME_RU,
  versatile_trickster: VERSATILE_TRICKSTER_NAME_RU,
  'spell-thief': SPELL_THIEF_NAME_RU,
  spell_thief: SPELL_THIEF_NAME_RU,

  /* Soulknife */
  'psionic-power': PSIONIC_POWER_NAME_RU,
  psionic_power: PSIONIC_POWER_NAME_RU,
  'psychic-blades': PSYCHIC_BLADES_NAME_RU,
  psychic_blades: PSYCHIC_BLADES_NAME_RU,
  'soul-blades': SOUL_BLADES_NAME_RU,
  soul_blades: SOUL_BLADES_NAME_RU,
  'psychic-veil': PSYCHIC_VEIL_NAME_RU,
  psychic_veil: PSYCHIC_VEIL_NAME_RU,
  'rend-mind': REND_MIND_NAME_RU,
  rend_mind: REND_MIND_NAME_RU,
}

export function rogueFeatureNameRu2024(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.trim().replace(/_/g, '-')
  return (
    ROGUE_FEATURE_NAMES_BY_ID[featureId]
    || ROGUE_FEATURE_NAMES_BY_ID[key]
    || ROGUE_FEATURE_NAMES_BY_ID[featureId.replace(/-/g, '_')]
    || null
  )
}

export function cunningStrikeEffectNameRu2024(optionId: string | null | undefined): string | null {
  if (!optionId) return null
  const key = optionId.trim().replace(/_/g, '-')
  return (
    CUNNING_STRIKE_EFFECT_NAMES_RU[optionId]
    || CUNNING_STRIKE_EFFECT_NAMES_RU[key]
    || CUNNING_STRIKE_EFFECT_NAMES_RU[optionId.replace(/-/g, '_')]
    || null
  )
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function lvl(value: number): number {
  return Math.max(0, Math.floor(value || 0))
}

export function isRogueClassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  if (key === ROGUE_CLASS_SLUG_2024) return true
  return /плут|rogue/.test(key)
}

export function normalizeRogueClassSlug(
  slug: string | null | undefined,
): string | null {
  const n = normalizeClassSlug2024(slug ?? '')
  return n === ROGUE_CLASS_SLUG_2024
    ? n
    : isRogueClassSlug(slug)
      ? ROGUE_CLASS_SLUG_2024
      : null
}

export function rogueLevelsFromClasses(classes: ClassLevelEntry[] | undefined | null): number {
  let total = 0
  for (const row of classes ?? []) {
    const catalogId = String((row as { catalog_id?: string }).catalog_id ?? '').toLowerCase()
    if (
      normalizeRogueClassSlug(row.name)
      || catalogId.includes('rogue')
      || /плут/i.test(row.name || '')
    ) {
      total += Math.max(0, Math.floor(row.level))
    }
  }
  return total
}

export function isPhbRogueSubclassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return (Object.values(ROGUE_SUBCLASS_SLUGS_2024) as string[]).includes(key)
}

export function isOutOfPackRogueSubclassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return (OUT_OF_PACK_ROGUE_SUBCLASSES_2024 as readonly string[]).includes(key)
}

/**
 * Sneak Attack dice count: 1d6 @1, +1d6 every 2 levels → 10d6 @19–20.
 * Same progression as 2014; only labels / UX differ by edition.
 */
export function sneakAttackDice2024(rogueLevel: number): number {
  const level = lvl(rogueLevel)
  if (level < 1) return 0
  return Math.min(10, Math.ceil(level / 2))
}

export function sneakAttackDiceLabel2024(rogueLevel: number): string {
  const n = sneakAttackDice2024(rogueLevel)
  return n > 0 ? `${n}к6` : '0'
}

/** Weapon Mastery: fixed 2 kinds; after long rest may change all selected. */
export function weaponMasterySlots2024(rogueLevel: number): number {
  return lvl(rogueLevel) >= 1 ? WEAPON_MASTERY_SLOTS_2024 : 0
}

/** Expertise picks owed: 2 @1, +2 @6. */
export function expertiseSkillsTotal2024(rogueLevel: number): number {
  const level = lvl(rogueLevel)
  if (level >= EXPERTISE_6_MIN_LEVEL_2024) return 4
  if (level >= EXPERTISE_MIN_LEVEL_2024) return 2
  return 0
}

export function expertiseFeatureIdForLevel2024(featureLevel: number): string {
  return featureLevel >= EXPERTISE_6_MIN_LEVEL_2024
    ? EXPERTISE_6_FEATURE_ID
    : EXPERTISE_FEATURE_ID
}

export const expertiseChoice2024: FeatureChoiceDef = {
  id: 'expertise',
  label_ru: EXPERTISE_NAME_RU,
  options_from: 'expertise_skills_tools',
  max_picks: 2,
}

export const expertise6Choice2024: FeatureChoiceDef = {
  ...expertiseChoice2024,
  id: 'expertise_6',
}

export const ROGUE_EXPERTISE_CHOICE_STEPS_2024: Array<{ featureId: string; level: number }> = [
  { featureId: 'expertise', level: EXPERTISE_MIN_LEVEL_2024 },
  { featureId: 'expertise_6', level: EXPERTISE_6_MIN_LEVEL_2024 },
]

/** Cunning Strike: 1 effect @5; 2 effects @11 (Improved). */
export function cunningStrikeEffectCount2024(rogueLevel: number): number {
  const level = lvl(rogueLevel)
  if (level >= IMPROVED_CUNNING_STRIKE_MIN_LEVEL_2024) return 2
  if (level >= CUNNING_STRIKE_MIN_LEVEL_2024) return 1
  return 0
}

export function hasReliableTalent2024(rogueLevel: number): boolean {
  return lvl(rogueLevel) >= RELIABLE_TALENT_MIN_LEVEL_2024
}

/** 2014 Reliable Talent stays at 11 — do not use this helper on 2014 sheets. */
export function hasReliableTalent2014(rogueLevel: number): boolean {
  return lvl(rogueLevel) >= 11
}

/** Slippery Mind 2024: Wis + Cha save proficiency. */
export function slipperyMindSaveProficiencies2024(rogueLevel: number): Array<'wis' | 'cha'> {
  return lvl(rogueLevel) >= SLIPPERY_MIND_MIN_LEVEL_2024 ? ['wis', 'cha'] : []
}

/** Soulknife Psionic Energy dice: count × die by rogue level. */
export function psionicEnergyDice2024(rogueLevel: number): { die: number; count: number } {
  const level = lvl(rogueLevel)
  if (level < 3) return { die: 0, count: 0 }
  if (level >= 17) return { die: 12, count: 12 }
  if (level >= 13) return { die: 10, count: 10 }
  if (level >= 11) return { die: 10, count: 8 }
  if (level >= 9) return { die: 8, count: 8 }
  if (level >= 5) return { die: 8, count: 6 }
  return { die: 6, count: 4 }
}

export function strokeOfLuckMax2024(rogueLevel: number): number {
  return lvl(rogueLevel) >= STROKE_OF_LUCK_MIN_LEVEL_2024 ? 1 : 0
}

/* ------------------------------------------------------------------ */
/* Sheet use / spend (2024 only)                                       */
/* ------------------------------------------------------------------ */

const ROGUE_USE_FEATURE_IDS = new Set([
  'stroke-of-luck',
  'steady-aim',
  'cunning-action',
  'cunning-strike',
  'psionic-power',
  'psychic-veil',
  'rend-mind',
  'spell-thief',
  'fast-hands',
  /* P24-M02B book */
  'bloodthirst',
  'dread-allegiance',
  'strike-fear',
  'aura-of-malevolence',
  'dread-incarnate',
  'whispers-of-the-dead',
  'wails-from-the-grave',
  'tokens-of-the-departed',
  'voice-of-death',
  'ghost-walk',
  'death-s-friend',
])

export const ROGUE_2024_CARD_BUTTONS: Record<string, string> = {
  'stroke-of-luck': 'Удача…',
  stroke_of_luck: 'Удача…',
  'steady-aim': 'Прицел…',
  steady_aim: 'Прицел…',
  'cunning-action': 'Хитрое…',
  cunning_action: 'Хитрое…',
  'cunning-strike': 'Хитрый удар…',
  cunning_strike: 'Хитрый удар…',
  'psionic-power': 'Пси…',
  psionic_power: 'Пси…',
  'psychic-veil': 'Завеса…',
  psychic_veil: 'Завеса…',
  'rend-mind': 'Разрыв…',
  rend_mind: 'Разрыв…',
  'spell-thief': 'Похитить…',
  spell_thief: 'Похитить…',
  'fast-hands': 'Руки…',
  fast_hands: 'Руки…',
  bloodthirst: 'Реакция…',
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

export function rogue2024UseFeatureId(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.trim().replace(/_/g, '-')
  if (key === 'stroke_of_luck' || key === 'stroke-of-luck') return 'stroke-of-luck'
  return ROGUE_USE_FEATURE_IDS.has(key) ? key : null
}

export function isRogueUseFeatureId2024(featureId: string | null | undefined): boolean {
  return rogue2024UseFeatureId(featureId) != null
}

export function findRoguePool2024(
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
      return parsed?.poolId === poolId && parsed.classSlug === ROGUE_CLASS_SLUG_2024
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

export function spendStrokeOfLuck2024(
  resources: SheetResource[] | undefined | null,
  classEntryId?: string,
): { ok: true; resources: SheetResource[] } | { ok: false; reason_ru: string } {
  const list = [...(resources ?? [])]
  const pool = findRoguePool2024(list, STROKE_OF_LUCK_POOL_ID, classEntryId)
  if (!pool) return { ok: false, reason_ru: 'Нет пула «Удача» на листе.' }
  if (pool.used >= pool.max) return { ok: false, reason_ru: '«Удача» уже использована.' }
  return { ok: true, resources: bumpPool(list, pool, 1) }
}

export function refundStrokeOfLuck2024(
  resources: SheetResource[] | undefined | null,
  classEntryId?: string,
): { ok: true; resources: SheetResource[] } | { ok: false; reason_ru: string } {
  const list = [...(resources ?? [])]
  const pool = findRoguePool2024(list, STROKE_OF_LUCK_POOL_ID, classEntryId)
  if (!pool) return { ok: false, reason_ru: 'Нет пула «Удача» на листе.' }
  if (pool.used <= 0) return { ok: false, reason_ru: 'Нечего возвращать.' }
  return { ok: true, resources: bumpPool(list, pool, -1) }
}

export type RogueFeatureRequest =
  | { kind: 'stroke_of_luck'; refund?: boolean }
  | { kind: 'steady_aim' }
  | { kind: 'cunning_action'; action: 'dash' | 'disengage' | 'hide' }
  | { kind: 'cunning_strike'; optionIds: string[] }
  | { kind: 'psionic_energy'; spend: number; refund?: boolean }
  | { kind: 'psychic_veil'; restoreWithDie?: boolean }
  | { kind: 'rend_mind'; restoreWithDice?: boolean }
  | { kind: 'spell_thief' }
  | { kind: 'fast_hands'; mode: 'sleight' | 'use_object' | 'magic_item' }

export function applyRogue2024FeatureUse(
  resources: SheetResource[] | undefined | null,
  request: RogueFeatureRequest,
  classEntryId?: string,
): { ok: true; resources: SheetResource[]; note_ru?: string } | { ok: false; reason_ru: string } {
  if (request.kind === 'stroke_of_luck') {
    return request.refund
      ? refundStrokeOfLuck2024(resources, classEntryId)
      : spendStrokeOfLuck2024(resources, classEntryId)
  }
  if (request.kind === 'psionic_energy') {
    const list = [...(resources ?? [])]
    const pool = findRoguePool2024(list, PSIONIC_ENERGY_POOL_ID, classEntryId)
    if (!pool) return { ok: false, reason_ru: 'Нет пула псионической энергии.' }
    const spend = Math.max(0, Math.floor(request.spend || 0))
    if (request.refund) {
      if (pool.used <= 0) return { ok: false, reason_ru: 'Нечего возвращать.' }
      return { ok: true, resources: bumpPool(list, pool, -Math.min(spend || 1, pool.used)) }
    }
    if (spend < 1) return { ok: false, reason_ru: 'Укажите число костей.' }
    if (pool.used + spend > pool.max) {
      return { ok: false, reason_ru: 'Недостаточно костей псионической энергии.' }
    }
    return { ok: true, resources: bumpPool(list, pool, spend) }
  }
  if (request.kind === 'psychic_veil') {
    const list = [...(resources ?? [])]
    if (request.restoreWithDie) {
      const psi = findRoguePool2024(list, PSIONIC_ENERGY_POOL_ID, classEntryId)
      if (!psi || psi.used >= psi.max) {
        return { ok: false, reason_ru: 'Нужна свободная кость псионической энергии.' }
      }
      const veil = findRoguePool2024(list, PSYCHIC_VEIL_POOL_ID, classEntryId)
      let next = bumpPool(list, psi, 1)
      if (veil && veil.used > 0) next = bumpPool(next, veil, -1)
      return { ok: true, resources: next, note_ru: 'Завеса восстановлена за кость.' }
    }
    const veil = findRoguePool2024(list, PSYCHIC_VEIL_POOL_ID, classEntryId)
    if (!veil) return { ok: false, reason_ru: 'Нет пула «Психическая завеса».' }
    if (veil.used >= veil.max) return { ok: false, reason_ru: 'Завеса уже использована.' }
    return { ok: true, resources: bumpPool(list, veil, 1) }
  }
  if (request.kind === 'rend_mind') {
    const list = [...(resources ?? [])]
    if (request.restoreWithDice) {
      const psi = findRoguePool2024(list, PSIONIC_ENERGY_POOL_ID, classEntryId)
      if (!psi || psi.used + 3 > psi.max) {
        return { ok: false, reason_ru: 'Нужны три кости псионической энергии.' }
      }
      const rend = findRoguePool2024(list, REND_MIND_POOL_ID, classEntryId)
      let next = bumpPool(list, psi, 3)
      if (rend && rend.used > 0) next = bumpPool(next, rend, -1)
      return { ok: true, resources: next, note_ru: '«Разрыв разума» восстановлен за 3 кости.' }
    }
    const rend = findRoguePool2024(list, REND_MIND_POOL_ID, classEntryId)
    if (!rend) return { ok: false, reason_ru: 'Нет пула «Разрыв разума».' }
    if (rend.used >= rend.max) return { ok: false, reason_ru: '«Разрыв разума» уже использован.' }
    return { ok: true, resources: bumpPool(list, rend, 1) }
  }
  if (request.kind === 'spell_thief') {
    const list = [...(resources ?? [])]
    const pool = findRoguePool2024(list, SPELL_THIEF_POOL_ID, classEntryId)
    if (!pool) return { ok: false, reason_ru: 'Нет пула «Похититель заклинаний».' }
    if (pool.used >= pool.max) return { ok: false, reason_ru: 'Уже использовано.' }
    return { ok: true, resources: bumpPool(list, pool, 1) }
  }
  // Steady Aim / Cunning Action / Fast Hands / Cunning Strike — turn-economy /
  // combat UI; no pool spend here beyond acknowledging the request.
  return { ok: true, resources: [...(resources ?? [])] }
}
