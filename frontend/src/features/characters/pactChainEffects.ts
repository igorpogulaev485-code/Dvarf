/**
 * Pact of the Chain (Цепь): learn Find Familiar; cast as ritual.
 * Materialized as always-available warlock feature spell (outside known budget).
 */

import {
  getFeaturePick,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import {
  asAlwaysPreparedSpell,
  createSheetSpell,
  featureSpellId,
  type SpellsState,
} from './spells'
import { PACT_BOON_FEATURE_ID, isWarlockClassName } from './pactTomeEffects'

export const PACT_CHAIN_SPELL_SCOPE = 'pact_chain'
export const PACT_CHAIN_FIND_FAMILIAR_SLUG = 'find_familiar'
export const PACT_CHAIN_LABEL_RU = 'Договор Цепи'

const FIND_FAMILIAR_NAME_RU = 'Поиск фамильяра'

export function pactChainFamiliarSpellId(): string {
  return featureSpellId(PACT_CHAIN_SPELL_SCOPE, PACT_CHAIN_FIND_FAMILIAR_SLUG)
}

export function isPactChainSpellId(id: string): boolean {
  return id.startsWith(`feature-spell:${PACT_CHAIN_SPELL_SCOPE}:`)
}

export function isPactChainActive(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): boolean {
  return getFeaturePick(featurePicks, classEntryId, PACT_BOON_FEATURE_ID) === 'chain'
}

/**
 * Ensure Find Familiar is on the sheet while Pact of the Chain is active.
 * Safe on sheet load: adds / refreshes the row; removes it if pact is not Цепь.
 */
export function syncPactChainFamiliar(input: {
  spells: SpellsState
  featurePicks: FeaturePicksState
  classes: Array<{ id: string; name: string; level: number }>
}): { spells: SpellsState; changed: boolean } {
  const warlock = input.classes.find(
    (row) => isWarlockClassName(row.name) && row.level > 0,
  )
  const active = Boolean(
    warlock && isPactChainActive(input.featurePicks, warlock.id),
  )
  const id = pactChainFamiliarSpellId()
  const without = input.spells.known.filter((spell) => !isPactChainSpellId(spell.id))
  let changed = without.length !== input.spells.known.length

  if (!active) {
    if (!changed) return { spells: input.spells, changed: false }
    return { spells: { ...input.spells, known: without }, changed: true }
  }

  const existing = input.spells.known.find((spell) => spell.id === id)
  const created = asAlwaysPreparedSpell(
    {
      ...(existing ?? createSheetSpell()),
      id,
      name: FIND_FAMILIAR_NAME_RU,
      level: 1,
      ritual: true,
      class_slug: 'warlock',
      class_entry_id: warlock!.id,
      catalog_id: existing?.catalog_id ?? PACT_CHAIN_FIND_FAMILIAR_SLUG,
    },
    {
      source_kind: 'feature',
      label: PACT_CHAIN_LABEL_RU,
      class_slug: 'warlock',
      class_entry_id: warlock!.id,
    },
  )
  if (
    !existing ||
    existing.class_slug !== 'warlock' ||
    existing.name !== FIND_FAMILIAR_NAME_RU ||
    !existing.prepared_locked ||
    !existing.ritual
  ) {
    changed = true
  }
  return {
    spells: { ...input.spells, known: [...without, created] },
    changed,
  }
}
