/**
 * PHB 2014: the Ritual tag is not enough. Only a class with Ritual Casting
 * (bard, cleric, druid, wizard, artificer) can cast its own prepared ritual
 * without a slot. Paladin / ranger / sorcerer spells stay slot casts.
 * Wizard rituals from the spellbook are a separate gate.
 */

const RITUAL_CLASS_SLUGS = new Set(['bard', 'cleric', 'druid', 'wizard', 'artificer'])

export function classHasRitualCasting(slug: string | null | undefined): boolean {
  const key = slug?.trim().toLowerCase() ?? ''
  return RITUAL_CLASS_SLUGS.has(key)
}

export function canCastPreparedSpellAsRitual(input: {
  ritual: boolean
  level: number
  /** Sheet row class. Empty only when the sheet has a single caster. */
  classSlug?: string | null
  casterSlugs: string[]
}): boolean {
  if (!input.ritual || input.level <= 0) return false
  const spellSlug = input.classSlug?.trim().toLowerCase() ?? ''
  if (spellSlug) return classHasRitualCasting(spellSlug)
  const casters = input.casterSlugs
    .map((slug) => slug.trim().toLowerCase())
    .filter(Boolean)
  if (casters.length === 0) return false
  return casters.every((slug) => classHasRitualCasting(slug))
}
