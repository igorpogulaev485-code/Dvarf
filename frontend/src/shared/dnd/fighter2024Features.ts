/**
 * Fighter 2024 (PHB / SRD 5.2): Second Wind, Action Surge, Weapon Mastery,
 * Tactical Mind / Shift / Master, Studied Attacks, Indomitable, and PHB
 * subclasses (Champion, Battle Master, Eldritch Knight, Psi Warrior).
 *
 * Callers branch on `rules_edition === '2024'`; nothing here feeds the 2014
 * fighter pack. Names follow the FINAL Russian list approved by Игорь 18.11.2026.
 */

import type { ClassLevelEntry } from './classLevels'
import { normalizeClassSlug2024 } from './edition2024Classes'
import { parseFeatureResourceId } from './featureResources'
import { clampResource, type SheetResource } from './rest'

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL)                                                  */
/* ------------------------------------------------------------------ */

export const FIGHTER_CLASS_NAME_RU = 'Воин'

export const FIGHTING_STYLE_NAME_RU = 'Боевой стиль'
export const SECOND_WIND_NAME_RU = 'Второе дыхание'
export const WEAPON_MASTERY_NAME_RU = 'Оружейное мастерство'
export const ACTION_SURGE_NAME_RU = 'Всплеск действий'
export const TACTICAL_MIND_NAME_RU = 'Тактическое мышление'
export const FIGHTER_SUBCLASS_NAME_RU = 'Подкласс воина'
export const ASI_NAME_RU = 'Увеличение характеристик'
export const EXTRA_ATTACK_NAME_RU = 'Дополнительная атака'
export const TWO_EXTRA_ATTACKS_NAME_RU = 'Две дополнительные атаки'
export const THREE_EXTRA_ATTACKS_NAME_RU = 'Три дополнительные атаки'
export const TACTICAL_SHIFT_NAME_RU = 'Тактическое смещение'
export const INDOMITABLE_NAME_RU = 'Непоколебимость'
export const TACTICAL_MASTER_NAME_RU = 'Тактическое решение'
export const STUDIED_ATTACKS_NAME_RU = 'Изучающие выпады'
export const EPIC_BOON_NAME_RU = 'Эпический дар'
export const SUBCLASS_FEATURE_NAME_RU = 'Умение подкласса'
export const SPELLCASTING_NAME_RU = 'Сотворение заклинаний'

/* Champion */
export const CHAMPION_NAME_RU = 'Чемпион'
export const IMPROVED_CRITICAL_NAME_RU = 'Улучшенный критический удар'
export const REMARKABLE_ATHLETE_NAME_RU = 'Выдающийся атлет'
export const ADDITIONAL_FIGHTING_STYLE_NAME_RU = 'Дополнительный боевой стиль'
export const HEROIC_WARRIOR_NAME_RU = 'Героический воин'
export const SUPERIOR_CRITICAL_NAME_RU = 'Превосходный критический удар'
export const DEFY_DEATH_NAME_RU = 'Вызов смерти'
export const DENY_DEATH_NAME_RU = 'Отрицание смерти'
export const HEROIC_FORTITUDE_NAME_RU = 'Героическая крепость'

/* Battle Master */
export const BATTLE_MASTER_NAME_RU = 'Мастер боевых искусств'
export const COMBAT_SUPERIORITY_NAME_RU = 'Боевое превосходство'
export const STUDENT_OF_WAR_NAME_RU = 'Ученик войны'
export const KNOW_YOUR_ENEMY_NAME_RU = 'Знай своего врага'
export const IMPROVED_COMBAT_SUPERIORITY_NAME_RU = 'Улучшенное боевое превосходство'
export const RELENTLESS_NAME_RU = 'Неутомимый'
export const ULTIMATE_COMBAT_SUPERIORITY_NAME_RU = 'Абсолютное боевое превосходство'

/* Eldritch Knight */
export const ELDRITCH_KNIGHT_NAME_RU = 'Мистический рыцарь'
export const WEAPON_BOND_NAME_RU = 'Связь с оружием'
export const WAR_MAGIC_NAME_RU = 'Боевая магия'
export const ELDRITCH_STRIKE_NAME_RU = 'Мистический удар'
export const ARCANE_CHARGE_NAME_RU = 'Магический рывок'
export const IMPROVED_WAR_MAGIC_NAME_RU = 'Улучшенная боевая магия'

/* Psi Warrior */
export const PSI_WARRIOR_NAME_RU = 'Пси-воин'
export const PSIONIC_POWER_NAME_RU = 'Псионическая сила'
export const TELEKINETIC_ADEPT_NAME_RU = 'Телекинетический адепт'
export const GUARDED_MIND_NAME_RU = 'Охраняемый разум'
export const BULWARK_OF_FORCE_NAME_RU = 'Оплот силы'
export const TELEKINETIC_MASTER_NAME_RU = 'Мастер телекинеза'

/* ------------------------------------------------------------------ */
/* Ids / pools                                                         */
/* ------------------------------------------------------------------ */

export const FIGHTER_CLASS_SLUG_2024 = 'fighter'

export const FIGHTER_SUBCLASS_SLUGS_2024 = {
  champion: 'fighter__champion',
  battlemaster: 'fighter__battlemaster',
  eldritchKnight: 'fighter__eldritch-knight',
  psiWarrior: 'fighter__psi-warrior',
} as const

export type FighterSubclassKey2024 = keyof typeof FIGHTER_SUBCLASS_SLUGS_2024

/**
 * Book / 2014-only — not in PHB 2024 picker.
 * P24-M02B-fighter opens `fighter__arcane-archer` + `fighter__banneret` via
 * M02B_FIGHTER_BOOK_SUBCLASS_SLUGS (not listed here). Purple Dragon stays out.
 */
export const OUT_OF_PACK_FIGHTER_SUBCLASSES_2024 = [
  'fighter__purple-dragon-knight', // 2014 Purple Dragon Knight — not 2024 Banneret
  'fighter__cavalier',
  'fighter__samurai',
  'fighter__echo-knight',
  'fighter__rune-knight',
] as const

export const SECOND_WIND_POOL_ID = 'second_wind'
export const ACTION_SURGE_POOL_ID = 'action_surge'
export const INDOMITABLE_POOL_ID = 'indomitable'
export const SUPERIORITY_DICE_POOL_ID = 'superiority_dice'
export const PSIONIC_ENERGY_POOL_ID = 'psionic_energy'
export const KNOW_YOUR_ENEMY_POOL_ID = 'know_your_enemy'
export const TELEKINETIC_MOVEMENT_POOL_ID = 'telekinetic_movement'
export const PSI_POWERED_LEAP_POOL_ID = 'psi_powered_leap'
export const BULWARK_OF_FORCE_POOL_ID = 'bulwark_of_force'
export const TELEKINETIC_MASTER_POOL_ID = 'telekinetic_master'

export const SUBCLASS_MIN_LEVEL_2024 = 3
export const ACTION_SURGE_MIN_LEVEL_2024 = 2
export const TACTICAL_MIND_MIN_LEVEL_2024 = 2
export const EXTRA_ATTACK_MIN_LEVEL_2024 = 5
export const TACTICAL_SHIFT_MIN_LEVEL_2024 = 5
export const INDOMITABLE_MIN_LEVEL_2024 = 9
export const TACTICAL_MASTER_MIN_LEVEL_2024 = 9
export const TWO_EXTRA_ATTACKS_MIN_LEVEL_2024 = 11
export const STUDIED_ATTACKS_MIN_LEVEL_2024 = 13
export const ACTION_SURGE_SECOND_USE_LEVEL_2024 = 17
export const EPIC_BOON_MIN_LEVEL_2024 = 19
export const THREE_EXTRA_ATTACKS_MIN_LEVEL_2024 = 20

/** PHB 2024 Battle Master maneuvers (20). Tasha-only Grappling Strike / Quick Toss / Brace stay 2014-only. */
export const BATTLE_MASTER_MANEUVER_IDS_PHB_2024 = [
  'evasive_footwork',
  'lunging_attack',
  'maneuvering_attack',
  'menacing_attack',
  'feinting_attack',
  'ambush',
  'commanding_presence',
  'disarming_attack',
  'trip_attack',
  'riposte',
  'distracting_strike',
  'parry',
  'bait_and_switch',
  'goading_attack',
  'sweeping_attack',
  'rally',
  'tactical_assessment',
  'pushing_attack',
  'precision_attack',
  'commanders_strike',
] as const

export const BATTLE_MASTER_MANEUVER_IDS_TASHA_ONLY_2014 = [
  'grappling_strike',
  'quick_toss',
  'brace',
] as const

/* ------------------------------------------------------------------ */
/* Feature names by id (leveling / sheet labels)                       */
/* ------------------------------------------------------------------ */

export const FIGHTER_FEATURE_NAMES_BY_ID: Record<string, string> = {
  'fighting-style': FIGHTING_STYLE_NAME_RU,
  fighting_style: FIGHTING_STYLE_NAME_RU,
  'second-wind': SECOND_WIND_NAME_RU,
  second_wind: SECOND_WIND_NAME_RU,
  'weapon-mastery': WEAPON_MASTERY_NAME_RU,
  weapon_mastery: WEAPON_MASTERY_NAME_RU,
  'action-surge': ACTION_SURGE_NAME_RU,
  action_surge: ACTION_SURGE_NAME_RU,
  'tactical-mind': TACTICAL_MIND_NAME_RU,
  tactical_mind: TACTICAL_MIND_NAME_RU,
  'fighter-subclass': FIGHTER_SUBCLASS_NAME_RU,
  fighter_subclass: FIGHTER_SUBCLASS_NAME_RU,
  subclass: FIGHTER_SUBCLASS_NAME_RU,
  'ability-score-improvement': ASI_NAME_RU,
  ability_score_improvement: ASI_NAME_RU,
  asi: ASI_NAME_RU,
  'extra-attack': EXTRA_ATTACK_NAME_RU,
  extra_attack: EXTRA_ATTACK_NAME_RU,
  'tactical-shift': TACTICAL_SHIFT_NAME_RU,
  tactical_shift: TACTICAL_SHIFT_NAME_RU,
  'subclass-feature': SUBCLASS_FEATURE_NAME_RU,
  subclass_feature: SUBCLASS_FEATURE_NAME_RU,
  indomitable: INDOMITABLE_NAME_RU,
  'tactical-master': TACTICAL_MASTER_NAME_RU,
  tactical_master: TACTICAL_MASTER_NAME_RU,
  'two-extra-attacks': TWO_EXTRA_ATTACKS_NAME_RU,
  two_extra_attacks: TWO_EXTRA_ATTACKS_NAME_RU,
  'studied-attacks': STUDIED_ATTACKS_NAME_RU,
  studied_attacks: STUDIED_ATTACKS_NAME_RU,
  'epic-boon': EPIC_BOON_NAME_RU,
  epic_boon: EPIC_BOON_NAME_RU,
  'three-extra-attacks': THREE_EXTRA_ATTACKS_NAME_RU,
  three_extra_attacks: THREE_EXTRA_ATTACKS_NAME_RU,

  /* Champion */
  'improved-critical': IMPROVED_CRITICAL_NAME_RU,
  improved_critical: IMPROVED_CRITICAL_NAME_RU,
  'remarkable-athlete': REMARKABLE_ATHLETE_NAME_RU,
  remarkable_athlete: REMARKABLE_ATHLETE_NAME_RU,
  'additional-fighting-style': ADDITIONAL_FIGHTING_STYLE_NAME_RU,
  additional_fighting_style: ADDITIONAL_FIGHTING_STYLE_NAME_RU,
  'heroic-warrior': HEROIC_WARRIOR_NAME_RU,
  heroic_warrior: HEROIC_WARRIOR_NAME_RU,
  'superior-critical': SUPERIOR_CRITICAL_NAME_RU,
  superior_critical: SUPERIOR_CRITICAL_NAME_RU,
  survivor: DEFY_DEATH_NAME_RU,
  'defy-death': DEFY_DEATH_NAME_RU,
  defy_death: DEFY_DEATH_NAME_RU,

  /* Battle Master */
  'combat-superiority': COMBAT_SUPERIORITY_NAME_RU,
  combat_superiority: COMBAT_SUPERIORITY_NAME_RU,
  'student-of-war': STUDENT_OF_WAR_NAME_RU,
  student_of_war: STUDENT_OF_WAR_NAME_RU,
  'know-your-enemy': KNOW_YOUR_ENEMY_NAME_RU,
  know_your_enemy: KNOW_YOUR_ENEMY_NAME_RU,
  'improved-combat-superiority': IMPROVED_COMBAT_SUPERIORITY_NAME_RU,
  improved_combat_superiority: IMPROVED_COMBAT_SUPERIORITY_NAME_RU,
  relentless: RELENTLESS_NAME_RU,
  'ultimate-combat-superiority': ULTIMATE_COMBAT_SUPERIORITY_NAME_RU,
  ultimate_combat_superiority: ULTIMATE_COMBAT_SUPERIORITY_NAME_RU,

  /* Eldritch Knight */
  spellcasting: SPELLCASTING_NAME_RU,
  'weapon-bond': WEAPON_BOND_NAME_RU,
  weapon_bond: WEAPON_BOND_NAME_RU,
  'war-magic': WAR_MAGIC_NAME_RU,
  war_magic: WAR_MAGIC_NAME_RU,
  'eldritch-strike': ELDRITCH_STRIKE_NAME_RU,
  eldritch_strike: ELDRITCH_STRIKE_NAME_RU,
  'arcane-charge': ARCANE_CHARGE_NAME_RU,
  arcane_charge: ARCANE_CHARGE_NAME_RU,
  'improved-war-magic': IMPROVED_WAR_MAGIC_NAME_RU,
  improved_war_magic: IMPROVED_WAR_MAGIC_NAME_RU,

  /* Psi Warrior */
  'psionic-power': PSIONIC_POWER_NAME_RU,
  psionic_power: PSIONIC_POWER_NAME_RU,
  'telekinetic-adept': TELEKINETIC_ADEPT_NAME_RU,
  telekinetic_adept: TELEKINETIC_ADEPT_NAME_RU,
  'guarded-mind': GUARDED_MIND_NAME_RU,
  guarded_mind: GUARDED_MIND_NAME_RU,
  'bulwark-of-force': BULWARK_OF_FORCE_NAME_RU,
  bulwark_of_force: BULWARK_OF_FORCE_NAME_RU,
  'telekinetic-master': TELEKINETIC_MASTER_NAME_RU,
  telekinetic_master: TELEKINETIC_MASTER_NAME_RU,
}

export function fighterFeatureNameRu2024(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.trim().replace(/_/g, '-')
  return (
    FIGHTER_FEATURE_NAMES_BY_ID[featureId]
    || FIGHTER_FEATURE_NAMES_BY_ID[key]
    || FIGHTER_FEATURE_NAMES_BY_ID[featureId.replace(/-/g, '_')]
    || null
  )
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function lvl(value: number): number {
  return Math.max(0, Math.floor(value || 0))
}

export function isFighterClassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  if (key === FIGHTER_CLASS_SLUG_2024) return true
  return /воин|fighter|боец/.test(key)
}

export function normalizeFighterClassSlug(
  slug: string | null | undefined,
): string | null {
  const n = normalizeClassSlug2024(slug ?? '')
  return n === FIGHTER_CLASS_SLUG_2024
    ? n
    : isFighterClassSlug(slug)
      ? FIGHTER_CLASS_SLUG_2024
      : null
}

export function fighterLevelsFromClasses(classes: ClassLevelEntry[] | undefined | null): number {
  let total = 0
  for (const row of classes ?? []) {
    const catalogId = String((row as { catalog_id?: string }).catalog_id ?? '').toLowerCase()
    if (
      normalizeFighterClassSlug(row.name)
      || catalogId.includes('fighter')
      || /воин|боец/i.test(row.name || '')
    ) {
      total += Math.max(0, Math.floor(row.level))
    }
  }
  return total
}

export function isPhbFighterSubclassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return (Object.values(FIGHTER_SUBCLASS_SLUGS_2024) as string[]).includes(key)
}

export function isOutOfPackFighterSubclassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return (OUT_OF_PACK_FIGHTER_SUBCLASSES_2024 as readonly string[]).includes(key)
}

/** Second Wind uses: 2 / 3 / 4 by fighter level (2024 table). */
export function secondWindUses2024(fighterLevel: number): number {
  const level = lvl(fighterLevel)
  if (level >= 10) return 4
  if (level >= 4) return 3
  if (level >= 1) return 2
  return 0
}

/** Action Surge uses: 1 from 2, 2 from 17 (one per turn). */
export function actionSurgeUses2024(fighterLevel: number): number {
  const level = lvl(fighterLevel)
  if (level >= ACTION_SURGE_SECOND_USE_LEVEL_2024) return 2
  if (level >= ACTION_SURGE_MIN_LEVEL_2024) return 1
  return 0
}

/** Indomitable uses: 1 / 2 / 3 at 9 / 13 / 17. */
export function indomitableUses2024(fighterLevel: number): number {
  const level = lvl(fighterLevel)
  if (level >= 17) return 3
  if (level >= 13) return 2
  if (level >= INDOMITABLE_MIN_LEVEL_2024) return 1
  return 0
}

/** Weapon Mastery slots: 3 / 4 / 5 / 6 at 1 / 4 / 10 / 16. */
export function weaponMasterySlots2024(fighterLevel: number): number {
  const level = lvl(fighterLevel)
  if (level >= 16) return 6
  if (level >= 10) return 5
  if (level >= 4) return 4
  if (level >= 1) return 3
  return 0
}

/** Attacks from Extra Attack progression: 1 / 2 / 3 / 4. */
export function fighterAttackCount2024(fighterLevel: number): number {
  const level = lvl(fighterLevel)
  if (level >= THREE_EXTRA_ATTACKS_MIN_LEVEL_2024) return 4
  if (level >= TWO_EXTRA_ATTACKS_MIN_LEVEL_2024) return 3
  if (level >= EXTRA_ATTACK_MIN_LEVEL_2024) return 2
  return 1
}

/** Indomitable 2024: reroll save with bonus = fighter level. */
export function indomitableBonus2024(fighterLevel: number): number {
  return lvl(fighterLevel) >= INDOMITABLE_MIN_LEVEL_2024 ? lvl(fighterLevel) : 0
}

/** Battle Master superiority dice count: 4 / 5 / 6 at 3 / 7 / 15. */
export function superiorityDiceCount2024(fighterLevel: number): number {
  const level = lvl(fighterLevel)
  if (level >= 15) return 6
  if (level >= 7) return 5
  if (level >= 3) return 4
  return 0
}

/** Superiority die size: d8 / d10 / d12 at 3 / 10 / 18. */
export function superiorityDieSize2024(fighterLevel: number): number {
  const level = lvl(fighterLevel)
  if (level >= 18) return 12
  if (level >= 10) return 10
  if (level >= 3) return 8
  return 0
}

/** Maneuvers known: 3 + 2 at 7/10/15. */
export function maneuversKnown2024(fighterLevel: number): number {
  const level = lvl(fighterLevel)
  if (level >= 15) return 9
  if (level >= 10) return 7
  if (level >= 7) return 5
  if (level >= 3) return 3
  return 0
}

/** Psi Warrior energy die: size + count by fighter level. */
export function psionicEnergyDice2024(fighterLevel: number): { die: number; count: number } {
  const level = lvl(fighterLevel)
  if (level >= 17) return { die: 12, count: 12 }
  if (level >= 13) return { die: 10, count: 10 }
  if (level >= 11) return { die: 10, count: 8 }
  if (level >= 9) return { die: 8, count: 8 }
  if (level >= 5) return { die: 8, count: 6 }
  if (level >= 3) return { die: 6, count: 4 }
  return { die: 0, count: 0 }
}

/** Eldritch Knight prepared spells + slots by fighter level (2024 table). */
export function eldritchKnightSpellTable2024(fighterLevel: number): {
  prepared: number
  slots: [number, number, number, number]
  cantrips: number
} {
  const level = lvl(fighterLevel)
  const cantrips = level >= 10 ? 3 : level >= 3 ? 2 : 0
  if (level >= 20) return { prepared: 13, slots: [4, 3, 3, 1], cantrips }
  if (level >= 19) return { prepared: 12, slots: [4, 3, 3, 1], cantrips }
  if (level >= 16) return { prepared: 11, slots: [4, 3, 3, 0], cantrips }
  if (level >= 14) return { prepared: 10, slots: [4, 3, 2, 0], cantrips }
  if (level >= 13) return { prepared: 9, slots: [4, 3, 2, 0], cantrips }
  if (level >= 11) return { prepared: 8, slots: [4, 3, 0, 0], cantrips }
  if (level >= 10) return { prepared: 7, slots: [4, 3, 0, 0], cantrips }
  if (level >= 8) return { prepared: 6, slots: [4, 2, 0, 0], cantrips }
  if (level >= 7) return { prepared: 5, slots: [4, 2, 0, 0], cantrips }
  if (level >= 5) return { prepared: 4, slots: [3, 0, 0, 0], cantrips }
  if (level >= 4) return { prepared: 4, slots: [3, 0, 0, 0], cantrips }
  if (level >= 3) return { prepared: 3, slots: [2, 0, 0, 0], cantrips }
  return { prepared: 0, slots: [0, 0, 0, 0], cantrips: 0 }
}

/** Multiclass caster share for Eldritch Knight 2024: one-third of fighter levels. */
export function eldritchKnightCasterLevels2024(fighterLevel: number, subclassSlug?: string | null): number {
  if (!subclassSlug) return 0
  const key = subclassSlug.trim().toLowerCase()
  if (key !== FIGHTER_SUBCLASS_SLUGS_2024.eldritchKnight && !key.includes('eldritch')) {
    return 0
  }
  return Math.floor(lvl(fighterLevel) / 3)
}

/** Champion critical threshold: 20 → 19–20 at 3 → 18–20 at 15. */
export function championCritThreshold2024(fighterLevel: number, hasChampion: boolean): number {
  if (!hasChampion) return 20
  const level = lvl(fighterLevel)
  if (level >= 15) return 18
  if (level >= 3) return 19
  return 20
}

/** Heroic Fortitude heal: 5 + Con mod (min when bloodied). */
export function heroicFortitudeHeal2024(conMod: number): number {
  return 5 + Math.floor(conMod || 0)
}

/* ------------------------------------------------------------------ */
/* Sheet use / spend (2024 only)                                       */
/* ------------------------------------------------------------------ */

const FIGHTER_USE_FEATURE_IDS = new Set([
  'second-wind',
  'tactical-mind',
  'action-surge',
  'indomitable',
  'know-your-enemy',
  'protective-field',
  'psionic-strike',
  'telekinetic-movement',
  'psi-powered-leap',
  'bulwark-of-force',
  'telekinetic-master',
  'relentless',
  /* P24-M02B book */
  'arcane-shot',
  'magical-ammunition',
  'curving-shot',
  'ever-ready-shot',
  'indomitable-teleport',
  'masterful-shots',
  'group-recovery',
  'rallying-surge',
  'shared-resilience',
  'team-tactics',
  'inspiring-commander',
])

export const FIGHTER_2024_CARD_BUTTONS: Record<string, string> = {
  second_wind: 'Потратить…',
  'second-wind': 'Потратить…',
  tactical_mind: 'Применить…',
  'tactical-mind': 'Применить…',
  action_surge: 'Всплеск…',
  'action-surge': 'Всплеск…',
  indomitable: 'Перебросить…',
  know_your_enemy: 'Изучить…',
  'know-your-enemy': 'Изучить…',
  bulwark_of_force: 'Оплот…',
  'bulwark-of-force': 'Оплот…',
  relentless: '1к8 вместо кости…',
  arcane_shot: 'Выстрел…',
  'arcane-shot': 'Выстрел…',
  magical_ammunition: 'Зарядить…',
  'magical-ammunition': 'Зарядить…',
  curving_shot: 'Отскок…',
  'curving-shot': 'Отскок…',
  ever_ready_shot: 'Восстановить…',
  'ever-ready-shot': 'Восстановить…',
  indomitable_teleport: 'Телепорт…',
  'indomitable-teleport': 'Телепорт…',
  masterful_shots: 'Реакция…',
  'masterful-shots': 'Реакция…',
  group_recovery: 'Групповое…',
  'group-recovery': 'Групповое…',
  rallying_surge: 'Воодушевить…',
  'rallying-surge': 'Воодушевить…',
  shared_resilience: 'Реакция…',
  'shared-resilience': 'Реакция…',
  team_tactics: 'Тактика…',
  'team-tactics': 'Тактика…',
  inspiring_commander: 'Командир…',
  'inspiring-commander': 'Командир…',
}

export function fighter2024UseFeatureId(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.trim().replace(/_/g, '-')
  if (key === 'psionic-power') return 'psionic-strike'
  if (key === 'telekinetic-adept') return 'psi-powered-leap'
  return FIGHTER_USE_FEATURE_IDS.has(key) ? key : null
}

export function findFighterPool2024(
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
      return parsed?.poolId === poolId && parsed.classSlug === FIGHTER_CLASS_SLUG_2024
    })
    if (byClass) return byClass
  }
  return resources.find((row) => parseFeatureResourceId(row.id)?.poolId === poolId) ?? null
}

export type Fighter2024UseInput = {
  featureId: string
  resourceId: string | null
  resources: SheetResource[]
  classEntryId: string
  fighterLevel: number
  abilities?: Partial<Record<'str' | 'dex' | 'con' | 'int', number>>
  refund?: boolean
  mode?: string | null
  /** Tactical Mind: check still failed after adding 1d10 → do not spend Second Wind. */
  checkStillFailed?: boolean
}

export type Fighter2024UseResult = {
  ok: boolean
  resources: SheetResource[]
  message: string
  patches?: {
    diceExpression?: string | null
    healHp?: number
    activeLabels?: string[]
    indomitableBonus?: number
  }
}

function refuse(input: Fighter2024UseInput, message: string): Fighter2024UseResult {
  return { ok: false, resources: input.resources, message }
}

function ok(
  input: Fighter2024UseInput,
  message: string,
  extra?: Partial<Fighter2024UseResult>,
): Fighter2024UseResult {
  return { ok: true, resources: input.resources, message, ...extra }
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

export function applyFighter2024FeatureUse(input: Fighter2024UseInput): Fighter2024UseResult {
  const fid = fighter2024UseFeatureId(input.featureId) ?? input.featureId.replace(/_/g, '-')
  const level = lvl(input.fighterLevel)
  const refund = Boolean(input.refund) || input.mode === 'refund'

  if (fid === 'second-wind') {
    const pool = findFighterPool2024(input.resources, SECOND_WIND_POOL_ID, input.classEntryId)
    if (!pool) return refuse(input, `${SECOND_WIND_NAME_RU}: пул не найден`)
    if (refund) {
      if (pool.used <= 0) return refuse(input, `${SECOND_WIND_NAME_RU}: нечего возвращать`)
      return ok(input, `${SECOND_WIND_NAME_RU}: использование возвращено`, {
        resources: bumpPool(input.resources, pool, -1),
      })
    }
    if (pool.used >= pool.max) return refuse(input, `${SECOND_WIND_NAME_RU}: нет использований`)
    return ok(input, `${SECOND_WIND_NAME_RU}: 1к10+${level} хитов`, {
      resources: bumpPool(input.resources, pool, 1),
      patches: { diceExpression: `1d10+${level}`, healHp: level },
    })
  }

  if (fid === 'tactical-mind') {
    if (level < TACTICAL_MIND_MIN_LEVEL_2024) {
      return refuse(input, `${TACTICAL_MIND_NAME_RU} с ${TACTICAL_MIND_MIN_LEVEL_2024} уровня`)
    }
    const pool = findFighterPool2024(input.resources, SECOND_WIND_POOL_ID, input.classEntryId)
    if (!pool) return refuse(input, `${TACTICAL_MIND_NAME_RU}: нет Второго дыхания`)
    if (refund) {
      if (pool.used <= 0) return refuse(input, `${TACTICAL_MIND_NAME_RU}: нечего возвращать`)
      return ok(input, `${TACTICAL_MIND_NAME_RU}: использование возвращено`, {
        resources: bumpPool(input.resources, pool, -1),
      })
    }
    if (input.checkStillFailed) {
      return ok(
        input,
        `${TACTICAL_MIND_NAME_RU}: проверка всё ещё провалена — использование Второго дыхания не тратится`,
        { patches: { diceExpression: '1d10' } },
      )
    }
    if (pool.used >= pool.max) return refuse(input, `${TACTICAL_MIND_NAME_RU}: нет Второго дыхания`)
    return ok(input, `${TACTICAL_MIND_NAME_RU}: +1к10 к проверке (тратит Второе дыхание)`, {
      resources: bumpPool(input.resources, pool, 1),
      patches: { diceExpression: '1d10' },
    })
  }

  if (fid === 'action-surge') {
    if (level < ACTION_SURGE_MIN_LEVEL_2024) {
      return refuse(input, `${ACTION_SURGE_NAME_RU} со ${ACTION_SURGE_MIN_LEVEL_2024} уровня`)
    }
    const pool = findFighterPool2024(input.resources, ACTION_SURGE_POOL_ID, input.classEntryId)
    if (!pool) return refuse(input, `${ACTION_SURGE_NAME_RU}: пул не найден`)
    if (refund) {
      if (pool.used <= 0) return refuse(input, `${ACTION_SURGE_NAME_RU}: нечего возвращать`)
      return ok(input, `${ACTION_SURGE_NAME_RU}: использование возвращено`, {
        resources: bumpPool(input.resources, pool, -1),
      })
    }
    if (pool.used >= pool.max) return refuse(input, `${ACTION_SURGE_NAME_RU}: нет использований`)
    return ok(
      input,
      `${ACTION_SURGE_NAME_RU}: +1 действие (кроме «Магии»)${level >= 17 ? '; не чаще 1 раза за ход' : ''}`,
      { resources: bumpPool(input.resources, pool, 1) },
    )
  }

  if (fid === 'indomitable') {
    if (level < INDOMITABLE_MIN_LEVEL_2024) {
      return refuse(input, `${INDOMITABLE_NAME_RU} с ${INDOMITABLE_MIN_LEVEL_2024} уровня`)
    }
    const pool = findFighterPool2024(input.resources, INDOMITABLE_POOL_ID, input.classEntryId)
    if (!pool) return refuse(input, `${INDOMITABLE_NAME_RU}: пул не найден`)
    if (refund) {
      if (pool.used <= 0) return refuse(input, `${INDOMITABLE_NAME_RU}: нечего возвращать`)
      return ok(input, `${INDOMITABLE_NAME_RU}: использование возвращено`, {
        resources: bumpPool(input.resources, pool, -1),
      })
    }
    if (pool.used >= pool.max) return refuse(input, `${INDOMITABLE_NAME_RU}: нет использований`)
    const bonus = indomitableBonus2024(level)
    return ok(input, `${INDOMITABLE_NAME_RU}: переброс спасброска с бонусом +${bonus}`, {
      resources: bumpPool(input.resources, pool, 1),
      patches: { indomitableBonus: bonus },
    })
  }

  if (fid === 'know-your-enemy') {
    const pool = findFighterPool2024(input.resources, KNOW_YOUR_ENEMY_POOL_ID, input.classEntryId)
    if (!pool) return refuse(input, `${KNOW_YOUR_ENEMY_NAME_RU}: пул не найден`)
    if (refund) {
      if (pool.used <= 0) return refuse(input, `${KNOW_YOUR_ENEMY_NAME_RU}: нечего возвращать`)
      return ok(input, `${KNOW_YOUR_ENEMY_NAME_RU}: использование возвращено`, {
        resources: bumpPool(input.resources, pool, -1),
      })
    }
    if (input.mode === 'refund_with_die') {
      const dice = findFighterPool2024(input.resources, SUPERIORITY_DICE_POOL_ID, input.classEntryId)
      if (!dice || dice.used >= dice.max) {
        return refuse(input, `${KNOW_YOUR_ENEMY_NAME_RU}: нужна кость превосходства`)
      }
      let next = bumpPool(input.resources, dice, 1)
      if (pool.used > 0) {
        const refreshed = findFighterPool2024(next, KNOW_YOUR_ENEMY_POOL_ID, input.classEntryId)
        if (refreshed) next = bumpPool(next, refreshed, -1)
      }
      return ok(input, `${KNOW_YOUR_ENEMY_NAME_RU}: использование восстановлено (кость превосходства)`, {
        resources: next,
      })
    }
    if (pool.used >= pool.max) return refuse(input, `${KNOW_YOUR_ENEMY_NAME_RU}: нет использований`)
    return ok(
      input,
      `${KNOW_YOUR_ENEMY_NAME_RU}: бонусным — иммунитеты, сопротивления и уязвимости цели в 30 фт.`,
      { resources: bumpPool(input.resources, pool, 1) },
    )
  }

  if (fid === 'bulwark-of-force') {
    const pool = findFighterPool2024(input.resources, BULWARK_OF_FORCE_POOL_ID, input.classEntryId)
    if (!pool) return refuse(input, `${BULWARK_OF_FORCE_NAME_RU}: пул не найден`)
    if (refund) {
      if (pool.used <= 0) return refuse(input, `${BULWARK_OF_FORCE_NAME_RU}: нечего возвращать`)
      return ok(input, `${BULWARK_OF_FORCE_NAME_RU}: использование возвращено`, {
        resources: bumpPool(input.resources, pool, -1),
      })
    }
    if (pool.used >= pool.max) return refuse(input, `${BULWARK_OF_FORCE_NAME_RU}: нет использований`)
    return ok(
      input,
      `${BULWARK_OF_FORCE_NAME_RU}: укрытие наполовину (не временные хиты)`,
      {
        resources: bumpPool(input.resources, pool, 1),
        patches: { activeLabels: ['Укрытие наполовину (Оплот силы)'] },
      },
    )
  }

  if (fid === 'relentless') {
    return ok(
      input,
      `${RELENTLESS_NAME_RU}: вместо кости превосходства бросьте 1к8 (1 раз за ход)`,
      { patches: { diceExpression: '1d8' } },
    )
  }

  /* ---- P24-M02B book paths (Arcane Archer / Banneret «Знаменосец») ---- */

  if (fid === 'arcane-shot') {
    const pool = findFighterPool2024(input.resources, 'arcane_shot', input.classEntryId)
    if (!pool) return refuse(input, 'Чародейный выстрел: пул не найден')
    if (refund) {
      if (pool.used <= 0) return refuse(input, 'Чародейный выстрел: нечего возвращать')
      return ok(input, 'Чародейный выстрел: использование возвращено', {
        resources: bumpPool(input.resources, pool, -1),
      })
    }
    if (pool.used >= pool.max) return refuse(input, 'Чародейный выстрел: нет использований')
    const die =
      level >= 18 ? 'd12' : level >= 15 ? 'd10' : level >= 10 ? 'd8' : 'd6'
    return ok(input, `Чародейный выстрел: применено (кость к${die.slice(1)})`, {
      resources: bumpPool(input.resources, pool, 1),
      patches: { diceExpression: die, activeLabels: ['Чародейный выстрел'] },
    })
  }

  if (fid === 'magical-ammunition') {
    const pool = findFighterPool2024(input.resources, 'magical_ammunition', input.classEntryId)
    if (!pool) return refuse(input, 'Магические боеприпасы: пул не найден')
    if (input.mode === 'refund_with_die' || input.mode === 'refund_second_wind') {
      const sw = findFighterPool2024(input.resources, SECOND_WIND_POOL_ID, input.classEntryId)
      if (!sw || sw.used >= sw.max) {
        return refuse(input, 'Магические боеприпасы: нужно Второе дыхание для возврата')
      }
      let next = bumpPool(input.resources, sw, 1)
      if (pool.used > 0) {
        const refreshed = findFighterPool2024(next, 'magical_ammunition', input.classEntryId)
        if (refreshed) next = bumpPool(next, refreshed, -1)
      }
      return ok(input, 'Магические боеприпасы: использование восстановлено (Второе дыхание)', {
        resources: next,
      })
    }
    if (refund) {
      if (pool.used <= 0) return refuse(input, 'Магические боеприпасы: нечего возвращать')
      return ok(input, 'Магические боеприпасы: использование возвращено', {
        resources: bumpPool(input.resources, pool, -1),
      })
    }
    if (pool.used >= pool.max) return refuse(input, 'Магические боеприпасы: нет использований')
    const ammo = String(input.mode || 'obscuring')
    const label =
      ammo === 'opening'
        ? 'Открывающий боеприпас'
        : ammo === 'vine'
          ? 'Лозовой боеприпас'
          : 'Затемняющий боеприпас'
    return ok(input, `Магические боеприпасы: ${label} (1 / короткий или долгий)`, {
      resources: bumpPool(input.resources, pool, 1),
      patches: { activeLabels: [label] },
    })
  }

  if (fid === 'curving-shot') {
    return ok(input, 'Странствующая стрела: бонусным — отскок к новой цели в 60 фт.', {
      patches: { activeLabels: ['Странствующая стрела'] },
    })
  }

  if (fid === 'ever-ready-shot') {
    const pool = findFighterPool2024(input.resources, 'arcane_shot', input.classEntryId)
    if (!pool) return refuse(input, 'Заготовленный выстрел: нет пула Чародейного выстрела')
    if (pool.used <= 0) return refuse(input, 'Заготовленный выстрел: нечего восстанавливать')
    return ok(input, 'Заготовленный выстрел: +1 использование Чародейного выстрела (инициатива)', {
      resources: bumpPool(input.resources, pool, -1),
    })
  }

  if (fid === 'indomitable-teleport') {
    return ok(
      input,
      'Неукротимая телепортация: после успеха Непоколебимости — телепорт до 60 фт.',
      { patches: { activeLabels: ['Неукротимая телепортация'] } },
    )
  }

  if (fid === 'masterful-shots') {
    return ok(
      input,
      'Мастерская стрельба: реакцией — перемещение до ½ Скорости + дальнобойная атака',
      { patches: { activeLabels: ['Мастерская стрельба'] } },
    )
  }

  if (fid === 'group-recovery') {
    const pool = findFighterPool2024(input.resources, 'group_recovery', input.classEntryId)
    const sw = findFighterPool2024(input.resources, SECOND_WIND_POOL_ID, input.classEntryId)
    if (!pool) return refuse(input, 'Групповое оздоровление: пул не найден')
    if (!sw) return refuse(input, 'Групповое оздоровление: нет Второго дыхания')
    if (refund) {
      if (pool.used <= 0) return refuse(input, 'Групповое оздоровление: нечего возвращать')
      return ok(input, 'Групповое оздоровление: использование возвращено', {
        resources: bumpPool(input.resources, pool, -1),
      })
    }
    if (pool.used >= pool.max) {
      return refuse(input, 'Групповое оздоровление: уже использовано (1 / короткий или долгий)')
    }
    if (sw.used >= sw.max) return refuse(input, 'Групповое оздоровление: нет Второго дыхания')
    let next = bumpPool(input.resources, sw, 1)
    const refreshed = findFighterPool2024(next, 'group_recovery', input.classEntryId)
    if (refreshed) next = bumpPool(next, refreshed, 1)
    const radius = level >= 18 ? 60 : 30
    return ok(
      input,
      `Групповое оздоровление: союзники в ${radius}-фт. эманации — 1к4+${level} хитов`,
      {
        resources: next,
        patches: {
          diceExpression: `1d4+${level}`,
          activeLabels: level >= 7 ? ['Групповая тактика: преимущество к20'] : ['Групповое оздоровление'],
        },
      },
    )
  }

  if (fid === 'rallying-surge') {
    const surge = findFighterPool2024(input.resources, ACTION_SURGE_POOL_ID, input.classEntryId)
    if (!surge) return refuse(input, 'Воодушевляющий всплеск: нет Всплеска действий')
    if (refund) {
      if (surge.used <= 0) return refuse(input, 'Воодушевляющий всплеск: нечего возвращать')
      return ok(input, 'Воодушевляющий всплеск: использование возвращено', {
        resources: bumpPool(input.resources, surge, -1),
      })
    }
    if (surge.used >= surge.max) return refuse(input, 'Воодушевляющий всплеск: нет Всплеска действий')
    const radius = level >= 18 ? 60 : 30
    return ok(
      input,
      `Воодушевляющий всплеск: союзники в ${radius}-фт. эманации — реакцией Атака или Перемещение`,
      {
        resources: bumpPool(input.resources, surge, 1),
        patches: { activeLabels: ['Воодушевляющий всплеск'] },
      },
    )
  }

  if (fid === 'shared-resilience') {
    const pool = findFighterPool2024(input.resources, INDOMITABLE_POOL_ID, input.classEntryId)
    if (!pool) return refuse(input, 'Устойчивость команды: нет Непоколебимости')
    if (refund) {
      if (pool.used <= 0) return refuse(input, 'Устойчивость команды: нечего возвращать')
      return ok(input, 'Устойчивость команды: использование возвращено', {
        resources: bumpPool(input.resources, pool, -1),
      })
    }
    if (pool.used >= pool.max) return refuse(input, 'Устойчивость команды: нет Непоколебимости')
    return ok(
      input,
      `Устойчивость команды: союзник перебрасывает спас с бонусом +${level}`,
      {
        resources: bumpPool(input.resources, pool, 1),
        patches: { indomitableBonus: level, activeLabels: ['Устойчивость команды'] },
      },
    )
  }

  if (fid === 'team-tactics') {
    return ok(input, 'Групповая тактика: преимущество ко всем Тестам к20 до вашего следующего хода', {
      patches: { activeLabels: ['Групповая тактика'] },
    })
  }

  if (fid === 'inspiring-commander') {
    return ok(
      input,
      'Вдохновляющий командир: эманация 60 фт.; иммунитет к Испуганный и Очарованный',
      {
        patches: {
          activeLabels: ['Иммунитет: Испуганный', 'Иммунитет: Очарованный', 'Эманация 60 фт.'],
        },
      },
    )
  }

  return refuse(input, `Умение «${fid}» пока без отдельной кнопки 2024`)
}
