/** Helpers to reset create-pipeline magic when class rows change. */

import type { ClassLevelEntry } from '../../shared/dnd/classLevels'
import { resolveClassCasterSlug } from '../../shared/dnd/casterProgression'
import {
  readSpells,
  retainSpellsForRemainingClasses,
  type SpellsState,
} from '../characters/spells'
import type { SubclassSetupStored } from './createPipelineTypes'

/** Class identity slugs still on the draft (casters and non-casters). */
export function casterSlugsForClasses(classes: ClassLevelEntry[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const row of classes) {
    if (!row.name.trim() || row.level <= 0) continue
    const slug = resolveClassCasterSlug(row.name)
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    out.push(slug)
  }
  return out
}

/** Drop subclass setups whose class entry was removed from the draft. */
export function pruneSubclassSetupsForClasses(
  setups: Record<string, SubclassSetupStored> | undefined,
  classes: ClassLevelEntry[],
): Record<string, SubclassSetupStored> {
  if (!setups) return {}
  const keep = new Set(classes.map((row) => row.id))
  const next: Record<string, SubclassSetupStored> = {}
  for (const [id, setup] of Object.entries(setups)) {
    if (keep.has(id)) next[id] = setup
  }
  return next
}

export function resetSpellsForClassChange(input: {
  prev: SpellsState
  remainingClasses: ClassLevelEntry[]
  /** Primary class catalog swap — also drop untagged player known. */
  dropUntagged?: boolean
}): SpellsState {
  const base = readSpells({})
  const known = retainSpellsForRemainingClasses(
    input.prev.known,
    casterSlugsForClasses(input.remainingClasses),
    { dropUntagged: input.dropUntagged },
  )
  return {
    ...base,
    casting_ability: input.prev.casting_ability,
    known,
  }
}
