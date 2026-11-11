/**
 * Pack 10: fighter archetype picks that must land on the sheet
 * (cavalier / samurai skill-or-language, royal envoy, rune charges, totem bridge).
 */

import {
  getFeaturePick,
  getFeaturePickList,
  setFeaturePick,
  type FeaturePicksState,
} from './featurePicks'

export const CAVALIER_SKILL_OPTIONS = [
  'animal_handling',
  'history',
  'insight',
  'performance',
  'persuasion',
] as const

export const SAMURAI_SKILL_OPTIONS = [
  'history',
  'insight',
  'performance',
  'persuasion',
] as const

export const ROYAL_ENVOY_ALT_SKILLS = [
  'animal_handling',
  'insight',
  'intimidation',
  'performance',
] as const

/** Standard languages a cavalier or samurai may learn instead of a skill. */
export const FIGHTER_BONUS_LANGUAGES = [
  'Общий',
  'Дварфийский',
  'Эльфийский',
  'Великаний',
  'Гномий',
  'Гоблинский',
  'Полуросликов',
  'Орочий',
  'Бездны',
  'Небесный',
  'Драконий',
  'Глубинная речь',
  'Инфернальный',
  'Первичный',
  'Сильван',
  'Подземный',
] as const

export function languageOptionId(name: string): string {
  return `lang:${name}`
}

export function languageNameFromOption(optionId: string): string | null {
  if (!optionId.startsWith('lang:')) return null
  const name = optionId.slice('lang:'.length).trim()
  return name || null
}

export function cavalierBonusOptionIds(): string[] {
  return [
    ...CAVALIER_SKILL_OPTIONS,
    ...FIGHTER_BONUS_LANGUAGES.map(languageOptionId),
  ]
}

export function samuraiBonusOptionIds(): string[] {
  return [
    ...SAMURAI_SKILL_OPTIONS,
    ...FIGHTER_BONUS_LANGUAGES.map(languageOptionId),
  ]
}

export const RUNE_OPTIONS = [
  { id: 'rune_cloud', labelRu: 'Облако', minLevel: 3 },
  { id: 'rune_fire', labelRu: 'Огонь', minLevel: 3 },
  { id: 'rune_frost', labelRu: 'Холод', minLevel: 3 },
  { id: 'rune_stone', labelRu: 'Камень', minLevel: 3 },
  { id: 'rune_hill', labelRu: 'Холм', minLevel: 7 },
  { id: 'rune_storm', labelRu: 'Буря', minLevel: 7 },
] as const

export function runeOptionIds(): string[] {
  return RUNE_OPTIONS.map((row) => row.id)
}

export function runeLabelRu(optionId: string): string | null {
  return RUNE_OPTIONS.find((row) => row.id === optionId)?.labelRu ?? null
}

export function runeMinLevel(optionId: string): number | null {
  return RUNE_OPTIONS.find((row) => row.id === optionId)?.minLevel ?? null
}

/** TCE Master of Runes: each known rune can be invoked twice from 15th. */
export function runeChargesAtLevel(classLevel: number): number {
  return Math.floor(classLevel) >= 15 ? 2 : 1
}

const TOTEM_VALUES = new Set(['bear', 'eagle', 'wolf'])

export function bridgeTotemSpiritPick(input: {
  featurePicks: FeaturePicksState
  classEntryId: string
  values: Record<string, string | string[] | undefined> | null | undefined
}): FeaturePicksState {
  const raw = input.values?.totem_spirit_3
  const value = typeof raw === 'string' ? raw.trim() : Array.isArray(raw) ? raw[0]?.trim() ?? '' : ''
  if (!TOTEM_VALUES.has(value)) return input.featurePicks
  if (getFeaturePick(input.featurePicks, input.classEntryId, 'totem_spirit')) {
    return input.featurePicks
  }
  return setFeaturePick(input.featurePicks, input.classEntryId, 'totem_spirit', value)
}

export function hydrateTotemSpiritFromGrants(input: {
  featurePicks: FeaturePicksState
  subclassGrants: Array<{
    classEntryId: string
    slug: string
    picks?: Record<string, string | string[] | undefined>
  }>
}): { featurePicks: FeaturePicksState; bridgedClassEntryIds: string[] } {
  let next = input.featurePicks
  const bridgedClassEntryIds: string[] = []
  for (const grant of input.subclassGrants) {
    if (grant.slug !== 'path_of_the_totem_warrior') continue
    const bridged = bridgeTotemSpiritPick({
      featurePicks: next,
      classEntryId: grant.classEntryId,
      values: grant.picks,
    })
    if (bridged === next) continue
    next = bridged
    bridgedClassEntryIds.push(grant.classEntryId)
  }
  return { featurePicks: next, bridgedClassEntryIds }
}

export type FighterGrantPlan = {
  /** Skills to mark proficient. */
  skills: string[]
  /** Languages to add by display name. */
  languages: string[]
  /** Skills that keep doubled proficiency (Royal Envoy → Persuasion). */
  expertise: string[]
}

function pushUnique(list: string[], value: string) {
  if (!value || list.includes(value)) return
  list.push(value)
}

/**
 * XGE cavalier / samurai: one skill from the list OR one language, not both.
 * SCAG Royal Envoy: Persuasion proficiency (or a substitute skill) and Persuasion expertise.
 */
export function fighterSkillAndLanguageGrants(input: {
  features: Array<{ id: string; classEntryId: string }>
  featurePicks: FeaturePicksState
  /** Persuasion already granted by class, background, race, feat, or another archetype. */
  persuasionFromOtherSources: boolean
}): FighterGrantPlan {
  const skills: string[] = []
  const languages: string[] = []
  const expertise: string[] = []

  for (const feature of input.features) {
    const pick = getFeaturePick(input.featurePicks, feature.classEntryId, feature.id)
    if (feature.id === 'bonus_proficiency_cavalier' && pick) {
      if ((CAVALIER_SKILL_OPTIONS as readonly string[]).includes(pick)) pushUnique(skills, pick)
      const language = languageNameFromOption(pick)
      if (language) pushUnique(languages, language)
    }
    if (feature.id === 'bonus_proficiency_samurai' && pick) {
      if ((SAMURAI_SKILL_OPTIONS as readonly string[]).includes(pick)) pushUnique(skills, pick)
      const language = languageNameFromOption(pick)
      if (language) pushUnique(languages, language)
    }
    if (feature.id === 'royal_envoy') {
      pushUnique(expertise, 'persuasion')
      pushUnique(skills, 'persuasion')
      if (
        input.persuasionFromOtherSources &&
        pick &&
        (ROYAL_ENVOY_ALT_SKILLS as readonly string[]).includes(pick)
      ) {
        pushUnique(skills, pick)
      }
    }
  }

  return { skills, languages, expertise }
}

export function featureLockedExpertiseSkillIds(
  features: Array<{ id: string }>,
): string[] {
  return features.some((feature) => feature.id === 'royal_envoy') ? ['persuasion'] : []
}

/** Known rune ids currently picked on Rune Carver. */
export function knownRuneIds(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): string[] {
  return getFeaturePickList(featurePicks, classEntryId, 'rune_carver').filter((id) =>
    Boolean(runeLabelRu(id)),
  )
}
