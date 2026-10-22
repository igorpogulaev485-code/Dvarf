/**
 * Ranger conclave "extra spells" (XGtE): learned at listed ranger levels,
 * count as ranger spells, do not count against spells known.
 */

import { resolveSubclassFeatureSlug } from '../../shared/dnd/classFeatures'
import {
  asAlwaysPreparedSpell,
  createSheetSpell,
  spellKeyFromName,
  subclassSpellId,
  type SpellsState,
} from './spells'

export type RangerConclaveSpell = {
  name: string
  level: number
  fromClassLevel: number
}

/** Gloom Stalker Magic (XGtE). */
export const GLOOM_STALKER_SPELLS: RangerConclaveSpell[] = [
  { name: 'Disguise Self', level: 1, fromClassLevel: 3 },
  { name: 'Rope Trick', level: 2, fromClassLevel: 5 },
  { name: 'Fear', level: 3, fromClassLevel: 9 },
  { name: 'Greater Invisibility', level: 4, fromClassLevel: 13 },
  { name: 'Seeming', level: 5, fromClassLevel: 17 },
]

const CONCLAVE_SPELLS: Record<string, { labelRu: string; spells: RangerConclaveSpell[] }> = {
  gloom_stalker: { labelRu: 'Сумрачный охотник', spells: GLOOM_STALKER_SPELLS },
}

export function rangerConclaveSpellsForSlug(
  slug: string | null | undefined,
): { slug: string; labelRu: string; spells: RangerConclaveSpell[] } | null {
  if (!slug) return null
  const key = resolveSubclassFeatureSlug(slug) || slug.trim().toLowerCase()
  const pack = CONCLAVE_SPELLS[key]
  if (!pack) return null
  return { slug: key, ...pack }
}

function managedConclaveSpellIds(classEntryId: string): Set<string> {
  const ids = new Set<string>()
  for (const [slug, pack] of Object.entries(CONCLAVE_SPELLS)) {
    for (const row of pack.spells) {
      const key = spellKeyFromName(row.name)
      ids.add(subclassSpellId(classEntryId, slug, key || row.name))
    }
  }
  return ids
}

/**
 * Ensure conclave bonus spells match the active ranger archetype + class level.
 * Safe to call on sheet load: adds missing rows, drops obsolete conclave rows.
 */
export function syncRangerConclaveSpells(input: {
  spells: SpellsState
  classes: Array<{
    id: string
    name: string
    level: number
    subclass_name: string
  }>
  /** classEntryId → catalog/grant slug when known */
  subclassSlugByEntryId?: Record<string, string | null | undefined>
}): { spells: SpellsState; changed: boolean } {
  let known = [...input.spells.known]
  let changed = false

  for (const row of input.classes) {
    const isRanger = /следопыт|ranger/i.test(row.name.trim())
    if (!isRanger || row.level <= 0) continue

    const slug =
      input.subclassSlugByEntryId?.[row.id] ||
      resolveSubclassFeatureSlug(row.subclass_name) ||
      null
    const pack = rangerConclaveSpellsForSlug(slug)
    const managed = managedConclaveSpellIds(row.id)
    const before = known.length
    known = known.filter((spell) => !managed.has(spell.id))
    if (known.length !== before) changed = true

    if (!pack) continue

    const classLevel = Math.min(20, Math.max(1, Math.floor(row.level)))
    for (const spellRow of pack.spells) {
      if (spellRow.fromClassLevel > classLevel) continue
      const key = spellKeyFromName(spellRow.name)
      const id = subclassSpellId(row.id, pack.slug, key || spellRow.name)
      const existing = input.spells.known.find((spell) => spell.id === id)
      const created = asAlwaysPreparedSpell(
        {
          ...(existing ?? createSheetSpell()),
          id,
          name: spellRow.name,
          level: spellRow.level,
          catalog_id: existing?.catalog_id ?? null,
          class_slug: 'ranger',
          class_entry_id: row.id,
        },
        {
          source_kind: 'subclass',
          label: pack.labelRu,
          class_slug: 'ranger',
          class_entry_id: row.id,
        },
      )
      if (!existing) changed = true
      known.push(created)
    }
  }

  if (!changed) return { spells: input.spells, changed: false }
  return { spells: { ...input.spells, known }, changed: true }
}

export function gloomStalkerSpellId(classEntryId: string, spellName: string): string {
  const key = spellKeyFromName(spellName)
  return subclassSpellId(classEntryId, 'gloom_stalker', key || spellName)
}
