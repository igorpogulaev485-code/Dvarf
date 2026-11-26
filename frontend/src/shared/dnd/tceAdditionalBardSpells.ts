/**
 * TCE «Additional Bard Spells» (Tasha’s, optional class feature, level 1).
 * Expands the 2014 bard spell list. Keep in sync with:
 * - frontend/public/spells-2014.json (`classes` includes bard + `tce_additional_classes`)
 * - backend/data/srd/2014/spells_enriched_v1.json
 * - alembic k18bardtce01
 */

export const TCE_ADDITIONAL_BARD_SPELLS_NAME_RU = 'Дополнительные заклинания барда'
export const TCE_ADDITIONAL_BARD_SPELLS_FEATURE_ID = 'additional_bard_spells'

/** Slugs as stored in the 2014 catalog (`snake_case`). */
export const TCE_ADDITIONAL_BARD_SPELL_SLUGS_2014 = [
  'color_spray',
  'command',
  'aid',
  'enlarge_reduce',
  'mirror_image',
  'intellect_fortress',
  'mass_healing_word',
  'slow',
  'phantasmal_killer',
  'telepathic_bond',
  'heroes_feast',
  'dream_of_the_blue_veil',
  'prismatic_spray',
  'antipathy_sympathy',
  'prismatic_wall',
] as const

export type TceAdditionalBardSpellSlug2014 =
  (typeof TCE_ADDITIONAL_BARD_SPELL_SLUGS_2014)[number]

const SLUG_SET = new Set<string>(TCE_ADDITIONAL_BARD_SPELL_SLUGS_2014)

export function isTceAdditionalBardSpellSlug2014(
  slug: string | null | undefined,
): boolean {
  const key = (slug ?? '').trim().toLowerCase()
  return key.length > 0 && SLUG_SET.has(key)
}
