/**
 * Wizard spellbook rules (PHB 2024) — pure helpers.
 *
 * Same copy tariffs as 2014 (foreign 50 gp / 2 h per level, own 10 gp / 1 h),
 * but school Savants no longer halve gold or time: they add free book spells
 * (two of level ≤ 2 with the subclass, one more for each new slot tier).
 * Never feeds the 2014 pack: callers branch on `rules_edition === '2024'`.
 */

import {
  copySpellCost,
  freeBookCap,
  freeBookSlotsAtLevel,
  type SpellbookCopyCost,
  type SpellbookCopyKind,
  type SpellbookModifiers,
} from './wizardSpellbook'

export { freeBookCap, freeBookSlotsAtLevel }

export type WizardSchoolKey2024 =
  | 'abjuration'
  | 'conjuration'
  | 'divination'
  | 'enchantment'
  | 'evocation'
  | 'illusion'
  | 'necromancy'
  | 'transmutation'

/** 2024 catalog slugs (and common aliases) → school key used in the spell catalog. */
const SCHOOL_BY_SUBCLASS_2024: Record<string, WizardSchoolKey2024> = {
  wizard__abjurer: 'abjuration',
  wizard__diviner: 'divination',
  wizard__evoker: 'evocation',
  wizard__illusionist: 'illusion',
  // AU book schools (P24-M02B-wizard) — same Savant free-book contour as PHB.
  wizard__conjurer: 'conjuration',
  wizard__enchanter: 'enchantment',
  wizard__necromancer: 'necromancy',
  wizard__transmuter: 'transmutation',
  abjurer: 'abjuration',
  diviner: 'divination',
  evoker: 'evocation',
  illusionist: 'illusion',
  conjurer: 'conjuration',
  enchanter: 'enchantment',
  necromancer: 'necromancy',
  transmuter: 'transmutation',
  оградитель: 'abjuration',
  прорицатель: 'divination',
  воплотитель: 'evocation',
  иллюзионист: 'illusion',
  призыватель: 'conjuration',
  очарователь: 'enchantment',
  некромант: 'necromancy',
  преобразователь: 'transmutation',
  school_of_abjuration: 'abjuration',
  school_of_conjuration: 'conjuration',
  school_of_divination: 'divination',
  school_of_enchantment: 'enchantment',
  school_of_evocation: 'evocation',
  school_of_illusion: 'illusion',
  school_of_necromancy: 'necromancy',
  school_of_transmutation: 'transmutation',
}

const SCHOOL_LABEL_RU: Record<WizardSchoolKey2024, string> = {
  abjuration: 'ограждение',
  conjuration: 'вызов',
  divination: 'прорицание',
  enchantment: 'очарование',
  evocation: 'воплощение',
  illusion: 'иллюзия',
  necromancy: 'некромантия',
  transmutation: 'преобразование',
}

export const WIZARD_SUBCLASS_LEVEL_2024 = 3

/** Level at which each new maximum spell-slot level appears (full caster table). */
const NEW_SLOT_TIER_BY_WIZARD_LEVEL: Record<number, number> = {
  1: 1,
  3: 2,
  5: 3,
  7: 4,
  9: 5,
  11: 6,
  13: 7,
  15: 8,
  17: 9,
}

function normalizeSlug(slug: string | null | undefined): string {
  return (slug ?? '').trim().toLowerCase().replace(/-/g, '_')
}

/** School key for a 2024 wizard subclass slug (`wizard__evoker`, …), else null. */
export function wizardSavantSchool(
  slug: string | null | undefined,
): WizardSchoolKey2024 | null {
  const raw = (slug ?? '').trim().toLowerCase()
  if (!raw) return null
  return SCHOOL_BY_SUBCLASS_2024[raw] ?? SCHOOL_BY_SUBCLASS_2024[normalizeSlug(raw)] ?? null
}

/** First candidate (catalog id, resolved slug, …) that maps to a wizard school, else null. */
export function pickWizardSavantSlug(
  ...candidates: Array<string | null | undefined>
): string | null {
  return candidates.find((slug) => wizardSavantSchool(slug)) ?? null
}

export function wizardSavantSchoolLabelRu(
  slug: string | null | undefined,
): string | null {
  const school = wizardSavantSchool(slug)
  return school ? SCHOOL_LABEL_RU[school] : null
}

/** Two school spells (level ≤ 2) added to the book free when the subclass is chosen. */
export function savantFreeBookSlotsOnSubclass(): number {
  return 2
}

/** One more free school spell for every new maximum slot level gained afterwards. */
export function savantFreeBookSlotOnNewTier(): number {
  return 1
}

/** Max spell level of the two free picks granted with the subclass. */
export const SAVANT_SUBCLASS_PICK_MAX_SPELL_LEVEL = 2

/** New highest spell-slot level gained at this wizard level, or null when none. */
export function newSlotTiersGainedAtWizardLevel(level: number): number | null {
  const lv = Math.floor(level)
  return NEW_SLOT_TIER_BY_WIZARD_LEVEL[lv] ?? null
}

/** Intelligence (Arcana) DC to copy a spell of this level from a scroll or book. */
export function scrollCopyDc(spellLevel: number): number {
  const lv = Math.min(9, Math.max(1, Math.floor(spellLevel) || 1))
  return 10 + lv
}

export type WizardCopyMods2024 = SpellbookModifiers & {
  savantLabelRu: string | null
  savantSchoolKey: WizardSchoolKey2024 | null
}

/**
 * Copy-cost mods for a 2024 wizard. `savantSchool` stays null on purpose:
 * the shared tariff would halve cost for it, and 2024 Savants do not.
 */
export function resolveWizardCopyMods2024(input: {
  subclassSlug: string | null | undefined
  wizardLevel: number
}): WizardCopyMods2024 {
  const level = Math.max(0, Math.floor(input.wizardLevel) || 0)
  const school = level >= WIZARD_SUBCLASS_LEVEL_2024 ? wizardSavantSchool(input.subclassSlug) : null
  return {
    savantSchool: null,
    wizardlyQuill: false,
    savantSchoolKey: school,
    savantLabelRu: school ? SCHOOL_LABEL_RU[school] : null,
  }
}

/** Copy cost without any Savant discount (2024). */
export function copySpellCost2024(input: {
  spellLevel: number
  kind: SpellbookCopyKind
  spellSchool?: string | null
}): SpellbookCopyCost {
  return {
    ...copySpellCost({
      spellLevel: input.spellLevel,
      kind: input.kind,
      spellSchool: input.spellSchool,
      mods: { savantSchool: null, wizardlyQuill: false },
    }),
    halvedBySavant: false,
  }
}

/**
 * Free school-spell picks a Savant gets when reaching `wizardLevel`.
 * Subclass level: two picks (level ≤ 2). Later levels: one pick per new slot tier.
 */
export function savantFreePicksAtWizardLevel(input: {
  wizardLevel: number
  subclassSlug: string | null | undefined
}): { picks: number; maxSpellLevel: number } {
  const level = Math.max(1, Math.floor(input.wizardLevel) || 1)
  if (!wizardSavantSchool(input.subclassSlug) || level < WIZARD_SUBCLASS_LEVEL_2024) {
    return { picks: 0, maxSpellLevel: 0 }
  }
  if (level === WIZARD_SUBCLASS_LEVEL_2024) {
    return {
      picks: savantFreeBookSlotsOnSubclass(),
      maxSpellLevel: SAVANT_SUBCLASS_PICK_MAX_SPELL_LEVEL,
    }
  }
  const tier = newSlotTiersGainedAtWizardLevel(level)
  if (tier == null) return { picks: 0, maxSpellLevel: 0 }
  return { picks: savantFreeBookSlotOnNewTier(), maxSpellLevel: tier }
}
