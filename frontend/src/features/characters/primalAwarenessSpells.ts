/**
 * O-02: TCE Primal Awareness — always-prepared ranger spells + 1 free cast / long rest each.
 */

import { alwaysPreparedSpellNameRu } from '../../shared/dnd/alwaysPreparedSpellNamesRu'
import {
  PRIMAL_AWARENESS_FREE_CAST_NOTE,
  PRIMAL_AWARENESS_GRANT_LABEL,
  PRIMAL_AWARENESS_SPELLS,
} from '../../shared/dnd/o02TashaFeatures'
import { enrichAlwaysPreparedSheetSpell } from './alwaysPreparedSpellEnrichment'
import {
  asAlwaysPreparedSpell,
  createSheetSpell,
  featureSpellId,
  spellKeyFromName,
  type SpellsState,
} from './spells'

const FEATURE_ID = 'primal_awareness_tasha'

function managedIds(): Set<string> {
  const ids = new Set<string>()
  for (const row of PRIMAL_AWARENESS_SPELLS) {
    const key = spellKeyFromName(row.name)
    ids.add(featureSpellId(FEATURE_ID, key || row.name))
  }
  return ids
}

/**
 * Sync Primal Awareness (TCE) spells onto the sheet when the optional feature is active.
 * Free cast 1/long rest via grant_cast; ordinary slot cast unchanged.
 */
export function syncPrimalAwarenessSpells(input: {
  spells: SpellsState
  classes: Array<{ id: string; name: string; level: number }>
  /** Active (replacement taken) primal_awareness_tasha. */
  hasFeature: boolean
}): { spells: SpellsState; changed: boolean } {
  let known = [...input.spells.known]
  let changed = false
  const managed = managedIds()

  if (!input.hasFeature) {
    const before = known.length
    known = known.filter((spell) => !managed.has(spell.id))
    if (known.length === before) return { spells: input.spells, changed: false }
    return { spells: { ...input.spells, known }, changed: true }
  }

  const ranger = input.classes.find(
    (row) => /следопыт|ranger/i.test(row.name.trim()) && row.level > 0,
  )
  if (!ranger) {
    const before = known.length
    known = known.filter((spell) => !managed.has(spell.id))
    if (known.length === before) return { spells: input.spells, changed: false }
    return { spells: { ...input.spells, known }, changed: true }
  }

  const classLevel = Math.min(20, Math.max(1, Math.floor(ranger.level)))
  for (const spellRow of PRIMAL_AWARENESS_SPELLS) {
    if (spellRow.fromClassLevel > classLevel) continue
    const key = spellKeyFromName(spellRow.name)
    const id = featureSpellId(FEATURE_ID, key || spellRow.name)
    const existing = known.find((spell) => spell.id === id) ?? null
    const nameRu = alwaysPreparedSpellNameRu(spellRow.name)
    const created = enrichAlwaysPreparedSheetSpell(
      asAlwaysPreparedSpell(
        {
          ...(existing ?? createSheetSpell()),
          id,
          name: nameRu,
          level: spellRow.level,
          catalog_id: existing?.catalog_id ?? null,
          class_slug: 'ranger',
          class_entry_id: ranger.id,
          notes: PRIMAL_AWARENESS_FREE_CAST_NOTE,
          grant_cast: existing?.grant_cast ?? {
            max: 1,
            used: 0,
            reset: 'long',
            label: PRIMAL_AWARENESS_GRANT_LABEL,
          },
        },
        {
          source_kind: 'feature',
          label: PRIMAL_AWARENESS_GRANT_LABEL,
          class_slug: 'ranger',
          class_entry_id: ranger.id,
        },
      ),
      spellRow.name,
    )
    if (!existing) {
      known.push(created)
      changed = true
      continue
    }
    const idx = known.findIndex((spell) => spell.id === id)
    if (idx < 0) continue
    const prev = known[idx]!
    if (
      prev.name !== created.name ||
      prev.notes !== created.notes ||
      !prev.grant_cast ||
      prev.grant_cast.max !== 1 ||
      prev.grant_cast.reset !== 'long'
    ) {
      known[idx] = {
        ...created,
        grant_cast: {
          max: 1,
          used: prev.grant_cast?.used ?? 0,
          reset: 'long',
          label: PRIMAL_AWARENESS_GRANT_LABEL,
        },
      }
      changed = true
    }
  }

  // Drop managed spells above current level.
  const allowed = new Set(
    PRIMAL_AWARENESS_SPELLS.filter((row) => row.fromClassLevel <= classLevel).map((row) =>
      featureSpellId(FEATURE_ID, spellKeyFromName(row.name) || row.name),
    ),
  )
  const pruned = known.filter((spell) => !managed.has(spell.id) || allowed.has(spell.id))
  if (pruned.length !== known.length) {
    known = pruned
    changed = true
  }

  if (!changed) return { spells: input.spells, changed: false }
  return { spells: { ...input.spells, known }, changed: true }
}
