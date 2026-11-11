/**
 * PHB 2014 ritual books that are not the wizard spellbook:
 * Ritual Caster feat, and Book of Ancient Secrets (written in the Book of Shadows).
 * Costs and level caps only. Sheet rows live in the character JSON.
 */

export const RITUAL_CASTER_LISTS = [
  'bard',
  'cleric',
  'druid',
  'sorcerer',
  'warlock',
  'wizard',
] as const

export type RitualCasterList = (typeof RITUAL_CASTER_LISTS)[number]

const CASTING_BY_LIST: Record<RitualCasterList, 'int' | 'wis' | 'cha'> = {
  bard: 'cha',
  cleric: 'wis',
  druid: 'wis',
  sorcerer: 'cha',
  warlock: 'cha',
  wizard: 'int',
}

export function isRitualCasterList(value: string | null | undefined): value is RitualCasterList {
  const key = value?.trim().toLowerCase() ?? ''
  return (RITUAL_CASTER_LISTS as readonly string[]).includes(key)
}

/**
 * PHB Ritual Caster: the chosen class sets the spellcasting ability.
 * The Int/Wis 13+ pick is only the prerequisite.
 */
export function ritualCasterCastingAbility(
  listSlug: string | null | undefined,
): 'int' | 'wis' | 'cha' | null {
  const key = listSlug?.trim().toLowerCase() ?? ''
  if (!isRitualCasterList(key)) return null
  return CASTING_BY_LIST[key]
}

/** PHB: 2 hours and 50 gp per spell level, for both ritual books. */
export function ritualTranscriptionCost(spellLevel: number): { gp: number; hours: number } {
  const level = Math.max(1, Math.min(9, Math.floor(spellLevel) || 1))
  return { gp: 50 * level, hours: 2 * level }
}

/** PHB "half your level (rounded up)". */
export function halfLevelRoundedUp(level: number): number {
  const safe = Math.max(1, Math.floor(level) || 1)
  return Math.max(1, Math.ceil(safe / 2))
}

export function ritualCopyLevelAllowed(spellLevel: number, casterLevel: number): boolean {
  const level = Math.max(1, Math.floor(spellLevel) || 1)
  return level <= halfLevelRoundedUp(casterLevel)
}
