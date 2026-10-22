/**
 * One-shot sheet hydration for always-prepared spells after catalog fixes.
 * - Re-enrich mechanics (concentration, components) from bundled spells JSON
 * - Refresh grant snapshots from live subclass catalog (Artillerist lists, etc.)
 */

import type { CatalogEntry } from '../../shared/api/catalog'
import type {
  AppliedSubclassGrant,
  AlwaysPreparedSpell,
} from '../../shared/dnd/subclassGrants'
import { enrichAlwaysPreparedSheetSpell } from './alwaysPreparedSpellEnrichment'
import {
  resolveSubclassDefFromCatalog,
  syncSubclassAlwaysPreparedSpells,
  type SubclassGrantDraftSlice,
} from './subclassEffects'
import type { SheetSpell } from './spells'

/** Patch locked sheet rows from bundled catalog (fixes legacy Bless without concentration). */
export function hydrateAlwaysPreparedMechanics(known: SheetSpell[]): {
  known: SheetSpell[]
  changed: boolean
} {
  let changed = false
  const next = known.map((spell) => {
    if (!spell.prepared_locked) return spell
    const enriched = enrichAlwaysPreparedSheetSpell(spell, spell.name)
    if (!enriched.catalog_id && !enriched.concentration && !enriched.duration) {
      return spell
    }
    const catalog_id = spell.catalog_id ?? enriched.catalog_id
    const concentration = Boolean(spell.concentration || enriched.concentration)
    const duration = spell.duration || enriched.duration
    const casting_time = spell.casting_time || enriched.casting_time
    const components = spell.components ?? enriched.components
    const range = spell.range || enriched.range
    const school = spell.school || enriched.school
    const description = spell.description || enriched.description
    const attack_or_save = spell.attack_or_save || enriched.attack_or_save
    const damage = spell.damage || enriched.damage
    const damage_at_character_level =
      spell.damage_at_character_level ?? enriched.damage_at_character_level
    const applies_to_allies = spell.applies_to_allies ?? enriched.applies_to_allies
    const ally_target_count = spell.ally_target_count ?? enriched.ally_target_count

    if (
      catalog_id === spell.catalog_id &&
      concentration === spell.concentration &&
      duration === spell.duration &&
      casting_time === spell.casting_time &&
      components === spell.components &&
      range === spell.range &&
      attack_or_save === spell.attack_or_save &&
      damage === spell.damage
    ) {
      return spell
    }

    changed = true
    return {
      ...spell,
      catalog_id,
      concentration,
      duration,
      casting_time,
      components,
      range,
      school,
      description,
      attack_or_save,
      damage,
      damage_at_character_level,
      applies_to_allies,
      ally_target_count,
    }
  })
  return { known: changed ? next : known, changed }
}

function snapshotNeedsRefresh(
  grant: AppliedSubclassGrant,
  catalogSpells: AlwaysPreparedSpell[],
): boolean {
  if (catalogSpells.length === 0) return false
  const existing = grant.alwaysPreparedSpells ?? []
  if (existing.length < catalogSpells.length) return true
  const catalogHasGates = catalogSpells.some((s) => s.fromClassLevel != null)
  const existingHasGates = existing.some((s) => s.fromClassLevel != null)
  return catalogHasGates && !existingHasGates
}

function toSnapshot(spells: AlwaysPreparedSpell[]): AlwaysPreparedSpell[] {
  return spells.map((spell) => ({
    name: spell.name,
    level: spell.level,
    ...(spell.fromClassLevel != null ? { fromClassLevel: spell.fromClassLevel } : {}),
  }))
}

/**
 * Refresh AppliedSubclassGrant.alwaysPreparedSpells from catalog entries,
 * then re-sync known rows (Artillerist specialty list backfill).
 */
export function hydrateAlwaysPreparedFromSubclassCatalog(input: {
  draft: SubclassGrantDraftSlice
  subclassEntries: CatalogEntry[]
  classLevelsByEntryId: Record<string, number>
  maxSpellLevel: number
}): { draft: SubclassGrantDraftSlice; changed: boolean } {
  const byId = new Map(input.subclassEntries.map((entry) => [entry.id, entry]))
  const bySlug = new Map(input.subclassEntries.map((entry) => [entry.slug, entry]))
  let grantsChanged = false

  const grants = input.draft.subclassGrants.map((grant) => {
    const entry =
      (grant.catalogId ? byId.get(grant.catalogId) : undefined) ?? bySlug.get(grant.slug)
    if (!entry) return grant
    const def = resolveSubclassDefFromCatalog({
      nameRu: entry.name_ru,
      slug: entry.slug,
      catalogData: entry.data,
      parentSlug: grant.parentSlug,
    })
    if (!def || !snapshotNeedsRefresh(grant, def.alwaysPreparedSpells)) return grant
    grantsChanged = true
    return {
      ...grant,
      catalogId: grant.catalogId || entry.id,
      alwaysPreparedSpells: toSnapshot(def.alwaysPreparedSpells),
    }
  })

  const withGrants: SubclassGrantDraftSlice = grantsChanged
    ? { ...input.draft, subclassGrants: grants }
    : input.draft

  const synced = syncSubclassAlwaysPreparedSpells({
    draft: withGrants,
    maxSpellLevel: input.maxSpellLevel,
    classLevelsByEntryId: input.classLevelsByEntryId,
  })

  const mechanics = hydrateAlwaysPreparedMechanics(synced.spells.known)
  const syncChanged = synced !== withGrants

  if (!grantsChanged && !syncChanged && !mechanics.changed) {
    return { draft: input.draft, changed: false }
  }

  return {
    draft: {
      ...synced,
      spells: { ...synced.spells, known: mechanics.known },
    },
    changed: true,
  }
}
