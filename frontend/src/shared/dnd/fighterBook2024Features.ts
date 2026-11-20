/**
 * P24-M02B-fighter: AU Arcane Archer + FRHoF Banneret (UI «Знаменосец»).
 * Callers must branch on rules_edition === '2024'; does not feed 2014 fighter paths.
 */

import type { FeatureChoiceDef } from './classFeatures'
import { alwaysPreparedForSubclass2024, isPhb2024CreateSubclass } from './edition2024Subclasses'
import {
  ARCANE_SHOT_IDS_2024,
  ARCANE_SHOTS_2024,
  arcaneShot2024ById,
  arcaneShotDie2024,
  arcaneShotDieLabelRu2024,
  arcaneShotSaveDc2024,
  arcaneShotsKnown2024,
} from './arcaneShots2024'

export const M02B_FIGHTER_BOOK_SLUGS = [
  'fighter__arcane-archer',
  'fighter__banneret',
] as const

export type M02bFighterBookSlug = (typeof M02B_FIGHTER_BOOK_SLUGS)[number]

export const ARCANE_ARCHER_SLUG = 'fighter__arcane-archer'
export const BANNERET_SLUG = 'fighter__banneret'

export function isM02bFighterBookSubclass(slug: string | null | undefined): boolean {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
  return (M02B_FIGHTER_BOOK_SLUGS as readonly string[]).includes(key)
}

export function isArcaneArcher2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === ARCANE_ARCHER_SLUG
}

export function isBanneret2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === BANNERET_SLUG
}

/** Assert allowlist opens only these two book paths (selfcheck). */
export function fighterBookAllowlistOpen2024(slug: string): boolean {
  return isPhb2024CreateSubclass(slug) && isM02bFighterBookSubclass(slug)
}

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL for this pack; Igor 18.11.2026 20:49)             */
/* ------------------------------------------------------------------ */

export const ARCANE_ARCHER_NAME_RU = 'Мистический лучник'
/** UI / catalog name_ru — not «Баннерет». */
export const BANNERET_NAME_RU = 'Знаменосец'

export const ARCANE_ARCHER_LORE_NAME_RU = 'Знания чародейных стрелков'
export const ARCANE_SHOT_NAME_RU = 'Чародейный выстрел'
export const ARCANE_SHOT_DIE_NAME_RU = 'Кость чародейного выстрела'
export const CURVING_SHOT_NAME_RU = 'Странствующая стрела'
export const MAGICAL_AMMUNITION_NAME_RU = 'Магические боеприпасы'
export const EVER_READY_SHOT_NAME_RU = 'Заготовленный выстрел'
export const INDOMITABLE_TELEPORT_NAME_RU = 'Неукротимая телепортация'
export const MASTERFUL_SHOTS_NAME_RU = 'Мастерская стрельба'

export const KNIGHTLY_ENVOY_NAME_RU = 'Посланник рыцарства'
export const GROUP_RECOVERY_NAME_RU = 'Групповое оздоровление'
export const TEAM_TACTICS_NAME_RU = 'Групповая тактика'
export const RALLYING_SURGE_NAME_RU = 'Воодушевляющий всплеск'
export const SHARED_RESILIENCE_NAME_RU = 'Устойчивость команды'
export const INSPIRING_COMMANDER_NAME_RU = 'Вдохновляющий командир'

export const MAGICAL_AMMO_OBSCURING_NAME_RU = 'Затемняющий боеприпас'
export const MAGICAL_AMMO_OPENING_NAME_RU = 'Открывающий боеприпас'
export const MAGICAL_AMMO_VINE_NAME_RU = 'Лозовой боеприпас'

/** Forbidden labels for this pack (catalog / UI subclass name). */
export const FORBIDDEN_FIGHTER_BOOK_LABELS_2024 = [
  'Баннерет',
  'Чародейный стрелок',
] as const

/* ------------------------------------------------------------------ */
/* Feature / pool ids                                                  */
/* ------------------------------------------------------------------ */

export const ARCANE_ARCHER_LORE_FEATURE_ID = 'arcane-archer-lore'
export const ARCANE_SHOT_FEATURE_ID = 'arcane-shot'
export const CURVING_SHOT_FEATURE_ID = 'curving-shot'
export const MAGICAL_AMMUNITION_FEATURE_ID = 'magical-ammunition'
export const EVER_READY_SHOT_FEATURE_ID = 'ever-ready-shot'
export const INDOMITABLE_TELEPORT_FEATURE_ID = 'indomitable-teleport'
export const MASTERFUL_SHOTS_FEATURE_ID = 'masterful-shots'

export const KNIGHTLY_ENVOY_FEATURE_ID = 'knightly-envoy'
export const GROUP_RECOVERY_FEATURE_ID = 'group-recovery'
export const TEAM_TACTICS_FEATURE_ID = 'team-tactics'
export const RALLYING_SURGE_FEATURE_ID = 'rallying-surge'
export const SHARED_RESILIENCE_FEATURE_ID = 'shared-resilience'
export const INSPIRING_COMMANDER_FEATURE_ID = 'inspiring-commander'

export const ARCANE_SHOT_POOL_ID = 'arcane_shot'
export const MAGICAL_AMMUNITION_POOL_ID = 'magical_ammunition'
export const GROUP_RECOVERY_POOL_ID = 'group_recovery'

export const ARCANE_ARCHER_LORE_CANTRIP_PICK_ID = 'arcane_archer_lore_cantrip'
export const ARCANE_SHOT_OPTIONS_PICK_ID = 'arcane_shot_options'
export const KNIGHTLY_ENVOY_LANGUAGE_PICK_ID = 'knightly_envoy_language'
export const KNIGHTLY_ENVOY_SKILL_PICK_ID = 'knightly_envoy_skill'

/* ------------------------------------------------------------------ */
/* Feature ids by level (fighter book grid 3/7/10/15/18)               */
/* ------------------------------------------------------------------ */

export const ARCANE_ARCHER_FEATURES_BY_LEVEL: Record<number, readonly string[]> = {
  3: [ARCANE_ARCHER_LORE_FEATURE_ID, ARCANE_SHOT_FEATURE_ID],
  7: [CURVING_SHOT_FEATURE_ID, MAGICAL_AMMUNITION_FEATURE_ID],
  10: [EVER_READY_SHOT_FEATURE_ID],
  15: [INDOMITABLE_TELEPORT_FEATURE_ID],
  18: [MASTERFUL_SHOTS_FEATURE_ID],
}

export const BANNERET_FEATURES_BY_LEVEL: Record<number, readonly string[]> = {
  3: [KNIGHTLY_ENVOY_FEATURE_ID, GROUP_RECOVERY_FEATURE_ID],
  7: [TEAM_TACTICS_FEATURE_ID],
  10: [RALLYING_SURGE_FEATURE_ID],
  15: [SHARED_RESILIENCE_FEATURE_ID],
  18: [INSPIRING_COMMANDER_FEATURE_ID],
}

export const FIGHTER_BOOK_FEATURE_NAMES_BY_ID: Record<string, string> = {
  [ARCANE_ARCHER_LORE_FEATURE_ID]: ARCANE_ARCHER_LORE_NAME_RU,
  [ARCANE_SHOT_FEATURE_ID]: ARCANE_SHOT_NAME_RU,
  [CURVING_SHOT_FEATURE_ID]: CURVING_SHOT_NAME_RU,
  [MAGICAL_AMMUNITION_FEATURE_ID]: MAGICAL_AMMUNITION_NAME_RU,
  [EVER_READY_SHOT_FEATURE_ID]: EVER_READY_SHOT_NAME_RU,
  [INDOMITABLE_TELEPORT_FEATURE_ID]: INDOMITABLE_TELEPORT_NAME_RU,
  [MASTERFUL_SHOTS_FEATURE_ID]: MASTERFUL_SHOTS_NAME_RU,
  [KNIGHTLY_ENVOY_FEATURE_ID]: KNIGHTLY_ENVOY_NAME_RU,
  [GROUP_RECOVERY_FEATURE_ID]: GROUP_RECOVERY_NAME_RU,
  [TEAM_TACTICS_FEATURE_ID]: TEAM_TACTICS_NAME_RU,
  [RALLYING_SURGE_FEATURE_ID]: RALLYING_SURGE_NAME_RU,
  [SHARED_RESILIENCE_FEATURE_ID]: SHARED_RESILIENCE_NAME_RU,
  [INSPIRING_COMMANDER_FEATURE_ID]: INSPIRING_COMMANDER_NAME_RU,
}

export function arcaneArcherFeatureIdsAtLevel2024(level: number): string[] {
  const n = Math.max(0, Math.floor(level) || 0)
  const out: string[] = []
  for (const gate of [3, 7, 10, 15, 18] as const) {
    if (n >= gate) out.push(...(ARCANE_ARCHER_FEATURES_BY_LEVEL[gate] ?? []))
  }
  return out
}

export function banneretFeatureIdsAtLevel2024(level: number): string[] {
  const n = Math.max(0, Math.floor(level) || 0)
  const out: string[] = []
  for (const gate of [3, 7, 10, 15, 18] as const) {
    if (n >= gate) out.push(...(BANNERET_FEATURES_BY_LEVEL[gate] ?? []))
  }
  return out
}

export function fighterBookFeatureIdsAtLevel2024(
  slug: string | null | undefined,
  level: number,
): string[] {
  if (isArcaneArcher2024(slug)) return arcaneArcherFeatureIdsAtLevel2024(level)
  if (isBanneret2024(slug)) return banneretFeatureIdsAtLevel2024(level)
  return []
}

export function fighterBookFeatureNameRu2024(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.trim().replace(/_/g, '-')
  return FIGHTER_BOOK_FEATURE_NAMES_BY_ID[featureId] || FIGHTER_BOOK_FEATURE_NAMES_BY_ID[key] || null
}

/* ------------------------------------------------------------------ */
/* Create-time choices                                                 */
/* ------------------------------------------------------------------ */

export const ARCANE_ARCHER_LORE_CANTRIPS_2024 = ['druidcraft', 'prestidigitation'] as const

export const arcaneArcherLoreCantripChoice2024: FeatureChoiceDef = {
  id: ARCANE_ARCHER_LORE_CANTRIP_PICK_ID,
  label_ru: `${ARCANE_ARCHER_LORE_NAME_RU}: Заговор`,
  max_picks: 1,
  options: [...ARCANE_ARCHER_LORE_CANTRIPS_2024],
  option_labels_ru: {
    druidcraft: 'Искусство друидов',
    prestidigitation: 'Фокусы',
  },
}

export const arcaneShotOptionsChoice2024: FeatureChoiceDef = {
  id: ARCANE_SHOT_OPTIONS_PICK_ID,
  label_ru: ARCANE_SHOT_NAME_RU,
  max_picks: 2,
  max_picks_by_level: {
    '3': 2,
    '7': 3,
    '10': 4,
    '15': 5,
    '18': 6,
  },
  options: [...ARCANE_SHOT_IDS_2024],
  option_labels_ru: Object.fromEntries(ARCANE_SHOTS_2024.map((row) => [row.id, row.nameRu])),
}

/** Common / Rare / Faerûn sample language ids used by the create picker. */
export const KNIGHTLY_ENVOY_LANGUAGE_OPTIONS_2024 = [
  'elvish',
  'dwarvish',
  'giant',
  'gnomish',
  'goblin',
  'halfling',
  'orc',
  'draconic',
  'infernal',
  'celestial',
  'abyssal',
  'primordial',
  'sylvan',
  'undercommon',
] as const

export const knightlyEnvoyLanguageChoice2024: FeatureChoiceDef = {
  id: KNIGHTLY_ENVOY_LANGUAGE_PICK_ID,
  label_ru: `${KNIGHTLY_ENVOY_NAME_RU}: Полиглот`,
  max_picks: 1,
  options: [...KNIGHTLY_ENVOY_LANGUAGE_OPTIONS_2024],
  option_labels_ru: {
    elvish: 'Эльфийский',
    dwarvish: 'Дварфийский',
    giant: 'Великаний',
    gnomish: 'Гномий',
    goblin: 'Гоблинский',
    halfling: 'Полуросличий',
    orc: 'Орочий',
    draconic: 'Драконий',
    infernal: 'Инфернальный',
    celestial: 'Небесный',
    abyssal: 'Бездны',
    primordial: 'Первичный',
    sylvan: 'Сильван',
    undercommon: 'Подземный',
  },
}

export const KNIGHTLY_ENVOY_SKILLS_2024 = [
  'performance',
  'intimidation',
  'insight',
  'persuasion',
] as const

export const knightlyEnvoySkillChoice2024: FeatureChoiceDef = {
  id: KNIGHTLY_ENVOY_SKILL_PICK_ID,
  label_ru: `${KNIGHTLY_ENVOY_NAME_RU}: Поставленная речь`,
  max_picks: 1,
  options: [...KNIGHTLY_ENVOY_SKILLS_2024],
  option_labels_ru: {
    performance: 'Выступление',
    intimidation: 'Запугивание',
    insight: 'Проницательность',
    persuasion: 'Убеждение',
  },
}

export const MAGICAL_AMMUNITION_TYPES_2024 = [
  'obscuring',
  'opening',
  'vine',
] as const

export const MAGICAL_AMMUNITION_TYPE_LABELS_RU: Record<string, string> = {
  obscuring: MAGICAL_AMMO_OBSCURING_NAME_RU,
  opening: MAGICAL_AMMO_OPENING_NAME_RU,
  vine: MAGICAL_AMMO_VINE_NAME_RU,
}

/* ------------------------------------------------------------------ */
/* Pool helpers                                                        */
/* ------------------------------------------------------------------ */

export function arcaneShotUses2024(intScore: number): number {
  const mod = Math.floor((Math.max(1, Math.floor(intScore) || 10) - 10) / 2)
  return Math.max(1, mod)
}

/** Group Recovery ally cap = Cha mod (min 1). */
export function groupRecoveryAllyCap2024(chaScore: number): number {
  const mod = Math.floor((Math.max(1, Math.floor(chaScore) || 10) - 10) / 2)
  return Math.max(1, mod)
}

/** Emanation radius: 30 ft, or 60 ft with Inspiring Commander (L18). */
export function banneretEmanationFeet2024(fighterLevel: number): 30 | 60 {
  return Math.max(0, Math.floor(fighterLevel) || 0) >= 18 ? 60 : 30
}

export function groupRecoveryHealDice2024(fighterLevel: number): string {
  return `1d4+${Math.max(1, Math.floor(fighterLevel) || 1)}`
}

export {
  ARCANE_SHOT_IDS_2024,
  ARCANE_SHOTS_2024,
  arcaneShotDie2024,
  arcaneShotDieLabelRu2024,
  arcaneShot2024ById,
  arcaneShotSaveDc2024,
  arcaneShotsKnown2024,
  alwaysPreparedForSubclass2024,
}
