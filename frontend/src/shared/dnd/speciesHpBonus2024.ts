/**
 * PHB 2024 species HP bonuses (edition-gated).
 *
 * Dwarven Toughness (dwarf): +1 max HP per character level.
 * Kept separate from 2014 hill/gold dwarf passive ledger (#498) so the two
 * PRs do not share helpers or race-slug tables.
 */

export const DWARVEN_TOUGHNESS_NAME_RU = 'Дварфийская стойкость'

/** Species with the 2024 `dwarven_toughness` trait. */
export function hasDwarvenToughness2024(
  speciesSlug: string | null | undefined,
): boolean {
  return (speciesSlug || '').trim().toLowerCase() === 'dwarf'
}

/** Resolve species slug for a 2024 sheet (identity → race grant → race name). */
export function resolveSpeciesSlug2024(input: {
  speciesSlug?: string | null
  raceGrantSlug?: string | null
  raceName?: string | null
}): string | null {
  const fromIdentity = (input.speciesSlug || '').trim().toLowerCase()
  if (fromIdentity) return fromIdentity
  const fromGrant = (input.raceGrantSlug || '').trim().toLowerCase()
  if (fromGrant) return fromGrant
  const name = (input.raceName || '').trim()
  if (/^дварф$/i.test(name) || /^dwarf$/i.test(name)) return 'dwarf'
  return null
}

/** Total +HP from Dwarven Toughness at character level N. */
export function dwarvenToughnessHpTotal2024(input: {
  characterLevel: number
  speciesSlug: string | null | undefined
}): number {
  if (!hasDwarvenToughness2024(input.speciesSlug)) return 0
  return Math.max(0, Math.floor(input.characterLevel || 0))
}

/** Incremental +HP when character level changes (create / level-up / rollback). */
export function dwarvenToughnessHpDelta2024(input: {
  newCharacterLevel: number
  oldCharacterLevel: number
  speciesSlug: string | null | undefined
}): number {
  return (
    dwarvenToughnessHpTotal2024({
      characterLevel: input.newCharacterLevel,
      speciesSlug: input.speciesSlug,
    }) -
    dwarvenToughnessHpTotal2024({
      characterLevel: input.oldCharacterLevel,
      speciesSlug: input.speciesSlug,
    })
  )
}
