/**
 * Ranger 2024 (PHB / SRD 5.2): Favored Enemy, Weapon Mastery, Deft Explorer,
 * Fighting Style / Druidic Warrior, Tireless, Nature's Veil, capstones,
 * and PHB conclaves (Hunter, Beast Master, Fey Wanderer, Gloom Stalker).
 *
 * Callers branch on `rules_edition === '2024'`; nothing here feeds the 2014 pack.
 * Names follow the FINAL Russian list for this slice (catalog / next.dnd.su).
 */

import type { FeatureChoiceDef } from './classFeatures'
import type { ClassLevelEntry } from './classLevels'
import { normalizeClassSlug2024 } from './edition2024Classes'
import {
  getFeaturePick,
  getFeaturePickList,
  setFeaturePick,
  type FeaturePicksState,
} from './featurePicks'
import { parseFeatureResourceId } from './featureResources'
import { clampResource, type SheetResource } from './rest'

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL)                                                  */
/* ------------------------------------------------------------------ */

export const SPELLCASTING_NAME_RU = 'Сотворение заклинаний'
export const FAVORED_ENEMY_NAME_RU = 'Избранный враг'
export const HUNTERS_MARK_NAME_RU = 'Метка охотника'
export const WEAPON_MASTERY_NAME_RU = 'Оружейное мастерство'
export const DEFT_EXPLORER_NAME_RU = 'Ловкий исследователь'
export const FIGHTING_STYLE_NAME_RU = 'Боевой стиль'
export const DRUIDIC_WARRIOR_NAME_RU = 'Воин-друид'
export const RANGER_SUBCLASS_NAME_RU = 'Подкласс Следопыта'
export const ASI_NAME_RU = 'Увеличение характеристик'
export const EXTRA_ATTACK_NAME_RU = 'Дополнительная атака'
export const ROVING_NAME_RU = 'Вездеходность'
export const EXPERTISE_NAME_RU = 'Компетентность'
export const TIRELESS_NAME_RU = 'Неутомимость'
export const RELENTLESS_HUNTER_NAME_RU = 'Неустанный охотник'
export const NATURES_VEIL_NAME_RU = 'Природная завеса'
export const PRECISE_HUNTER_NAME_RU = 'Меткий охотник'
export const FERAL_SENSES_NAME_RU = 'Звериные чувства'
export const EPIC_BOON_NAME_RU = 'Эпический дар'
export const FOE_SLAYER_NAME_RU = 'Истребитель врагов'
export const SUBCLASS_FEATURE_NAME_RU = 'Умение подкласса'

/* Hunter */
export const HUNTERS_LORE_NAME_RU = 'Знания охотника'
export const HUNTERS_PREY_NAME_RU = 'Добыча охотника'
export const DEFENSIVE_TACTICS_NAME_RU = 'Оборонительная тактика'
export const SUPERIOR_HUNTERS_PREY_NAME_RU = 'Добыча превосходного охотника'
export const SUPERIOR_HUNTERS_DEFENSE_NAME_RU = 'Превосходная защита охотника'

/* Beast Master */
export const PRIMAL_COMPANION_NAME_RU = 'Первичный спутник'
export const EXCEPTIONAL_TRAINING_NAME_RU = 'Исключительная дрессировка'
export const BESTIAL_FURY_NAME_RU = 'Звериная ярость'
export const SHARE_SPELLS_NAME_RU = 'Общие заклинания'

/* Fey Wanderer */
export const DREADFUL_STRIKES_NAME_RU = 'Ужасающие удары'
export const FEY_WANDERER_SPELLS_NAME_RU = 'Заклинания странника фей'
export const OTHERWORLDLY_GLAMOUR_NAME_RU = 'Иной блеск'
export const BEGUILING_TWIST_NAME_RU = 'Обманный поворот'
export const FEY_REINFORCEMENT_NAME_RU = 'Подкрепление фей'
export const MISTY_WANDERER_NAME_RU = 'Туманный странник'

/* Gloom Stalker */
export const DREAD_AMBUSHER_NAME_RU = 'Угроза из засады'
export const DREAD_AMBUSHER_STRIKE_NAME_RU = 'Ужасающий удар'
export const GLOOM_STALKER_SPELLS_NAME_RU = 'Заклинания сумрачного охотника'
export const UMBRAL_SIGHT_NAME_RU = 'Сумрачное зрение'
export const IRON_MIND_NAME_RU = 'Железный разум'
export const STALKERS_FLURRY_NAME_RU = 'Охотничья ярость'
export const SHADOWY_DODGE_NAME_RU = 'Теневое уклонение'

/* ------------------------------------------------------------------ */
/* Ids / pools                                                         */
/* ------------------------------------------------------------------ */

export const RANGER_CLASS_SLUG_2024 = 'ranger'

export const RANGER_SUBCLASS_SLUGS_2024 = {
  hunter: 'ranger__hunter-ranger',
  beastmaster: 'ranger__beastmaster',
  feyWanderer: 'ranger__fey-wanderer',
  gloomStalker: 'ranger__gloom-stalker',
} as const

export type RangerSubclassKey2024 = keyof typeof RANGER_SUBCLASS_SLUGS_2024

export const FAVORED_ENEMY_POOL_ID = 'favored_enemy_uses'
export const TIRELESS_POOL_ID = 'tireless_uses'
export const NATURES_VEIL_POOL_ID = 'natures_veil_uses'
export const DREAD_AMBUSHER_STRIKE_POOL_ID = 'dread_ambusher_strike'

export const DRUIDIC_WARRIOR_ID = 'druidic-warrior'
export const DRUIDIC_WARRIOR_CANTRIPS_ID = 'druidic-warrior-cantrips'
export const DRUIDIC_WARRIOR_CANTRIP_LIMIT_2024 = 2

export const TIRELESS_MIN_LEVEL_2024 = 10
export const NATURES_VEIL_MIN_LEVEL_2024 = 14
export const RELENTLESS_HUNTER_MIN_LEVEL_2024 = 13
export const PRECISE_HUNTER_MIN_LEVEL_2024 = 17
export const FERAL_SENSES_MIN_LEVEL_2024 = 18
export const FOE_SLAYER_MIN_LEVEL_2024 = 20
export const ROVING_MIN_LEVEL_2024 = 6
export const DEFT_EXPLORER_MIN_LEVEL_2024 = 2
export const RANGER_EXPERTISE_MIN_LEVEL_2024 = 9
export const FIGHTING_STYLE_MIN_LEVEL_2024 = 2
export const SUBCLASS_MIN_LEVEL_2024 = 3
export const HUNTERS_PREY_MIN_LEVEL_2024 = 3
export const DEFENSIVE_TACTICS_MIN_LEVEL_2024 = 7

/** 2024 Hunter's Prey — not 2014 Giant Slayer / Horde Breaker rename drift. */
export const HUNTERS_PREY_OPTIONS_2024 = [
  { id: 'colossus_slayer', nameRu: 'Убийца колосса' },
  { id: 'horde_breaker', nameRu: 'Крушитель орды' },
] as const

export const DEFENSIVE_TACTICS_OPTIONS_2024 = [
  { id: 'escape_the_horde', nameRu: 'Побег от орды' },
  { id: 'multiattack_defense', nameRu: 'Защита от мультиатаки' },
] as const

export const PRIMAL_COMPANION_TYPES_2024 = [
  { id: 'land', nameRu: 'Земной' },
  { id: 'sea', nameRu: 'Морской' },
  { id: 'sky', nameRu: 'Небесный' },
] as const

export type HuntersPreyOption2024 = (typeof HUNTERS_PREY_OPTIONS_2024)[number]['id']
export type DefensiveTacticsOption2024 = (typeof DEFENSIVE_TACTICS_OPTIONS_2024)[number]['id']
export type PrimalCompanionType2024 = (typeof PRIMAL_COMPANION_TYPES_2024)[number]['id']

const HUNTERS_PREY_IDS = new Set<string>(HUNTERS_PREY_OPTIONS_2024.map((row) => row.id))
const DEFENSIVE_TACTICS_IDS = new Set<string>(DEFENSIVE_TACTICS_OPTIONS_2024.map((row) => row.id))

/* ------------------------------------------------------------------ */
/* Feature names by id (leveling step labels)                          */
/* ------------------------------------------------------------------ */

export const RANGER_FEATURE_NAMES_BY_ID: Record<string, string> = {
  spellcasting: SPELLCASTING_NAME_RU,
  'favored-enemy': FAVORED_ENEMY_NAME_RU,
  favored_enemy: FAVORED_ENEMY_NAME_RU,
  'hunters-mark': HUNTERS_MARK_NAME_RU,
  hunters_mark: HUNTERS_MARK_NAME_RU,
  'weapon-mastery': WEAPON_MASTERY_NAME_RU,
  weapon_mastery: WEAPON_MASTERY_NAME_RU,
  'deft-explorer': DEFT_EXPLORER_NAME_RU,
  deft_explorer: DEFT_EXPLORER_NAME_RU,
  'fighting-style': FIGHTING_STYLE_NAME_RU,
  fighting_style: FIGHTING_STYLE_NAME_RU,
  'druidic-warrior': DRUIDIC_WARRIOR_NAME_RU,
  druidic_warrior: DRUIDIC_WARRIOR_NAME_RU,
  'ranger-subclass': RANGER_SUBCLASS_NAME_RU,
  ranger_subclass: RANGER_SUBCLASS_NAME_RU,
  subclass: RANGER_SUBCLASS_NAME_RU,
  'ability-score-improvement': ASI_NAME_RU,
  ability_score_improvement: ASI_NAME_RU,
  'extra-attack': EXTRA_ATTACK_NAME_RU,
  extra_attack: EXTRA_ATTACK_NAME_RU,
  roving: ROVING_NAME_RU,
  expertise: EXPERTISE_NAME_RU,
  tireless: TIRELESS_NAME_RU,
  'relentless-hunter': RELENTLESS_HUNTER_NAME_RU,
  relentless_hunter: RELENTLESS_HUNTER_NAME_RU,
  'natures-veil': NATURES_VEIL_NAME_RU,
  natures_veil: NATURES_VEIL_NAME_RU,
  'precise-hunter': PRECISE_HUNTER_NAME_RU,
  precise_hunter: PRECISE_HUNTER_NAME_RU,
  'feral-senses': FERAL_SENSES_NAME_RU,
  feral_senses: FERAL_SENSES_NAME_RU,
  'epic-boon': EPIC_BOON_NAME_RU,
  epic_boon: EPIC_BOON_NAME_RU,
  'foe-slayer': FOE_SLAYER_NAME_RU,
  foe_slayer: FOE_SLAYER_NAME_RU,
  'subclass-feature': SUBCLASS_FEATURE_NAME_RU,
  subclass_feature: SUBCLASS_FEATURE_NAME_RU,
  'hunters-lore': HUNTERS_LORE_NAME_RU,
  hunters_lore: HUNTERS_LORE_NAME_RU,
  'hunters-prey': HUNTERS_PREY_NAME_RU,
  hunters_prey: HUNTERS_PREY_NAME_RU,
  'defensive-tactics': DEFENSIVE_TACTICS_NAME_RU,
  defensive_tactics: DEFENSIVE_TACTICS_NAME_RU,
  'superior-hunters-prey': SUPERIOR_HUNTERS_PREY_NAME_RU,
  superior_hunters_prey: SUPERIOR_HUNTERS_PREY_NAME_RU,
  'superior-hunters-defense': SUPERIOR_HUNTERS_DEFENSE_NAME_RU,
  superior_hunters_defense: SUPERIOR_HUNTERS_DEFENSE_NAME_RU,
  'primal-companion': PRIMAL_COMPANION_NAME_RU,
  primal_companion: PRIMAL_COMPANION_NAME_RU,
  'exceptional-training': EXCEPTIONAL_TRAINING_NAME_RU,
  exceptional_training: EXCEPTIONAL_TRAINING_NAME_RU,
  'bestial-fury': BESTIAL_FURY_NAME_RU,
  bestial_fury: BESTIAL_FURY_NAME_RU,
  'share-spells': SHARE_SPELLS_NAME_RU,
  share_spells: SHARE_SPELLS_NAME_RU,
  'dreadful-strikes': DREADFUL_STRIKES_NAME_RU,
  dreadful_strikes: DREADFUL_STRIKES_NAME_RU,
  'fey-wanderer-spells': FEY_WANDERER_SPELLS_NAME_RU,
  fey_wanderer_spells: FEY_WANDERER_SPELLS_NAME_RU,
  'otherworldly-glamour': OTHERWORLDLY_GLAMOUR_NAME_RU,
  otherworldly_glamour: OTHERWORLDLY_GLAMOUR_NAME_RU,
  'beguiling-twist': BEGUILING_TWIST_NAME_RU,
  beguiling_twist: BEGUILING_TWIST_NAME_RU,
  'fey-reinforcement': FEY_REINFORCEMENT_NAME_RU,
  fey_reinforcement: FEY_REINFORCEMENT_NAME_RU,
  'misty-wanderer': MISTY_WANDERER_NAME_RU,
  misty_wanderer: MISTY_WANDERER_NAME_RU,
  'dread-ambusher': DREAD_AMBUSHER_NAME_RU,
  dread_ambusher: DREAD_AMBUSHER_NAME_RU,
  'dread-ambusher-strike': DREAD_AMBUSHER_STRIKE_NAME_RU,
  dread_ambusher_strike: DREAD_AMBUSHER_STRIKE_NAME_RU,
  'gloom-stalker-spells': GLOOM_STALKER_SPELLS_NAME_RU,
  gloom_stalker_spells: GLOOM_STALKER_SPELLS_NAME_RU,
  'umbral-sight': UMBRAL_SIGHT_NAME_RU,
  umbral_sight: UMBRAL_SIGHT_NAME_RU,
  'iron-mind': IRON_MIND_NAME_RU,
  iron_mind: IRON_MIND_NAME_RU,
  'stalkers-flurry': STALKERS_FLURRY_NAME_RU,
  stalkers_flurry: STALKERS_FLURRY_NAME_RU,
  'shadowy-dodge': SHADOWY_DODGE_NAME_RU,
  shadowy_dodge: SHADOWY_DODGE_NAME_RU,
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

function wisFromAbilities(abilities?: Partial<Record<'wis', number>>): number {
  const wis = abilities?.wis
  if (typeof wis !== 'number') return 0
  return Math.floor((wis - 10) / 2)
}

export function isRangerClassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return key === RANGER_CLASS_SLUG_2024 || /следопыт/.test(key)
}

/** Foe Slayer: Hunter's Mark bonus die becomes d10 at L20 (else d6). */
export function huntersMarkExtraDie2024(rangerLevel: number): 'd6' | 'd10' {
  return lvl(rangerLevel) >= FOE_SLAYER_MIN_LEVEL_2024 ? 'd10' : 'd6'
}

export function huntersMarkExtraDieLabelRu2024(rangerLevel: number): string {
  return huntersMarkExtraDie2024(rangerLevel) === 'd10' ? 'к10' : 'к6'
}

export function isRelentlessHunterActive(rangerLevel: number): boolean {
  return lvl(rangerLevel) >= RELENTLESS_HUNTER_MIN_LEVEL_2024
}

export function hasFeralSensesBlindsight(rangerLevel: number): boolean {
  return lvl(rangerLevel) >= FERAL_SENSES_MIN_LEVEL_2024
}

export function feralSensesBlindsightFt2024(rangerLevel: number): number {
  return hasFeralSensesBlindsight(rangerLevel) ? 30 : 0
}

export function rovingSpeedBonusFt(input: {
  rangerLevel: number
  wearingHeavyArmor?: boolean
}): number {
  if (lvl(input.rangerLevel) < ROVING_MIN_LEVEL_2024) return 0
  if (input.wearingHeavyArmor) return 0
  return 10
}

export function rovingClimbSwimEqualsSpeed(input: {
  rangerLevel: number
  wearingHeavyArmor?: boolean
}): boolean {
  return rovingSpeedBonusFt(input) > 0
}

/* ------------------------------------------------------------------ */
/* Leveling choices (Deft Explorer, Expertise, subclasses)             */
/* ------------------------------------------------------------------ */

export const DEFT_EXPLORER_FEATURE_ID_2024 = 'deft_explorer'

export const deftExplorerChoice2024: FeatureChoiceDef = {
  id: 'deft_explorer',
  label_ru: DEFT_EXPLORER_NAME_RU,
  options_from: 'expertise_skills_tools',
  max_picks: 1,
}

export const rangerExpertiseChoice2024: FeatureChoiceDef = {
  id: 'expertise',
  label_ru: EXPERTISE_NAME_RU,
  options_from: 'expertise_skills_tools',
  max_picks: 2,
}

export const huntersPreyChoice2024: FeatureChoiceDef = {
  id: 'hunters_prey',
  label_ru: HUNTERS_PREY_NAME_RU,
  max_picks: 1,
  options: HUNTERS_PREY_OPTIONS_2024.map((row) => row.id),
}

export const defensiveTacticsChoice2024: FeatureChoiceDef = {
  id: 'defensive_tactics',
  label_ru: DEFENSIVE_TACTICS_NAME_RU,
  max_picks: 1,
  options: DEFENSIVE_TACTICS_OPTIONS_2024.map((row) => row.id),
}

export const primalCompanionChoice2024: FeatureChoiceDef = {
  id: 'primal_companion',
  label_ru: PRIMAL_COMPANION_NAME_RU,
  max_picks: 1,
  options: PRIMAL_COMPANION_TYPES_2024.map((row) => row.id),
}

export const OTHERWORLDLY_GLAMOUR_SKILLS_2024 = ['performance', 'deception', 'persuasion'] as const

export const otherworldlyGlamourChoice2024: FeatureChoiceDef = {
  id: 'otherworldly_glamour',
  label_ru: OTHERWORLDLY_GLAMOUR_NAME_RU,
  max_picks: 1,
  options: [...OTHERWORLDLY_GLAMOUR_SKILLS_2024],
}

/** Card buttons on ClassFeaturesPanel (edition 2024 only). */
export const RANGER_2024_CARD_BUTTONS: Record<string, string> = {
  tireless: 'Неутомимость…',
  'natures-veil': 'Завеса…',
  natures_veil: 'Завеса…',
  'favored-enemy': 'Метка (бесплатно)…',
  favored_enemy: 'Метка (бесплатно)…',
  'free-hunters-mark': 'Метка (бесплатно)…',
  free_hunters_mark: 'Метка (бесплатно)…',
  'dread-ambusher-strike': 'Удар…',
  dread_ambusher_strike: 'Удар…',
  'dread-ambusher': 'Удар…',
  dread_ambusher: 'Удар…',
  'dreadful-strikes': 'Ужасающие удары…',
  dreadful_strikes: 'Ужасающие удары…',
}

/** Tireless temp HP: `1к8+Мдр` (Мдр мин. 1). */
export function tirelessTempHpFormulaRu2024(wisMod: number): string {
  return `1к8+${Math.max(1, mod(wisMod))}`
}

/** Gloom Stalker: initiative bonus from Wis (2024); no 2014 first-turn extra attack hook. */
export function dreadAmbusherInitiativeBonus2024(wisMod: number): number {
  return mod(wisMod)
}

export function isHuntersPreyOption2024(optionId: string | null | undefined): optionId is HuntersPreyOption2024 {
  const key = String(optionId ?? '').trim()
  return HUNTERS_PREY_IDS.has(key)
}

export function isDefensiveTacticsOption2024(
  optionId: string | null | undefined,
): optionId is DefensiveTacticsOption2024 {
  const key = String(optionId ?? '').trim()
  return DEFENSIVE_TACTICS_IDS.has(key)
}

export function primalCompanionTypeLabelRu2024(typeId: string | null | undefined): string | null {
  const key = String(typeId ?? '').trim().toLowerCase()
  return PRIMAL_COMPANION_TYPES_2024.find((row) => row.id === key)?.nameRu ?? null
}

/* ------------------------------------------------------------------ */
/* Druidic Warrior (fighting style)                                    */
/* ------------------------------------------------------------------ */

function normalizeDruidicWarriorStyle(raw: unknown): boolean {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
  return key === DRUIDIC_WARRIOR_ID || key === 'druidic-warrior'
}

export function isDruidicWarriorStyleId(styleId: string | null | undefined): boolean {
  return normalizeDruidicWarriorStyle(styleId)
}

export function readDruidicWarriorCantrips2024(
  picks: FeaturePicksState,
  classEntryId: string,
): string[] {
  const fromHyphen = getFeaturePickList(picks, classEntryId, DRUIDIC_WARRIOR_CANTRIPS_ID)
  if (fromHyphen.length) {
    return fromHyphen.slice(0, DRUIDIC_WARRIOR_CANTRIP_LIMIT_2024)
  }
  return getFeaturePickList(picks, classEntryId, 'druidic_warrior_cantrips').slice(
    0,
    DRUIDIC_WARRIOR_CANTRIP_LIMIT_2024,
  )
}

export function writeDruidicWarriorCantrips2024(
  picks: FeaturePicksState,
  classEntryId: string,
  cantrips: readonly string[],
): FeaturePicksState {
  const cleaned = cantrips
    .map((row) => String(row).trim())
    .filter(Boolean)
    .slice(0, DRUIDIC_WARRIOR_CANTRIP_LIMIT_2024)
  return setFeaturePick(
    picks,
    classEntryId,
    DRUIDIC_WARRIOR_CANTRIPS_ID,
    cleaned.length ? cleaned.join(',') : null,
  )
}

export function readDruidicWarriorActive2024(
  picks: FeaturePicksState,
  classEntryId: string,
): boolean {
  const style =
    getFeaturePick(picks, classEntryId, 'fighting_style_ranger') ??
    getFeaturePick(picks, classEntryId, 'fighting-style-ranger') ??
    getFeaturePick(picks, classEntryId, 'fighting_style') ??
    getFeaturePick(picks, classEntryId, 'fighting-style')
  return isDruidicWarriorStyleId(style)
}

/* ------------------------------------------------------------------ */
/* Leveling labels (exact level)                                       */
/* ------------------------------------------------------------------ */

type UnlockRow = { id: string; nameRu: string; unlockLevel: number }

const RANGER_UNLOCK_LADDER_2024: readonly UnlockRow[] = [
  { id: 'spellcasting', nameRu: SPELLCASTING_NAME_RU, unlockLevel: 1 },
  { id: 'favored-enemy', nameRu: FAVORED_ENEMY_NAME_RU, unlockLevel: 1 },
  { id: 'weapon-mastery', nameRu: WEAPON_MASTERY_NAME_RU, unlockLevel: 1 },
  { id: 'deft-explorer', nameRu: DEFT_EXPLORER_NAME_RU, unlockLevel: 2 },
  { id: 'fighting-style', nameRu: FIGHTING_STYLE_NAME_RU, unlockLevel: 2 },
  { id: 'ranger-subclass', nameRu: RANGER_SUBCLASS_NAME_RU, unlockLevel: 3 },
  { id: 'ability-score-improvement', nameRu: ASI_NAME_RU, unlockLevel: 4 },
  { id: 'extra-attack', nameRu: EXTRA_ATTACK_NAME_RU, unlockLevel: 5 },
  { id: 'roving', nameRu: ROVING_NAME_RU, unlockLevel: 6 },
  { id: 'subclass-feature', nameRu: SUBCLASS_FEATURE_NAME_RU, unlockLevel: 7 },
  { id: 'ability-score-improvement', nameRu: ASI_NAME_RU, unlockLevel: 8 },
  { id: 'expertise', nameRu: EXPERTISE_NAME_RU, unlockLevel: 9 },
  { id: 'tireless', nameRu: TIRELESS_NAME_RU, unlockLevel: 10 },
  { id: 'subclass-feature', nameRu: SUBCLASS_FEATURE_NAME_RU, unlockLevel: 11 },
  { id: 'ability-score-improvement', nameRu: ASI_NAME_RU, unlockLevel: 12 },
  { id: 'relentless-hunter', nameRu: RELENTLESS_HUNTER_NAME_RU, unlockLevel: 13 },
  { id: 'natures-veil', nameRu: NATURES_VEIL_NAME_RU, unlockLevel: 14 },
  { id: 'subclass-feature', nameRu: SUBCLASS_FEATURE_NAME_RU, unlockLevel: 15 },
  { id: 'ability-score-improvement', nameRu: ASI_NAME_RU, unlockLevel: 16 },
  { id: 'precise-hunter', nameRu: PRECISE_HUNTER_NAME_RU, unlockLevel: 17 },
  { id: 'feral-senses', nameRu: FERAL_SENSES_NAME_RU, unlockLevel: 18 },
  { id: 'epic-boon', nameRu: EPIC_BOON_NAME_RU, unlockLevel: 19 },
  { id: 'foe-slayer', nameRu: FOE_SLAYER_NAME_RU, unlockLevel: 20 },
]

/** Class features unlocked at this exact ranger level (LevelingStep labels). */
export function listRangerFeaturesForLeveling(level: number): UnlockRow[] {
  const n = lvl(level)
  if (n < 1) return []
  return RANGER_UNLOCK_LADDER_2024.filter((row) => row.unlockLevel === n).map((row) => ({ ...row }))
}

/* ------------------------------------------------------------------ */
/* Apply spend / refund                                                */
/* ------------------------------------------------------------------ */

const RANGER_USE_FEATURE_IDS = new Set([
  'tireless',
  'natures-veil',
  'favored-enemy',
  'free-hunters-mark',
  'dread-ambusher-strike',
  'dread-ambusher',
])

export function ranger2024UseFeatureId(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.trim().replace(/_/g, '-')
  if (key === 'hunters-mark-free' || key === 'favored-enemy-mark') return 'favored-enemy'
  if (key === 'dread_ambusher_strike') return 'dread-ambusher-strike'
  return RANGER_USE_FEATURE_IDS.has(key) ? key : null
}

export function findRangerPool2024(
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
    const ranger = resources.find((row) => {
      const parsed = parseFeatureResourceId(row.id)
      return parsed?.poolId === poolId && parsed.classSlug === RANGER_CLASS_SLUG_2024
    })
    if (ranger) return ranger
  }
  return resources.find(matches) ?? null
}

export type Ranger2024UseInput = {
  featureId: string
  resourceId: string | null
  resources: SheetResource[]
  classEntryId: string
  rangerLevel: number
  abilities?: Partial<Record<'wis', number>>
  refund?: boolean
  mode?: string | null
}

export type Ranger2024Patches = {
  diceExpression?: string | null
  tempHp?: number
  activeLabels?: string[]
}

export type Ranger2024UseResult = {
  ok: boolean
  resources: SheetResource[]
  feedLineRu: string
  message?: string
  patches?: Ranger2024Patches
}

function patchRow(
  resources: SheetResource[],
  id: string,
  patch: (row: SheetResource) => SheetResource,
): SheetResource[] {
  return resources.map((row) => (row.id === id ? clampResource(patch(row)) : row))
}

function poolRow(input: Ranger2024UseInput, poolId: string): SheetResource | null {
  if (input.resourceId) {
    const byId = input.resources.find((row) => row.id === input.resourceId)
    if (byId && parseFeatureResourceId(byId.id)?.poolId === poolId) return byId
  }
  return findRangerPool2024(input.resources, poolId, input.classEntryId)
}

function ok(
  input: Ranger2024UseInput,
  feedLineRu: string,
  extra: { resources?: SheetResource[]; patches?: Ranger2024Patches } = {},
): Ranger2024UseResult {
  return {
    ok: true,
    resources: extra.resources ?? input.resources,
    feedLineRu,
    ...(extra.patches ? { patches: extra.patches } : {}),
  }
}

function refuse(input: Ranger2024UseInput, message: string): Ranger2024UseResult {
  return { ok: false, resources: input.resources, feedLineRu: '', message }
}

function isRefund(input: Ranger2024UseInput): boolean {
  const mode = (input.mode ?? '').trim().toLowerCase()
  return Boolean(input.refund) || mode === 'refund'
}

function spendPool(
  input: Ranger2024UseInput,
  poolId: string,
  nameRu: string,
):
  | { ok: true; resources: SheetResource[] }
  | { ok: false; result: Ranger2024UseResult } {
  const row = poolRow(input, poolId)
  if (!row) return { ok: false, result: refuse(input, `Ресурс «${nameRu}» не найден`) }
  if (row.used >= row.max) {
    return {
      ok: false,
      result: refuse(input, `${nameRu}: использования закончились (долгий отдых вернёт)`),
    }
  }
  return {
    ok: true,
    resources: patchRow(input.resources, row.id, (item) => ({ ...item, used: item.used + 1 })),
  }
}

function refundPool(
  input: Ranger2024UseInput,
  poolId: string,
  nameRu: string,
):
  | { ok: true; resources: SheetResource[] }
  | { ok: false; result: Ranger2024UseResult } {
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

export function applyRanger2024FeatureUse(input: Ranger2024UseInput): Ranger2024UseResult {
  const fid = ranger2024UseFeatureId(input.featureId) ?? norm(input.featureId)
  const level = lvl(input.rangerLevel)
  const wisMod = wisFromAbilities(input.abilities)
  const refund = isRefund(input)

  switch (fid) {
    case 'tireless': {
      if (level < TIRELESS_MIN_LEVEL_2024) {
        return refuse(input, `${TIRELESS_NAME_RU} с ${TIRELESS_MIN_LEVEL_2024} уровня следопыта`)
      }
      if (refund) {
        const refunded = refundPool(input, TIRELESS_POOL_ID, TIRELESS_NAME_RU)
        if (!refunded.ok) return refunded.result
        return ok(input, `${TIRELESS_NAME_RU}: использование возвращено`, {
          resources: refunded.resources,
        })
      }
      const spent = spendPool(input, TIRELESS_POOL_ID, TIRELESS_NAME_RU)
      if (!spent.ok) return spent.result
      const formula = tirelessTempHpFormulaRu2024(wisMod)
      return ok(
        input,
        `${TIRELESS_NAME_RU} (действие «Магия»): врем. хиты ${formula}`,
        {
          resources: spent.resources,
          patches: { diceExpression: formula },
        },
      )
    }

    case 'natures-veil': {
      if (level < NATURES_VEIL_MIN_LEVEL_2024) {
        return refuse(input, `${NATURES_VEIL_NAME_RU} с ${NATURES_VEIL_MIN_LEVEL_2024} уровня следопыта`)
      }
      if (refund) {
        const refunded = refundPool(input, NATURES_VEIL_POOL_ID, NATURES_VEIL_NAME_RU)
        if (!refunded.ok) return refunded.result
        return ok(input, `${NATURES_VEIL_NAME_RU}: использование возвращено`, {
          resources: refunded.resources,
        })
      }
      const spent = spendPool(input, NATURES_VEIL_POOL_ID, NATURES_VEIL_NAME_RU)
      if (!spent.ok) return spent.result
      return ok(
        input,
        `${NATURES_VEIL_NAME_RU}: бонусное — Невидимость до конца вашего следующего хода`,
        {
          resources: spent.resources,
          patches: { activeLabels: [NATURES_VEIL_NAME_RU] },
        },
      )
    }

    case 'favored-enemy':
    case 'free-hunters-mark': {
      if (refund) {
        const refunded = refundPool(input, FAVORED_ENEMY_POOL_ID, FAVORED_ENEMY_NAME_RU)
        if (!refunded.ok) return refunded.result
        return ok(
          input,
          `${FAVORED_ENEMY_NAME_RU}: бесплатное «${HUNTERS_MARK_NAME_RU}» возвращено`,
          { resources: refunded.resources },
        )
      }
      const spent = spendPool(
        input,
        FAVORED_ENEMY_POOL_ID,
        FAVORED_ENEMY_NAME_RU,
      )
      if (!spent.ok) return spent.result
      return ok(
        input,
        `${FAVORED_ENEMY_NAME_RU}: «${HUNTERS_MARK_NAME_RU}» без ячейки (1/долг. отд.)`,
        { resources: spent.resources },
      )
    }

    case 'dread-ambusher-strike':
    case 'dread-ambusher': {
      if (level < SUBCLASS_MIN_LEVEL_2024) {
        return refuse(input, `${DREAD_AMBUSHER_STRIKE_NAME_RU} с ${SUBCLASS_MIN_LEVEL_2024} уровня следопыта`)
      }
      if (refund) {
        const refunded = refundPool(
          input,
          DREAD_AMBUSHER_STRIKE_POOL_ID,
          DREAD_AMBUSHER_STRIKE_NAME_RU,
        )
        if (!refunded.ok) return refunded.result
        return ok(input, `${DREAD_AMBUSHER_STRIKE_NAME_RU}: использование возвращено`, {
          resources: refunded.resources,
        })
      }
      const spent = spendPool(
        input,
        DREAD_AMBUSHER_STRIKE_POOL_ID,
        DREAD_AMBUSHER_STRIKE_NAME_RU,
      )
      if (!spent.ok) return spent.result
      return ok(
        input,
        `${DREAD_AMBUSHER_NAME_RU}: ${DREAD_AMBUSHER_STRIKE_NAME_RU} (+2к6 психического, 1 раз за ход)`,
        { resources: spent.resources },
      )
    }

    default:
      return refuse(input, `Умение «${input.featureId}» не настроено в диалоге 2024`)
  }
}

/* ------------------------------------------------------------------ */
/* Hunter's Mark — cast without slot (favored_enemy_uses pool)         */
/* ------------------------------------------------------------------ */

export type RangerHuntersMarkKnownRow = {
  id: string
  name?: string
  class_slug?: string | null
  class_entry_id?: string | null
  cast_access?: string | null
  feature_spend?: {
    poolId: string
    classSlug: string
    classEntryId: string
    cost: number
    label: string
    optionId?: string
  } | null
}

function huntersMarkRowSlug(spell: RangerHuntersMarkKnownRow): boolean {
  const id = spell.id.toLowerCase()
  if (id.includes('hunters-mark') || id.includes('hunters_mark')) return true
  const name = (spell.name || '').toLowerCase()
  return /метк.*охотник|hunter'?s?\s*mark/i.test(name)
}

function featureSpendMatches(
  spell: RangerHuntersMarkKnownRow,
  want: NonNullable<RangerHuntersMarkKnownRow['feature_spend']>,
): boolean {
  const spend = spell.feature_spend
  if (spell.cast_access !== 'feature' || !spend) return false
  return (
    spend.poolId === want.poolId &&
    spend.classSlug === want.classSlug &&
    spend.classEntryId === want.classEntryId &&
    spend.cost === want.cost &&
    spend.label === want.label
  )
}

/** Patch known «Метка охотника» rows so the cast dialog can spend favored_enemy_uses (2024). */
export function ensureRangerHuntersMarkFeatureCast2024<T extends RangerHuntersMarkKnownRow>(
  known: T[],
  classes: Array<Pick<ClassLevelEntry, 'id' | 'name' | 'level' | 'catalog_id'>>,
): T[] {
  const ranger = classes.find((row) => {
    const slug =
      normalizeClassSlug2024(row.catalog_id) || normalizeClassSlug2024(row.name)
    return slug === RANGER_CLASS_SLUG_2024 && (row.level ?? 0) >= 1
  })
  if (!ranger?.id) return known
  const spend = {
    poolId: FAVORED_ENEMY_POOL_ID,
    classSlug: RANGER_CLASS_SLUG_2024,
    classEntryId: ranger.id,
    cost: 1,
    label: `${HUNTERS_MARK_NAME_RU} (бесплатно)`,
  }
  let changed = false
  const next = known.map((row) => {
    if (!huntersMarkRowSlug(row)) return row
    if (featureSpendMatches(row, spend)) return row
    changed = true
    return {
      ...row,
      cast_access: 'feature' as const,
      feature_spend: spend,
      class_slug: row.class_slug ?? RANGER_CLASS_SLUG_2024,
      class_entry_id: row.class_entry_id ?? ranger.id,
    }
  })
  return changed ? next : known
}