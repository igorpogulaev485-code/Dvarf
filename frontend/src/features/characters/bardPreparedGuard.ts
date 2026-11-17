/**
 * 2024 bard prepared list on the sheet: new picks follow the table column (Magical Secrets lists
 * from level 10), but only ONE prepared spell may be replaced per bard level gained.
 * Same one-replace rule for cantrips. Every sheet edit of the spell list goes through
 * `guardBardSpellsChange2024`.
 */

import {
  BARD_CANTRIP_SWAP_PICK_ID_2024,
  BARD_PREPARED_SWAP_PICK_ID_2024,
  bardCantrips2024,
  bardPreparedSpells2024,
  evaluateBardCantripChange2024,
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

  const defaultSlug = active.length === 1 ? 'bard' : null
  let picks = input.featurePicks

  const prepSwapRaw = getFeaturePick(picks, bard.id, BARD_PREPARED_SWAP_PICK_ID_2024)
  const prepVerdict = evaluateBardPreparedChange2024({
    prev: input.prevSpells.known,
    next: input.nextSpells.known,
    bardLevel: bard.level,
    maxPrepared: bardPreparedSpells2024(bard.level),
    swapRaw: prepSwapRaw,
    isOffList: isOffBardList2024,
    defaultClassSlug: defaultSlug,
  })
  if (!prepVerdict.ok) {
    return { spells: input.prevSpells, featurePicks: input.featurePicks, blockedRu: prepVerdict.reasonRu }
  }
  if (prepVerdict.swapRaw !== prepSwapRaw) {
    picks = setFeaturePick(picks, bard.id, BARD_PREPARED_SWAP_PICK_ID_2024, prepVerdict.swapRaw)
  }

  const cantripSwapRaw = getFeaturePick(picks, bard.id, BARD_CANTRIP_SWAP_PICK_ID_2024)
  const cantripVerdict = evaluateBardCantripChange2024({
    prev: input.prevSpells.known,
    next: input.nextSpells.known,
    bardLevel: bard.level,
    maxCantrips: bardCantrips2024(bard.level),
    swapRaw: cantripSwapRaw,
    defaultClassSlug: defaultSlug,
  })
  if (!cantripVerdict.ok) {
    return { spells: input.prevSpells, featurePicks: input.featurePicks, blockedRu: cantripVerdict.reasonRu }
  }
  if (cantripVerdict.swapRaw !== cantripSwapRaw) {
    picks = setFeaturePick(picks, bard.id, BARD_CANTRIP_SWAP_PICK_ID_2024, cantripVerdict.swapRaw)
  }

  if (picks === input.featurePicks) return pass
  return { ...pass, featurePicks: picks }
}
