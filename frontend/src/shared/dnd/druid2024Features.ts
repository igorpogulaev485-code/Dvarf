/**
 * Druid 2024 (PHB): Primal Order, Wild Shape (uses, known forms, Circle of the Moon forms),
 * Wild Resurgence, Elemental Fury, Beast Spells, Archdruid, PHB circle features
 * (Land, Moon, Sea, Stars).
 *
 * Callers MUST branch on `rules_edition === '2024'`; nothing here feeds the 2014 pack
 * (`druid_2014.json`, 2014 Wild Shape CR/swim/fly table). Never touch 2014 packs.
 * Names follow next.dnd.su.
 */

import type { FeatureChoiceDef } from './classFeatures'
import { potentSpellcastingBonusForSheet2024 } from './cleric2024Features'
import {
  getFeaturePick,
  setFeaturePick,
  type FeaturePicksState,
} from './featurePicks'
import { parseFeatureResourceId } from './featureResources'
import { clampResource, type SheetResource } from './rest'

/* ------------------------------------------------------------------ */
/* Names (RU, next.dnd.su)                                             */
/* ------------------------------------------------------------------ */

export const PRIMAL_ORDER_NAME_RU = 'Природный орден'
export const PRIMAL_ORDER_MAGICIAN_NAME_RU = 'Ведун'
export const PRIMAL_ORDER_WARDEN_NAME_RU = 'Страж'
export const WILD_SHAPE_NAME_RU = 'Дикий облик'
export const WILD_COMPANION_NAME_RU = 'Дикий спутник'
export const WILD_RESURGENCE_NAME_RU = 'Дикое восстановление'
export const ELEMENTAL_FURY_NAME_RU = 'Ярость стихий'
export const POTENT_SPELLCASTING_NAME_RU = 'Мощные заклинания'
export const PRIMAL_STRIKE_NAME_RU = 'Природный удар'
export const IMPROVED_ELEMENTAL_FURY_NAME_RU = 'Улучшенная ярость стихий'
export const BEAST_SPELLS_NAME_RU = 'Звериные заклинания'
export const ARCHDRUID_NAME_RU = 'Архидруид'
export const EVERGREEN_WILD_SHAPE_NAME_RU = 'Неувядающий дикий облик'
export const NATURE_MAGICIAN_NAME_RU = 'Природный ворожей'
export const LONGEVITY_NAME_RU = 'Долголетие'

export const CIRCLE_FORMS_NAME_RU = 'Облики Круга'
export const LANDS_AID_NAME_RU = 'Помощь земли'
export const CIRCLE_OF_THE_LAND_SPELLS_NAME_RU = 'Заклинания круга земли'
export const WRATH_OF_THE_SEA_NAME_RU = 'Гнев морей'
export const STARRY_FORM_NAME_RU = 'Звёздный облик'

export const DRUID_CLASS_SLUG_2024 = 'druid'

export const PRIMAL_ORDER_FEATURE_ID = 'primal-order'
export const WILD_SHAPE_FEATURE_ID = 'wild-shape'
export const WILD_RESURGENCE_FEATURE_ID = 'wild-resurgence'
export const ELEMENTAL_FURY_FEATURE_ID = 'elemental-fury'
export const BEAST_SPELLS_FEATURE_ID = 'beast-spells'
export const EVERGREEN_WILD_SHAPE_FEATURE_ID = 'evergreen-wild-shape'
export const NATURE_MAGICIAN_FEATURE_ID = 'nature-magician'
export const LONGEVITY_FEATURE_ID = 'longevity'
export const LANDS_AID_FEATURE_ID = 'lands-aid'
export const WRATH_OF_THE_SEA_FEATURE_ID = 'wrath-of-the-sea'
export const STARRY_FORM_FEATURE_ID = 'starry-form'

export const DRUID_SUBCLASS_SLUGS_2024 = {
  land: 'druid__land',
  moon: 'druid__moon',
  sea: 'druid__sea',
  stars: 'druid__stars',
} as const

/** Shared pools (see `buildSubclassResources2024` / class resource table). */
export const WILD_SHAPE_POOL_ID = 'wild_shape'
export const NATURE_MAGICIAN_POOL_ID = 'nature_magician'

export const WILD_SHAPE_MIN_LEVEL_2024 = 2
export const WILD_RESURGENCE_MIN_LEVEL_2024 = 5
export const ELEMENTAL_FURY_MIN_LEVEL_2024 = 7
export const IMPROVED_ELEMENTAL_FURY_MIN_LEVEL_2024 = 15
export const BEAST_SPELLS_MIN_LEVEL_2024 = 18
export const ARCHDRUID_MIN_LEVEL_2024 = 20
export const DRUID_SUBCLASS_MIN_LEVEL_2024 = 3
export const LANDS_AID_MIN_LEVEL_2024 = DRUID_SUBCLASS_MIN_LEVEL_2024

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function lvl(value: number): number {
  return Math.max(0, Math.floor(value || 0))
}

function mod(value: number | undefined): number {
  return Math.floor(value ?? 0)
}

function signedBonus(value: number): string {
  if (value > 0) return `+${value}`
  if (value < 0) return `${value}`
  return ''
}

/** `2к8+4`, `4к6`, `1к8-1`. */
export function diceFormulaRu2024(count: number, die: number, bonus = 0): string {
  return `${Math.max(0, Math.floor(count))}к${die}${signedBonus(Math.floor(bonus))}`
}

export function isDruidClassSlug(slug: string | null | undefined): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return key === DRUID_CLASS_SLUG_2024 || /друид/.test(key)
}

function isMoonSubclass(subclassSlug: string | null | undefined): boolean {
  return (subclassSlug ?? '').trim().toLowerCase() === DRUID_SUBCLASS_SLUGS_2024.moon
}

function isPicksState(value: unknown): value is FeaturePicksState {
  if (!value || typeof value !== 'object') return false
  const values = (value as { values?: unknown }).values
  return Boolean(values) && typeof values === 'object' && !Array.isArray(values)
}

/* ------------------------------------------------------------------ */
/* Primal Order                                                        */
/* ------------------------------------------------------------------ */

export const PRIMAL_ORDER_MAGICIAN = 'magician'
export const PRIMAL_ORDER_WARDEN = 'warden'
export const PRIMAL_ORDER_PICK_ID_2024 = 'primal_order'

export type PrimalOrder2024 = typeof PRIMAL_ORDER_MAGICIAN | typeof PRIMAL_ORDER_WARDEN

export const PRIMAL_ORDER_OPTIONS_2024: ReadonlyArray<{
  id: PrimalOrder2024
  nameRu: string
  summaryRu: string
}> = [
  {
    id: PRIMAL_ORDER_MAGICIAN,
    nameRu: PRIMAL_ORDER_MAGICIAN_NAME_RU,
    summaryRu:
      'Один дополнительный заговор друида; бонус к Природе и Магии (оба навыка) = мод. Мудрости (мин. +1).',
  },
  {
    id: PRIMAL_ORDER_WARDEN,
    nameRu: PRIMAL_ORDER_WARDEN_NAME_RU,
    summaryRu: 'Тренировка с воинским оружием и средними доспехами.',
  },
]

function normalizePrimalOrder(raw: unknown): PrimalOrder2024 | null {
  const key = String(raw ?? '').trim().toLowerCase()
  if (key === PRIMAL_ORDER_MAGICIAN) return PRIMAL_ORDER_MAGICIAN
  if (key === PRIMAL_ORDER_WARDEN) return PRIMAL_ORDER_WARDEN
  return null
}

/**
 * Read Primal Order from `class_options_2024.primal_order` or from feature picks
 * (`{classEntryId}:primal_order` / `primal-order`). Pass `classEntryId` with picks.
 */
export function readPrimalOrder2024(
  source: unknown,
  classEntryId?: string | null,
): PrimalOrder2024 | null {
  if (!source || typeof source !== 'object') return null
  if (isPicksState(source)) {
    const entry = (classEntryId ?? '').trim()
    if (entry) {
      return (
        normalizePrimalOrder(getFeaturePick(source, entry, PRIMAL_ORDER_PICK_ID_2024)) ??
        normalizePrimalOrder(getFeaturePick(source, entry, PRIMAL_ORDER_FEATURE_ID))
      )
    }
    for (const [key, value] of Object.entries(source.values)) {
      const featureId = key.slice(key.lastIndexOf(':') + 1)
      if (featureId === PRIMAL_ORDER_PICK_ID_2024 || featureId === PRIMAL_ORDER_FEATURE_ID) {
        const found = normalizePrimalOrder(value)
        if (found) return found
      }
    }
    return null
  }
  return normalizePrimalOrder((source as Record<string, unknown>).primal_order)
}

/**
 * Magician (Ведун): the bonus applies to BOTH Nature AND Arcana (not «choose one»).
 * Bonus = Wisdom modifier, minimum +1.
 */
export function magicianSkillBonus2024(wisMod: number): { nature: number; arcana: number } {
  const bonus = Math.max(1, mod(wisMod))
  return { nature: bonus, arcana: bonus }
}

/** Magician: one extra druid cantrip. */
export function magicianExtraCantrips2024(): number {
  return 1
}

/** Warden (Страж): martial weapons + medium armor. No heavy armor, no Weapon Mastery. */
export function wardenGrants2024(): {
  martialWeapons: true
  mediumArmor: true
  heavyArmor: false
  weaponMastery: false
} {
  return { martialWeapons: true, mediumArmor: true, heavyArmor: false, weaponMastery: false }
}

/* ------------------------------------------------------------------ */
/* Wild Shape                                                          */
/* ------------------------------------------------------------------ */

/** Wild Shape uses: 2 at L2, 3 at L6, 4 at L17. */
export function wildShapeUsesMax2024(druidLevel: number): number {
  const level = lvl(druidLevel)
  if (level >= 17) return 4
  if (level >= 6) return 3
  if (level >= WILD_SHAPE_MIN_LEVEL_2024) return 2
  return 0
}

/** Known forms: 4 at L2, 6 at L4, 8 at L8. */
export function knownFormsBudget2024(level: number): number {
  const lv = lvl(level)
  if (lv >= 8) return 8
  if (lv >= 4) return 6
  if (lv >= WILD_SHAPE_MIN_LEVEL_2024) return 4
  return 0
}

export type BeastFormCapRow = {
  minLevel: number
  /** Max challenge rating (0.25 = 1/4). */
  crMax: number
  crLabelRu: string
  flyAllowed: boolean
}

/** Base form table: CR ≤ 1/4 (no Fly) → CR ≤ 1/2 (no Fly) → CR ≤ 1 (Fly ok). */
export const BEAST_FORM_CAPS_2024: ReadonlyArray<BeastFormCapRow> = [
  { minLevel: 2, crMax: 0.25, crLabelRu: '1/4', flyAllowed: false },
  { minLevel: 4, crMax: 0.5, crLabelRu: '1/2', flyAllowed: false },
  { minLevel: 8, crMax: 1, crLabelRu: '1', flyAllowed: true },
]

export function crLabelRu2024(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(Math.max(0, Math.floor(cr)))
}

/** Circle of the Moon (Облики Круга): max CR = floor(druid level / 3). */
export function moonMaxCr2024(druidLevel: number): number {
  return Math.floor(lvl(druidLevel) / 3)
}

/** Temp HP on entering a form: druid level, or 3 × level for Circle of the Moon. */
export function wildShapeTempHp2024(druidLevel: number, subclassSlug?: string | null): number {
  const level = lvl(druidLevel)
  if (level < WILD_SHAPE_MIN_LEVEL_2024) return 0
  return isMoonSubclass(subclassSlug) ? level * 3 : level
}

/** Moon: AC = max(beast AC, 13 + Wis mod). Other circles keep the beast AC. */
export function wildShapeArmorClass2024(
  beastAc: number,
  wisMod: number,
  subclassSlug?: string | null,
): number {
  const beast = Math.floor(beastAc || 0)
  return isMoonSubclass(subclassSlug) ? Math.max(beast, 13 + mod(wisMod)) : beast
}

export type WildShapeLimits2024 = {
  uses: number
  knownForms: number
  crMax: number
  crLabelRu: string
  flyAllowed: boolean
  /** Swim speed is ALWAYS allowed from level 2 in 2024 (unlike the 2014 table). */
  swimAllowed: true
  tempHp: number
  moon: boolean
  /** Hit points of the beast are never used: the druid keeps their own HP. */
  keepOwnHp: true
}

export function wildShapeLimits2024(
  druidLevel: number,
  subclassSlug?: string | null,
): WildShapeLimits2024 {
  const level = lvl(druidLevel)
  const moon = isMoonSubclass(subclassSlug)
  let base: BeastFormCapRow | null = null
  for (const row of BEAST_FORM_CAPS_2024) {
    if (level >= row.minLevel) base = row
  }
  const moonCr = moon && level >= DRUID_SUBCLASS_MIN_LEVEL_2024 ? moonMaxCr2024(level) : 0
  const crMax = Math.max(base?.crMax ?? 0, moonCr)
  return {
    uses: wildShapeUsesMax2024(level),
    knownForms: knownFormsBudget2024(level),
    crMax,
    crLabelRu: level >= WILD_SHAPE_MIN_LEVEL_2024 ? crLabelRu2024(crMax) : '',
    flyAllowed: base?.flyAllowed ?? false,
    swimAllowed: true,
    tempHp: wildShapeTempHp2024(level, subclassSlug),
    moon,
    keepOwnHp: true,
  }
}

/** Whether a beast with this CR / movement can be chosen as a known form. */
export function isBeastFormAllowed2024(
  form: { cr: number; fly?: boolean },
  druidLevel: number,
  subclassSlug?: string | null,
): boolean {
  const limits = wildShapeLimits2024(druidLevel, subclassSlug)
  if (limits.knownForms <= 0) return false
  if (form.cr > limits.crMax) return false
  if (form.fly && !limits.flyAllowed) return false
  return true
}

/* ------------------------------------------------------------------ */
/* Elemental Fury                                                      */
/* ------------------------------------------------------------------ */

export const ELEMENTAL_FURY_PICK_ID_2024 = 'elemental-fury'
export const ELEMENTAL_FURY_POTENT_SPELLCASTING = 'potent_spellcasting'
export const ELEMENTAL_FURY_PRIMAL_STRIKE = 'primal_strike'

export type ElementalFuryPick2024 =
  | typeof ELEMENTAL_FURY_POTENT_SPELLCASTING
  | typeof ELEMENTAL_FURY_PRIMAL_STRIKE

/** FeatureChoice shape for `pendingFeatureChoices` (like cleric Blessed Strikes). */
export const elementalFuryChoice2024: FeatureChoiceDef = {
  id: ELEMENTAL_FURY_PICK_ID_2024,
  label_ru: ELEMENTAL_FURY_NAME_RU,
  options: [ELEMENTAL_FURY_POTENT_SPELLCASTING, ELEMENTAL_FURY_PRIMAL_STRIKE],
  option_labels_ru: {
    [ELEMENTAL_FURY_POTENT_SPELLCASTING]: POTENT_SPELLCASTING_NAME_RU,
    [ELEMENTAL_FURY_PRIMAL_STRIKE]: PRIMAL_STRIKE_NAME_RU,
  },
  max_picks: 1,
}

function normalizeElementalFury(raw: unknown): ElementalFuryPick2024 | null {
  const key = String(raw ?? '').trim().toLowerCase()
  if (key === ELEMENTAL_FURY_POTENT_SPELLCASTING || key === ELEMENTAL_FURY_PRIMAL_STRIKE) return key
  return null
}

/**
 * Elemental Fury pick: feature picks (`{classEntryId}:elemental_fury` / `elemental-fury`) first,
 * then `class_options_2024.elemental_fury` (create-at-N fallback).
 */
export function readElementalFury2024(
  picks: FeaturePicksState,
  classEntryId: string,
  classOptions?: unknown,
): ElementalFuryPick2024 | null {
  const fromPicks = normalizeElementalFury(
    getFeaturePick(picks, classEntryId, 'elemental_fury') ??
      getFeaturePick(picks, classEntryId, ELEMENTAL_FURY_PICK_ID_2024),
  )
  if (fromPicks) return fromPicks
  if (classOptions && typeof classOptions === 'object') {
    return normalizeElementalFury((classOptions as Record<string, unknown>).elemental_fury)
  }
  return null
}

/** Primal Strike: once per turn extra damage — 1d8 at 7–14, 2d8 at 15+. */
export function primalStrikeDice2024(druidLevel: number): number {
  const level = lvl(druidLevel)
  if (level >= IMPROVED_ELEMENTAL_FURY_MIN_LEVEL_2024) return 2
  if (level >= ELEMENTAL_FURY_MIN_LEVEL_2024) return 1
  return 0
}

export function primalStrikeFormulaRu2024(druidLevel: number): string {
  const count = primalStrikeDice2024(druidLevel)
  return count > 0 ? diceFormulaRu2024(count, 8) : ''
}

/** Potent Spellcasting (L7): + Wis mod to druid cantrip damage (minimum +0). */
export function potentSpellcastingCantripBonus2024(wisMod: number, druidLevel: number): number {
  if (lvl(druidLevel) < ELEMENTAL_FURY_MIN_LEVEL_2024) return 0
  return Math.max(0, mod(wisMod))
}

/** Improved Potent Spellcasting (L15): druid cantrips with range ≥ 10 ft gain +300 ft. */
export function potentSpellcastingRangeBonusFt2024(druidLevel: number): number {
  return lvl(druidLevel) >= IMPROVED_ELEMENTAL_FURY_MIN_LEVEL_2024 ? 300 : 0
}

/**
 * Wis-mod cantrip damage bonus for a sheet, or 0 when the character is not a 2024
 * druid (L7+) with the Potent Spellcasting pick.
 */
export function druidPotentSpellcastingBonusForSheet2024(input: {
  rulesEdition: string | null | undefined
  classes: ReadonlyArray<{ id: string; name: string; level: number }>
  featurePicks: FeaturePicksState
  classOptions?: unknown
  wisScore: number | null | undefined
}): number {
  if (String(input.rulesEdition ?? '2014').trim() !== '2024') return 0
  const druid = input.classes.find((row) => /друид|druid/i.test(row.name))
  if (!druid) return 0
  if (
    readElementalFury2024(input.featurePicks, druid.id, input.classOptions) !==
    ELEMENTAL_FURY_POTENT_SPELLCASTING
  ) {
    return 0
  }
  const wisMod = Math.floor(((input.wisScore ?? 10) - 10) / 2)
  return potentSpellcastingCantripBonus2024(wisMod, druid.level)
}

export type PotentSpellcastingSheet2024 = { bonus: number; classSlug: 'cleric' | 'druid' }

/** Cantrip damage bonus from Potent Spellcasting, whichever class (cleric / druid) holds the pick. */
export function potentSpellcastingForSheet2024(input: {
  rulesEdition: string | null | undefined
  classes: ReadonlyArray<{ id: string; name: string; level: number }>
  featurePicks: FeaturePicksState
  classOptions?: unknown
  wisScore: number | null | undefined
}): PotentSpellcastingSheet2024 {
  const cleric = potentSpellcastingBonusForSheet2024(input)
  if (cleric > 0) return { bonus: cleric, classSlug: 'cleric' }
  const druid = druidPotentSpellcastingBonusForSheet2024(input)
  return druid > 0 ? { bonus: druid, classSlug: 'druid' } : { bonus: 0, classSlug: 'cleric' }
}

export function primalStrikeAttackRiderRu2024(druidLevel: number): string {
  const formula = primalStrikeFormulaRu2024(druidLevel)
  if (!formula) return ''
  return `${PRIMAL_STRIKE_NAME_RU}: +${formula} урона холодом, огнём, электричеством или звуком (раз за ход, попадание оружием или атакой Дикого облика)`
}

export function potentSpellcastingCantripRiderRu2024(wisMod: number, druidLevel: number): string {
  const bonus = potentSpellcastingCantripBonus2024(wisMod, druidLevel)
  if (lvl(druidLevel) < ELEMENTAL_FURY_MIN_LEVEL_2024) return ''
  const range = potentSpellcastingRangeBonusFt2024(druidLevel)
  const tail = range > 0 ? `; дальность заговоров от 10 фт. +${range} фт.` : ''
  return `${POTENT_SPELLCASTING_NAME_RU}: +${bonus} к урону заговоров друида${tail}`
}

/* ------------------------------------------------------------------ */
/* Beast Spells / Archdruid                                            */
/* ------------------------------------------------------------------ */

/** Beast Spells (L18): cast spells while in Wild Shape form. */
export function beastSpellsActive2024(druidLevel: number): boolean {
  return lvl(druidLevel) >= BEAST_SPELLS_MIN_LEVEL_2024
}

export function archdruidActive2024(druidLevel: number): boolean {
  return lvl(druidLevel) >= ARCHDRUID_MIN_LEVEL_2024
}

/** Nature Magician: each Wild Shape use converted gives 2 spell slot levels. */
export const NATURE_MAGICIAN_LEVELS_PER_USE_2024 = 2

export function natureMagicianSlotLevel2024(wildShapeUsesSpent: number): number {
  return Math.max(0, Math.floor(wildShapeUsesSpent || 0)) * NATURE_MAGICIAN_LEVELS_PER_USE_2024
}

/* ------------------------------------------------------------------ */
/* Subclass helpers                                                    */
/* ------------------------------------------------------------------ */

export const LAND_TERRAINS_2024 = [
  { id: 'arid', nameRu: 'Засушливая' },
  { id: 'polar', nameRu: 'Полярная' },
  { id: 'temperate', nameRu: 'Умеренная' },
  { id: 'tropical', nameRu: 'Тропическая' },
] as const

export type LandTerrain2024 = (typeof LAND_TERRAINS_2024)[number]['id']

export const LAND_TERRAIN_PICK_ID_2024 = 'circle_spells_land'

/** FeatureChoice for the Circle of the Land terrain card (`{classEntryId}:circle_spells_land`). */
export const landTerrainChoice2024: FeatureChoiceDef = {
  id: LAND_TERRAIN_PICK_ID_2024,
  label_ru: 'Местность',
  options: LAND_TERRAINS_2024.map((row) => row.id),
  option_labels_ru: Object.fromEntries(LAND_TERRAINS_2024.map((row) => [row.id, row.nameRu])),
  max_picks: 1,
}

/** Terrain pick per class entry: feature picks first, then `class_options_2024.land_choice`. */
export function landChoiceByEntryId2024(
  classes: ReadonlyArray<{ id: string }>,
  picks: FeaturePicksState,
  classOptions?: unknown,
): Record<string, string | null> {
  const fromOptions =
    classOptions && typeof classOptions === 'object'
      ? String((classOptions as Record<string, unknown>).land_choice ?? '').trim().toLowerCase()
      : ''
  const out: Record<string, string | null> = {}
  for (const row of classes) {
    const pick = (getFeaturePick(picks, row.id, LAND_TERRAIN_PICK_ID_2024) ?? '')
      .trim()
      .toLowerCase()
    const found = LAND_TERRAINS_2024.find((item) => item.id === pick || item.id === fromOptions)
    out[row.id] = found ? found.id : null
  }
  return out
}

export function landTerrainNameRu2024(id: string | null | undefined): string {
  const key = (id ?? '').trim().toLowerCase()
  return LAND_TERRAINS_2024.find((row) => row.id === key)?.nameRu ?? ''
}

/** Land's Aid d6 ladder: 2 / 3 / 4 dice at druid levels 3 / 10 / 14. */
export function landsAidDiceCount2024(druidLevel: number): number {
  const level = lvl(druidLevel)
  if (level >= 14) return 4
  if (level >= 10) return 3
  if (level >= LANDS_AID_MIN_LEVEL_2024) return 2
  return 0
}

export function landsAidFormulaRu2024(druidLevel: number): string {
  const count = landsAidDiceCount2024(druidLevel)
  return count > 0 ? diceFormulaRu2024(count, 6) : ''
}

/** Wrath of the Sea: Wisdom modifier d6 (minimum 1) cold damage. */
export function wrathOfTheSeaDiceCount2024(wisMod: number): number {
  return Math.max(1, mod(wisMod))
}

export function wrathOfTheSeaFormulaRu2024(wisMod: number): string {
  return diceFormulaRu2024(wrathOfTheSeaDiceCount2024(wisMod), 6)
}

export const STARRY_FORMS_2024 = [
  { id: 'archer', nameRu: 'Лучник' },
  { id: 'chalice', nameRu: 'Чаша' },
  { id: 'dragon', nameRu: 'Дракон' },
] as const

export type StarryForm2024 = (typeof STARRY_FORMS_2024)[number]['id']

export const STARRY_FORM_ACTIVE_PICK_ID_2024 = 'starry_form_active'

/** Archer / Chalice: 1d8 + Wis, 2d8 + Wis from level 10. */
export function starryFormDiceCount2024(druidLevel: number): number {
  const level = lvl(druidLevel)
  if (level >= 10) return 2
  if (level >= 3) return 1
  return 0
}

export function starryFormFormulaRu2024(druidLevel: number, wisMod: number): string {
  const count = starryFormDiceCount2024(druidLevel)
  if (count <= 0) return ''
  return diceFormulaRu2024(count, 8, mod(wisMod))
}

/* ------------------------------------------------------------------ */
/* Card buttons / feature id routing                                   */
/* ------------------------------------------------------------------ */

/** Card buttons on ClassFeaturesPanel (edition 2024 only). */
export const DRUID_2024_CARD_BUTTONS: Record<string, string> = {
  archdruid: 'Архидруид…',
  'wild-shape': 'Облик…',
  wild_shape: 'Облик…',
  'wild-resurgence': 'Восстановление…',
  wild_resurgence: 'Восстановление…',
  'evergreen-wild-shape': 'Неувядающий дикий облик',
  evergreen_wild_shape: 'Неувядающий дикий облик',
  'nature-magician': 'Природный ворожей…',
  nature_magician: 'Природный ворожей…',
  'lands-aid': 'Помощь земли…',
  lands_aid: 'Помощь земли…',
  'wrath-of-the-sea': 'Гнев морей…',
  wrath_of_the_sea: 'Гнев морей…',
  'starry-form': 'Звёздный облик…',
  starry_form: 'Звёздный облик…',
}

const DRUID_USE_FEATURE_IDS = new Set([
  'archdruid',
  'wild-shape',
  'wild-resurgence',
  'evergreen-wild-shape',
  'nature-magician',
  'lands-aid',
  'wrath-of-the-sea',
  'starry-form',
])

/** Normalize feature ids that open the dialog (`_` → `-`). */
export function druid2024UseFeatureId(featureId: string | null | undefined): string | null {
  if (!featureId) return null
  const key = featureId.trim().replace(/_/g, '-')
  return DRUID_USE_FEATURE_IDS.has(key) ? key : null
}

/**
 * Formula shown on a feature card (Land's Aid, Wrath of the Sea, Primal Strike). Empty when the
 * feature has no formula or the pick does not apply.
 */
export function druid2024CardFormulaRu(input: {
  featureId: string
  druidLevel: number
  wisMod: number
  elementalFury?: ElementalFuryPick2024 | null
}): string {
  const id = input.featureId.trim().replace(/_/g, '-')
  if (id === 'lands-aid') return landsAidFormulaRu2024(input.druidLevel)
  if (id === 'wrath-of-the-sea') return wrathOfTheSeaFormulaRu2024(input.wisMod)
  if (id === 'elemental-fury' || id === 'improved-elemental-fury') {
    return input.elementalFury === ELEMENTAL_FURY_PRIMAL_STRIKE
      ? primalStrikeFormulaRu2024(input.druidLevel)
      : ''
  }
  return ''
}

/* ------------------------------------------------------------------ */
/* Resource lookup / rest                                              */
/* ------------------------------------------------------------------ */

export function findDruidPool2024(
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
    const druid = resources.find((row) => {
      const parsed = parseFeatureResourceId(row.id)
      return parsed?.poolId === poolId && parsed.classSlug === DRUID_CLASS_SLUG_2024
    })
    if (druid) return druid
  }
  return resources.find(matches) ?? null
}

export function findWildShapeResource2024(
  resources: SheetResource[],
  classEntryId?: string,
): SheetResource | null {
  return findDruidPool2024(resources, WILD_SHAPE_POOL_ID, classEntryId)
}

function patchRow(
  resources: SheetResource[],
  id: string,
  patch: (row: SheetResource) => SheetResource,
): SheetResource[] {
  return resources.map((row) => (row.id === id ? clampResource(patch(row)) : row))
}

/** Spend one Wild Shape use (bonus action). */
export function spendWildShapeUse2024(
  resources: SheetResource[],
  classEntryId?: string,
): { ok: true; resources: SheetResource[] } | { ok: false; message: string } {
  const row = findWildShapeResource2024(resources, classEntryId)
  if (!row) return { ok: false, message: `Ресурс «${WILD_SHAPE_NAME_RU}» не найден` }
  if (row.used >= row.max) {
    return {
      ok: false,
      message: `${WILD_SHAPE_NAME_RU}: использования закончились (короткий отдых вернёт одно, долгий — все)`,
    }
  }
  return { ok: true, resources: patchRow(resources, row.id, (item) => ({ ...item, used: item.used + 1 })) }
}

/** Return `count` Wild Shape uses (Wild Resurgence, Evergreen Wild Shape). */
export function returnWildShapeUses2024(
  resources: SheetResource[],
  count = 1,
  classEntryId?: string,
): SheetResource[] {
  const row = findWildShapeResource2024(resources, classEntryId)
  if (!row) return resources
  const n = Math.max(0, Math.floor(count))
  return patchRow(resources, row.id, (item) => ({ ...item, used: Math.max(0, item.used - n) }))
}

/** Short rest regains 1 use; long rest regains all. */
export function restWildShape2024(
  resources: SheetResource[],
  kind: 'short' | 'long',
  classEntryId?: string,
): SheetResource[] {
  const row = findWildShapeResource2024(resources, classEntryId)
  if (!row) return resources
  return patchRow(resources, row.id, (item) => ({
    ...item,
    used: kind === 'long' ? 0 : Math.max(0, item.used - 1),
  }))
}

/** Temp HP granted by the current Wild Shape form; cleared when the form ends. */
export const WILD_SHAPE_TEMP_HP_PICK_ID_2024 = 'wild_shape_temp_hp'

export const WILD_SHAPE_EQUIPMENT_2024 = [
  { id: 'drop', nameRu: 'Падает на землю', noteRu: 'снаряжение упало на землю' },
  { id: 'merge', nameRu: 'Сливается с обликом', noteRu: 'снаряжение слилось с обликом' },
  { id: 'wear', nameRu: 'Надето на облик', noteRu: 'снаряжение надето на облик (по решению ДМ)' },
] as const

export type WildShapeEquipment2024 = (typeof WILD_SHAPE_EQUIPMENT_2024)[number]['id']

export const WILD_RESURGENCE_SLOT_USED_PICK_ID_2024 = 'wild_resurgence_slot_used'

export function wildResurgenceSlotUsed2024(picks: FeaturePicksState, classEntryId: string): boolean {
  return getFeaturePick(picks, classEntryId, WILD_RESURGENCE_SLOT_USED_PICK_ID_2024) === 'on'
}

export const NATURE_MAGICIAN_SPENT_PICK_ID_2024 = 'nature_magician_spent'

export function natureMagicianSpent2024(picks: FeaturePicksState, classEntryId: string): boolean {
  return getFeaturePick(picks, classEntryId, NATURE_MAGICIAN_SPENT_PICK_ID_2024) === 'on'
}

/** Long rest: Wild Resurgence slot conversion and Nature Magician become available again. */
export function resetDruid2024PicksOnLongRest(
  picks: FeaturePicksState,
  classEntryId: string,
): FeaturePicksState {
  let next = picks
  if (wildResurgenceSlotUsed2024(next, classEntryId)) {
    next = setFeaturePick(next, classEntryId, WILD_RESURGENCE_SLOT_USED_PICK_ID_2024, null)
  }
  if (natureMagicianSpent2024(next, classEntryId)) {
    next = setFeaturePick(next, classEntryId, NATURE_MAGICIAN_SPENT_PICK_ID_2024, null)
  }
  return next
}

/** Long rest upkeep for every druid class entry that holds a Druid 2024 pick. */
export function resetDruid2024PicksOnLongRestAll(picks: FeaturePicksState): FeaturePicksState {
  let next = picks
  const suffixes = [
    `:${WILD_RESURGENCE_SLOT_USED_PICK_ID_2024}`,
    `:${NATURE_MAGICIAN_SPENT_PICK_ID_2024}`,
  ]
  for (const key of Object.keys(picks.values)) {
    const suffix = suffixes.find((item) => key.endsWith(item))
    if (!suffix) continue
    next = resetDruid2024PicksOnLongRest(next, key.slice(0, -suffix.length))
  }
  return next
}

/* ------------------------------------------------------------------ */
/* Apply                                                               */
/* ------------------------------------------------------------------ */

export type Druid2024UseInput = {
  featureId: string
  resourceId: string | null
  resources: SheetResource[]
  classEntryId: string
  druidLevel: number
  subclassSlug?: string | null
  wisMod?: number
  /**
   * wild-resurgence: slot-to-shape | shape-to-slot
   * lands-aid: damage | heal
   * starry-form: archer | chalice | dragon
   */
  mode?: string | null
  /** wild-shape: AC of the chosen beast form (Moon: AC = max(beast AC, 13 + Wis)). */
  beastAc?: number
  /** wild-resurgence slot-to-shape: circle of the spell slot spent. */
  slotLevel?: number
  /** nature-magician: Wild Shape uses converted (2 slot levels per use). */
  usesToConvert?: number
  /** wild-resurgence slot-to-shape: already used this turn. */
  resurgenceUsedThisTurn?: boolean
  /** evergreen-wild-shape: called on an initiative roll. */
  onInitiative?: boolean
  featurePicks?: FeaturePicksState | null
}

export type Druid2024Patches = {
  featurePicks?: FeaturePicksState
  diceExpression?: string | null
  tempHp?: number
  /** Always true for Wild Shape: the beast hit points are never used. */
  keepOwnHp?: boolean
  armorClass?: number
  damageType?: string
  activeLabels?: string[]
  /** Spell slot circle the caller must spend. */
  spendSlotLevel?: number
  /** Spell slot circle the caller must create / restore. */
  gainSlotLevel?: number
  /** Caller should mark this Nature Magician use as spent until long rest. */
  natureMagicianSpent?: boolean
}

export type Druid2024UseResult = {
  ok: boolean
  resources: SheetResource[]
  feedLineRu: string
  message?: string
  patches?: Druid2024Patches
}

function poolRow(input: Druid2024UseInput, poolId: string): SheetResource | null {
  if (input.resourceId) {
    const byId = input.resources.find((row) => row.id === input.resourceId)
    if (byId && parseFeatureResourceId(byId.id)?.poolId === poolId) return byId
  }
  return findDruidPool2024(input.resources, poolId, input.classEntryId)
}

function ok(
  input: Druid2024UseInput,
  feedLineRu: string,
  extra: { resources?: SheetResource[]; patches?: Druid2024Patches } = {},
): Druid2024UseResult {
  return {
    ok: true,
    resources: extra.resources ?? input.resources,
    feedLineRu,
    ...(extra.patches ? { patches: extra.patches } : {}),
  }
}

function refuse(input: Druid2024UseInput, message: string): Druid2024UseResult {
  return { ok: false, resources: input.resources, feedLineRu: '', message }
}

function spendWildShape(input: Druid2024UseInput) {
  const row = poolRow(input, WILD_SHAPE_POOL_ID)
  if (!row) return { ok: false as const, result: refuse(input, `Ресурс «${WILD_SHAPE_NAME_RU}» не найден`) }
  if (row.used >= row.max) {
    return {
      ok: false as const,
      result: refuse(
        input,
        `${WILD_SHAPE_NAME_RU}: использования закончились (короткий отдых вернёт одно, долгий — все)`,
      ),
    }
  }
  return {
    ok: true as const,
    resources: patchRow(input.resources, row.id, (item) => ({ ...item, used: item.used + 1 })),
  }
}

function norm(featureId: string): string {
  return featureId.trim().replace(/_/g, '-')
}

export function applyDruid2024FeatureUse(input: Druid2024UseInput): Druid2024UseResult {
  const fid = druid2024UseFeatureId(input.featureId) ?? norm(input.featureId)
  const level = lvl(input.druidLevel)
  const wisMod = mod(input.wisMod)
  const picks = input.featurePicks ?? { values: {} }

  switch (fid) {
    case 'wild-shape': {
      if (level < WILD_SHAPE_MIN_LEVEL_2024) {
        return refuse(input, `${WILD_SHAPE_NAME_RU} со 2 уровня друида`)
      }
      const spent = spendWildShape(input)
      if (!spent.ok) return spent.result
      const limits = wildShapeLimits2024(level, input.subclassSlug)
      const patches: Druid2024Patches = {
        tempHp: limits.tempHp,
        keepOwnHp: true,
        ...(input.beastAc !== undefined
          ? { armorClass: wildShapeArmorClass2024(input.beastAc, wisMod, input.subclassSlug) }
          : limits.moon
            ? { armorClass: 13 + wisMod }
            : {}),
        activeLabels: [WILD_SHAPE_NAME_RU],
      }
      const ac = limits.moon ? `; КД = больший из КД зверя и 13 + Мудрость (${13 + wisMod})` : ''
      return ok(
        input,
        `${WILD_SHAPE_NAME_RU} (бонусное действие): известный облик зверя опасность ≤ ${limits.crLabelRu}${limits.flyAllowed ? '' : ', без скорости полёта'}; плавание разрешено; временные хиты ${limits.tempHp}; свои хиты сохраняются${ac}`,
        { resources: spent.resources, patches },
      )
    }

    case 'wild-resurgence': {
      if (level < WILD_RESURGENCE_MIN_LEVEL_2024) {
        return refuse(input, `${WILD_RESURGENCE_NAME_RU} с 5 уровня друида`)
      }
      const mode = input.mode === 'shape-to-slot' ? 'shape-to-slot' : 'slot-to-shape'
      const row = poolRow(input, WILD_SHAPE_POOL_ID)
      if (!row) return refuse(input, `Ресурс «${WILD_SHAPE_NAME_RU}» не найден`)

      if (mode === 'slot-to-shape') {
        if (row.used < row.max) {
          return refuse(input, `${WILD_RESURGENCE_NAME_RU}: доступно только когда не осталось использований «${WILD_SHAPE_NAME_RU}»`)
        }
        if (input.resurgenceUsedThisTurn) {
          return refuse(input, `${WILD_RESURGENCE_NAME_RU}: ячейку можно обменять только раз за ход`)
        }
        const slotLevel = Math.max(1, Math.floor(input.slotLevel ?? 1))
        return ok(
          input,
          `${WILD_RESURGENCE_NAME_RU}: ячейка ${slotLevel} круга → 1 использование «${WILD_SHAPE_NAME_RU}» (раз за ход, без действия)`,
          {
            resources: patchRow(input.resources, row.id, (item) => ({ ...item, used: Math.max(0, item.used - 1) })),
            patches: { spendSlotLevel: slotLevel },
          },
        )
      }

      if (wildResurgenceSlotUsed2024(picks, input.classEntryId)) {
        return refuse(input, `${WILD_RESURGENCE_NAME_RU}: обмен облика на ячейку уже использован (до долгого отдыха)`)
      }
      const spent = spendWildShape(input)
      if (!spent.ok) return spent.result
      return ok(
        input,
        `${WILD_RESURGENCE_NAME_RU}: использование «${WILD_SHAPE_NAME_RU}» → ячейка 1 круга (раз в долгий отдых)`,
        {
          resources: spent.resources,
          patches: {
            gainSlotLevel: 1,
            featurePicks: setFeaturePick(picks, input.classEntryId, WILD_RESURGENCE_SLOT_USED_PICK_ID_2024, 'on'),
          },
        },
      )
    }

    case 'evergreen-wild-shape': {
      if (level < ARCHDRUID_MIN_LEVEL_2024) {
        return refuse(input, `${EVERGREEN_WILD_SHAPE_NAME_RU} с 20 уровня друида`)
      }
      const row = poolRow(input, WILD_SHAPE_POOL_ID)
      if (!row) return refuse(input, `Ресурс «${WILD_SHAPE_NAME_RU}» не найден`)
      if (row.used < row.max) {
        return refuse(input, `${EVERGREEN_WILD_SHAPE_NAME_RU}: срабатывает, только когда использований «${WILD_SHAPE_NAME_RU}» не осталось`)
      }
      return ok(
        input,
        `${EVERGREEN_WILD_SHAPE_NAME_RU}: бросок инициативы → 1 использование «${WILD_SHAPE_NAME_RU}» возвращено`,
        { resources: returnWildShapeUses2024(input.resources, 1, input.classEntryId) },
      )
    }

    case 'nature-magician': {
      if (level < ARCHDRUID_MIN_LEVEL_2024) {
        return refuse(input, `${NATURE_MAGICIAN_NAME_RU} с 20 уровня друида`)
      }
      const pool = poolRow(input, NATURE_MAGICIAN_POOL_ID)
      if (pool && pool.used >= pool.max) {
        return refuse(input, `${NATURE_MAGICIAN_NAME_RU} уже использовано (до долгого отдыха)`)
      }
      if (!pool && natureMagicianSpent2024(picks, input.classEntryId)) {
        return refuse(input, `${NATURE_MAGICIAN_NAME_RU} уже использовано (до долгого отдыха)`)
      }
      const wild = poolRow(input, WILD_SHAPE_POOL_ID)
      if (!wild) return refuse(input, `Ресурс «${WILD_SHAPE_NAME_RU}» не найден`)
      const available = Math.max(0, wild.max - wild.used)
      const uses = Math.floor(input.usesToConvert ?? 1)
      if (uses < 1) return refuse(input, 'Потрать хотя бы одно использование облика')
      if (uses > available) {
        return refuse(input, `Доступно только ${available} использ. «${WILD_SHAPE_NAME_RU}»`)
      }
      const slotLevel = natureMagicianSlotLevel2024(uses)
      let resources = patchRow(input.resources, wild.id, (item) => ({ ...item, used: item.used + uses }))
      if (pool) resources = patchRow(resources, pool.id, (item) => ({ ...item, used: item.used + 1 }))
      return ok(
        input,
        `${NATURE_MAGICIAN_NAME_RU} (бонусное действие): ${uses} использ. «${WILD_SHAPE_NAME_RU}» → ячейка ${slotLevel} круга (2 уровня за использование; раз в долгий отдых)`,
        {
          resources,
          patches: {
            gainSlotLevel: slotLevel,
            natureMagicianSpent: true,
            ...(pool
              ? {}
              : {
                  featurePicks: setFeaturePick(
                    picks,
                    input.classEntryId,
                    NATURE_MAGICIAN_SPENT_PICK_ID_2024,
                    'on',
                  ),
                }),
          },
        },
      )
    }

    case 'lands-aid': {
      if (level < LANDS_AID_MIN_LEVEL_2024) {
        return refuse(input, `${LANDS_AID_NAME_RU} с 3 уровня друида`)
      }
      const spent = spendWildShape(input)
      if (!spent.ok) return spent.result
      const formula = landsAidFormulaRu2024(level)
      const mode = input.mode === 'heal' ? 'heal' : 'damage'
      return ok(
        input,
        mode === 'heal'
          ? `${LANDS_AID_NAME_RU}: ${formula} хитов лечения существу в 60 фт. (действие)`
          : `${LANDS_AID_NAME_RU}: ${formula} некротического урона, спас Тел — половина при успехе (60 фт.)`,
        {
          resources: spent.resources,
          patches: { diceExpression: formula, ...(mode === 'damage' ? { damageType: 'necrotic' } : {}) },
        },
      )
    }

    case 'wrath-of-the-sea': {
      if (level < DRUID_SUBCLASS_MIN_LEVEL_2024) {
        return refuse(input, `${WRATH_OF_THE_SEA_NAME_RU} с 3 уровня друида`)
      }
      const spent = spendWildShape(input)
      if (!spent.ok) return spent.result
      const formula = wrathOfTheSeaFormulaRu2024(wisMod)
      return ok(
        input,
        `${WRATH_OF_THE_SEA_NAME_RU} (бонусное действие): аура 5 фт.; ${formula} урона холодом, спас Тел — отталкивание при провале`,
        { resources: spent.resources, patches: { diceExpression: formula, damageType: 'cold' } },
      )
    }

    case 'starry-form': {
      if (level < DRUID_SUBCLASS_MIN_LEVEL_2024) {
        return refuse(input, `${STARRY_FORM_NAME_RU} с 3 уровня друида`)
      }
      const form = STARRY_FORMS_2024.find((row) => row.id === input.mode)
      if (!form) return refuse(input, 'Выбери созвездие: Лучник, Чаша или Дракон')
      const spent = spendWildShape(input)
      if (!spent.ok) return spent.result
      const formula = starryFormFormulaRu2024(level, wisMod)
      const line =
        form.id === 'archer'
          ? `${STARRY_FORM_NAME_RU}: «${form.nameRu}» — ${formula} урона излучением (дальняя атака заклинанием, бонусное действие)`
          : form.id === 'chalice'
            ? `${STARRY_FORM_NAME_RU}: «${form.nameRu}» — ${formula} хитов лечения (при сотворении заклинания лечения)`
            : `${STARRY_FORM_NAME_RU}: «${form.nameRu}» — преимущество на проверки Телосложения для концентрации`
      return ok(input, line, {
        resources: spent.resources,
        patches: {
          activeLabels: [`${STARRY_FORM_NAME_RU}: ${form.nameRu}`],
          ...(form.id === 'dragon' ? {} : { diceExpression: formula }),
          ...(form.id === 'archer' ? { damageType: 'radiant' } : {}),
          featurePicks: setFeaturePick(picks, input.classEntryId, STARRY_FORM_ACTIVE_PICK_ID_2024, form.id),
        },
      })
    }

    default:
      return refuse(input, `Умение «${input.featureId}» не настроено в диалоге 2024`)
  }
}
