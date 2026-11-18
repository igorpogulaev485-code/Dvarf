/**
 * P24-M02B-paladin: FRHoF Oath of the Noble Genies helpers.
 * Callers must branch on rules_edition === '2024'; does not feed 2014 oaths.
 */

import type { FeatureChoiceDef } from './classFeatures'
import { alwaysPreparedForSubclass2024, isPhb2024CreateSubclass } from './edition2024Subclasses'
import {
  emptyFeaturePicks,
  getFeatureChoicePick,
  getFeaturePick,
  type FeaturePicksState,
} from './featurePicks'

function picksOrEmpty(picks: FeaturePicksState | null | undefined): FeaturePicksState {
  return picks ?? emptyFeaturePicks()
}

export const M02B_PALADIN_BOOK_SLUGS = ['paladin__oath-of-the-noble-genies'] as const

export type M02bPaladinBookSlug = (typeof M02B_PALADIN_BOOK_SLUGS)[number]

export const OATH_OF_THE_NOBLE_GENIES_SLUG = 'paladin__oath-of-the-noble-genies'

export function isM02bPaladinBookSubclass(slug: string | null | undefined): boolean {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
  return (M02B_PALADIN_BOOK_SLUGS as readonly string[]).includes(key)
}

export function isOathOfTheNobleGenies2024(slug: string | null | undefined): boolean {
  return String(slug || '').trim().toLowerCase() === OATH_OF_THE_NOBLE_GENIES_SLUG
}

/** Assert allowlist opens only this book path (selfcheck). */
export function paladinBookAllowlistOpen2024(slug: string): boolean {
  return isPhb2024CreateSubclass(slug) && isM02bPaladinBookSubclass(slug)
}

/* ------------------------------------------------------------------ */
/* Names (RU — FINAL for this pack)                                    */
/* ------------------------------------------------------------------ */

export const OATH_OF_THE_NOBLE_GENIES_NAME_RU = 'Клятва благородных гениев'

export const GENIE_SPELLS_NAME_RU = 'Заклинания гениев'
export const ELEMENTAL_SMITE_NAME_RU = 'Стихийная кара'
export const GENIES_SPLENDOR_NAME_RU = 'Великолепие гения'
export const AURA_OF_ELEMENTAL_SHIELDING_NAME_RU = 'Аура стихийной защиты'
export const ELEMENTAL_REBUKE_NAME_RU = 'Стихийное возмездие'
export const NOBLE_SCION_NAME_RU = 'Благородный гений'

export const MARID_SURGE_NAME_RU = 'Всплеск марида'
export const DAO_PRESSURE_NAME_RU = 'Давление дао'
export const DJINN_ESCAPE_NAME_RU = 'Побег джинна'
export const EFREET_FURY_NAME_RU = 'Ярость ифрита'

export const NOBLE_SCION_FLIGHT_NAME_RU = 'Полёт'
export const MINOR_WISH_NAME_RU = 'Малое желание'

export const GENIES_SPLENDOR_AC_LABEL_RU = 'Великолепие гения (без доспеха)'

/* ------------------------------------------------------------------ */
/* Feature / pool / pick ids                                           */
/* ------------------------------------------------------------------ */

export const GENIE_SPELLS_FEATURE_ID = 'genie-spells'
export const ELEMENTAL_SMITE_FEATURE_ID = 'elemental-smite'
export const GENIES_SPLENDOR_FEATURE_ID = 'genies-splendor'
export const AURA_OF_ELEMENTAL_SHIELDING_FEATURE_ID = 'aura-of-elemental-shielding'
export const ELEMENTAL_REBUKE_FEATURE_ID = 'elemental-rebuke'
export const NOBLE_SCION_FEATURE_ID = 'noble-scion'

export const ELEMENTAL_REBUKE_POOL_ID = 'elemental_rebuke'
export const NOBLE_SCION_POOL_ID = 'noble_scion'

export const GENIES_SPLENDOR_SKILL_PICK = 'genies_splendor_skill'
export const ELEMENTAL_SHIELDING_TYPE_PICK = 'elemental_shielding_type'
export const NOBLE_SCION_ACTIVE_PICK = 'noble_scion_active'

export const GENIES_SPLENDOR_SKILLS_2024 = [
  'acrobatics',
  'performance',
  'intimidation',
  'persuasion',
] as const

export const GENIES_SPLENDOR_SKILL_LABELS_RU: Record<string, string> = {
  acrobatics: 'Акробатика',
  performance: 'Выступление',
  intimidation: 'Запугивание',
  persuasion: 'Убеждение',
}

export const ELEMENTAL_SHIELDING_TYPES_2024 = [
  'thunder',
  'acid',
  'fire',
  'cold',
  'lightning',
] as const

export type ElementalShieldingType2024 = (typeof ELEMENTAL_SHIELDING_TYPES_2024)[number]

export const ELEMENTAL_SHIELDING_TYPE_LABELS_RU: Record<ElementalShieldingType2024, string> = {
  thunder: 'Звук',
  acid: 'Кислота',
  fire: 'Огонь',
  cold: 'Холод',
  lightning: 'Электричество',
}

export const ELEMENTAL_SMITE_MODES_2024 = [
  'marid',
  'dao',
  'djinn',
  'efreet',
] as const

export type ElementalSmiteMode2024 = (typeof ELEMENTAL_SMITE_MODES_2024)[number]

export const ELEMENTAL_SMITE_MODE_LABELS_RU: Record<ElementalSmiteMode2024, string> = {
  marid: MARID_SURGE_NAME_RU,
  dao: DAO_PRESSURE_NAME_RU,
  djinn: DJINN_ESCAPE_NAME_RU,
  efreet: EFREET_FURY_NAME_RU,
}

export const geniesSplendorSkillChoice2024: FeatureChoiceDef = {
  id: GENIES_SPLENDOR_SKILL_PICK,
  label_ru: `${GENIES_SPLENDOR_NAME_RU}: навык`,
  max_picks: 1,
  options: [...GENIES_SPLENDOR_SKILLS_2024],
  option_labels_ru: GENIES_SPLENDOR_SKILL_LABELS_RU,
}

export const elementalShieldingTypeChoice2024: FeatureChoiceDef = {
  id: ELEMENTAL_SHIELDING_TYPE_PICK,
  label_ru: `${AURA_OF_ELEMENTAL_SHIELDING_NAME_RU}: тип урона`,
  max_picks: 1,
  options: [...ELEMENTAL_SHIELDING_TYPES_2024],
  option_labels_ru: ELEMENTAL_SHIELDING_TYPE_LABELS_RU,
}

/* ------------------------------------------------------------------ */
/* Feature ids by level                                                */
/* ------------------------------------------------------------------ */

export function paladinBookFeatureIdsAtLevel2024(
  slug: string | null | undefined,
  level: number,
): string[] {
  if (!isOathOfTheNobleGenies2024(slug)) return []
  const lv = Math.max(0, Math.floor(level))
  const out: string[] = []
  if (lv >= 3) {
    out.push(ELEMENTAL_SMITE_FEATURE_ID, GENIE_SPELLS_FEATURE_ID, GENIES_SPLENDOR_FEATURE_ID)
  }
  if (lv >= 7) out.push(AURA_OF_ELEMENTAL_SHIELDING_FEATURE_ID)
  if (lv >= 15) out.push(ELEMENTAL_REBUKE_FEATURE_ID)
  if (lv >= 20) out.push(NOBLE_SCION_FEATURE_ID)
  return out
}

export function genieAlwaysPrepared2024(paladinLevel: number): string[] {
  return alwaysPreparedForSubclass2024(
    OATH_OF_THE_NOBLE_GENIES_SLUG,
    Math.max(0, Math.floor(paladinLevel)),
  )
}

export function elementalRebukePoolMax2024(chaMod: number): number {
  return Math.max(1, Math.floor(chaMod))
}

export function elementalRebukeDamageFormulaRu2024(chaMod: number): string {
  const mod = Math.floor(chaMod)
  const bonus = mod === 0 ? '' : mod > 0 ? `+${mod}` : `${mod}`
  return `2к10${bonus}`
}

export function geniesSplendorAcFormula2024(chaMod: number): {
  key: string
  label: string
  base: number
  dexCap: number | null
  allowsShield: boolean
} {
  return {
    key: 'genies_splendor',
    label: GENIES_SPLENDOR_AC_LABEL_RU,
    base: 10 + Math.floor(chaMod),
    dexCap: null,
    allowsShield: true,
  }
}

export function hasGeniesSplendor2024(features: Array<{ id?: string }>): boolean {
  return features.some((f) => {
    const id = String(f.id || '')
      .trim()
      .toLowerCase()
      .replace(/-/g, '_')
    return id === 'genies_splendor'
  })
}

export function hasAuraOfElementalShielding2024(features: Array<{ id?: string }>): boolean {
  return features.some((f) => {
    const id = String(f.id || '')
      .trim()
      .toLowerCase()
      .replace(/-/g, '_')
    return id === 'aura_of_elemental_shielding'
  })
}

export function paladinBookCreatePicksNeed2024(input: {
  classSlug: string
  paladinLevel: number
  subclassSlug: string
  classOptionPicks: Record<string, unknown>
}): {
  paladinLevel: number
  subclassSlug: string
  geniesSkill: boolean
  any: boolean
} {
  if (input.classSlug !== 'paladin') {
    return { paladinLevel: 0, subclassSlug: '', geniesSkill: false, any: false }
  }
  const subclass = String(input.subclassSlug || '').toLowerCase()
  const open = subclass === OATH_OF_THE_NOBLE_GENIES_SLUG && input.paladinLevel >= 3
  return {
    paladinLevel: input.paladinLevel,
    subclassSlug: subclass,
    geniesSkill: open,
    any: open,
  }
}

function readSingle(
  picks: FeaturePicksState | null | undefined,
  classEntryId: string,
  featureId: string,
  choiceId: string,
  allowed: readonly string[],
): string | null {
  if (!picks) return null
  const raw =
    getFeatureChoicePick(picksOrEmpty(picks), classEntryId, featureId, choiceId) ??
    getFeaturePick(picksOrEmpty(picks), classEntryId, choiceId) ??
    getFeaturePick(picksOrEmpty(picks), classEntryId, featureId)
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
  const normalizedAllowed = allowed.map((a) => a.replace(/-/g, '_'))
  const idx = normalizedAllowed.indexOf(key)
  return idx >= 0 ? allowed[idx]! : null
}

export function readGeniesSplendorSkill2024(
  picks: FeaturePicksState | null | undefined,
  classEntryId: string,
): string | null {
  return readSingle(
    picks,
    classEntryId,
    GENIES_SPLENDOR_FEATURE_ID,
    GENIES_SPLENDOR_SKILL_PICK,
    GENIES_SPLENDOR_SKILLS_2024,
  )
}

export function readElementalShieldingType2024(
  picks: FeaturePicksState | null | undefined,
  classEntryId: string,
): ElementalShieldingType2024 | null {
  const raw = readSingle(
    picks,
    classEntryId,
    AURA_OF_ELEMENTAL_SHIELDING_FEATURE_ID,
    ELEMENTAL_SHIELDING_TYPE_PICK,
    ELEMENTAL_SHIELDING_TYPES_2024,
  )
  return (raw as ElementalShieldingType2024 | null) ?? null
}

export function elementalSmiteModeFeedRu2024(mode: ElementalSmiteMode2024): string {
  switch (mode) {
    case 'marid':
      return `${MARID_SURGE_NAME_RU}: цель кары + выбранные существа в 10-фт. эманации — спас Силы; провал — отталкивание 15 фт. и Опрокинутый`
    case 'dao':
      return `${DAO_PRESSURE_NAME_RU}: цель кары — Схваченный (Сл = Сл закл. паладина) и Опутанный, пока схвачена`
    case 'djinn':
      return `${DJINN_ESCAPE_NAME_RU}: телепорт 30 фт.; до конца следующего хода — сопротивление дроб./кол./руб. и иммунитет к Опрокинутый/Опутанный/Схваченный`
    case 'efreet':
      return `${EFREET_FURY_NAME_RU}: цель кары + 2к4 огня; вторая цель в 30 фт. тоже 2к4 огня`
  }
}
