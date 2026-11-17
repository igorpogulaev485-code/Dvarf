/**
 * 2024 bard prepared list on the sheet: new picks follow the table column (Magical Secrets lists
 * from level 10), but only ONE prepared spell may be replaced per bard level gained.
 * Every sheet edit of the spell list goes through `guardBardSpellsChange2024`.
 */

import {
  BARD_PREPARED_SWAP_PICK_ID_2024,
  bardPreparedSpells2024,
  evaluateBardPreparedChange2024,
} from '../../shared/dnd/bard2024Features'
import { resolveClassFeatureSlug } from '../../shared/dnd/classFeatures'
import { getFeaturePick, setFeaturePick, type FeaturePicksState } from '../../shared/dnd/featurePicks'
import { isOffBardList2024 } from './bardSpellCatalog2024'
import type { SpellsState } from './spells'

export type BardSpellsGuardResult = {
  spells: SpellsState
  featurePicks: FeaturePicksState
  blockedRu: string | null
}

export function guardBardSpellsChange2024(input: {
  edition: string | null | undefined
  classes: Array<{ id: string; name: string; level: number }>
  prevSpells: SpellsState
  nextSpells: SpellsState
  featurePicks: FeaturePicksState
}): BardSpellsGuardResult {
  const pass: BardSpellsGuardResult = {
    spells: input.nextSpells,
    featurePicks: input.featurePicks,
    blockedRu: null,
  }
  if (String(input.edition ?? '2014').trim() !== '2024') return pass
  const active = input.classes.filter((row) => row.level > 0)
  const bard = active.find((row) => resolveClassFeatureSlug(row.name) === 'bard')
  if (!bard) return pass

  const swapRaw = getFeaturePick(input.featurePicks, bard.id, BARD_PREPARED_SWAP_PICK_ID_2024)
  const verdict = evaluateBardPreparedChange2024({
    prev: input.prevSpells.known,
    next: input.nextSpells.known,
    bardLevel: bard.level,
    maxPrepared: bardPreparedSpells2024(bard.level),
    swapRaw,
    isOffList: isOffBardList2024,
    defaultClassSlug: active.length === 1 ? 'bard' : null,
  })
  if (!verdict.ok) {
    return { spells: input.prevSpells, featurePicks: input.featurePicks, blockedRu: verdict.reasonRu }
  }
  if (verdict.swapRaw === swapRaw) return pass
  return {
    ...pass,
    featurePicks: setFeaturePick(input.featurePicks, bard.id, BARD_PREPARED_SWAP_PICK_ID_2024, verdict.swapRaw),
  }
}
