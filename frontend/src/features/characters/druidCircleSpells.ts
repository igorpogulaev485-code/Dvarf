/**
 * Druid circle "always prepared" spells (TCoE): count as druid spells,
 * do not use prepare budget. Tagged class_slug=druid for MC cast profiles.
 */

import { resolveSubclassFeatureSlug } from '../../shared/dnd/classFeatures'
import { alwaysPreparedSpellNameRu } from '../../shared/dnd/alwaysPreparedSpellNamesRu'
import {
  asAlwaysPreparedSpell,
  createSheetSpell,
  spellKeyFromName,
  subclassSpellId,
  type SpellsState,
} from './spells'

export type DruidCircleSpell = {
  name: string
  level: number
  fromClassLevel: number
}

/** Circle of Wildfire (TCoE) — Circle Spells. */
export const WILDFIRE_CIRCLE_SPELLS: DruidCircleSpell[] = [
  { name: 'Burning Hands', level: 1, fromClassLevel: 2 },
  { name: 'Cure Wounds', level: 1, fromClassLevel: 2 },
  { name: 'Flaming Sphere', level: 2, fromClassLevel: 3 },
  { name: 'Scorching Ray', level: 2, fromClassLevel: 3 },
  { name: 'Plant Growth', level: 3, fromClassLevel: 5 },
  { name: 'Revivify', level: 3, fromClassLevel: 5 },
  { name: 'Aura of Life', level: 4, fromClassLevel: 7 },
  { name: 'Fire Shield', level: 4, fromClassLevel: 7 },
  { name: 'Flame Strike', level: 5, fromClassLevel: 9 },
  { name: 'Mass Cure Wounds', level: 5, fromClassLevel: 9 },
]

const CIRCLE_SPELLS: Record<
  string,
  { labelRu: string; spells: DruidCircleSpell[] }
> = {
  circle_of_wildfire: {
    labelRu: 'Круг дикого огня',
    spells: WILDFIRE_CIRCLE_SPELLS,
  },
}

export function druidCircleSpellsForSlug(
  slug: string | null | undefined,
): { slug: string; labelRu: string; spells: DruidCircleSpell[] } | null {
  if (!slug) return null
  const key = resolveSubclassFeatureSlug(slug) || slug.trim().toLowerCase()
  const pack = CIRCLE_SPELLS[key]
  if (!pack) return null
  return { slug: key, ...pack }
}

function managedCircleSpellIds(classEntryId: string): Set<string> {
  const ids = new Set<string>()
  for (const [slug, pack] of Object.entries(CIRCLE_SPELLS)) {
    for (const row of pack.spells) {
      const key = spellKeyFromName(row.name)
      ids.add(subclassSpellId(classEntryId, slug, key || row.name))
    }
  }
  return ids
}

/**
 * Ensure wildfire (etc.) circle spells match active druid archetype + level.
 * Safe on sheet load: adds missing rows, drops obsolete circle rows.
 * Sets class_slug=druid so MC cast dialog can dual-pick vs sorcerer/wizard copies.
 */
export function syncDruidCircleSpells(input: {
  spells: SpellsState
  classes: Array<{
    id: string
    name: string
    level: number
    subclass_name: string
  }>
  subclassSlugByEntryId?: Record<string, string | null | undefined>
}): { spells: SpellsState; changed: boolean } {
  let known = [...input.spells.known]
  let changed = false

  for (const row of input.classes) {
    const isDruid = /друид|druid/i.test(row.name.trim())
    if (!isDruid || row.level <= 0) continue

    const slug =
      input.subclassSlugByEntryId?.[row.id] ||
      resolveSubclassFeatureSlug(row.subclass_name) ||
      null
    const pack = druidCircleSpellsForSlug(slug)
    const managed = managedCircleSpellIds(row.id)
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
      const nameRu = alwaysPreparedSpellNameRu(spellRow.name)
      const created = asAlwaysPreparedSpell(
        {
          ...(existing ?? createSheetSpell()),
          id,
          name: nameRu,
          level: spellRow.level,
          catalog_id: existing?.catalog_id ?? null,
          class_slug: 'druid',
          class_entry_id: row.id,
        },
        {
          source_kind: 'subclass',
          label: pack.labelRu,
          class_slug: 'druid',
          class_entry_id: row.id,
        },
      )
      if (
        !existing ||
        existing.class_slug !== 'druid' ||
        existing.name !== nameRu ||
        !existing.prepared_locked
      ) {
        changed = true
      }
      known.push(created)
    }
  }

  if (!changed) return { spells: input.spells, changed: false }
  return { spells: { ...input.spells, known }, changed: true }
}
