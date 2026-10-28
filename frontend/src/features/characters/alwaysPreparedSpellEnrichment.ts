/**
 * Enrich always-prepared sheet rows from the bundled 2014 spell catalog.
 * Domain/oath grants historically only set name+level, so concentration /
 * components / duration were missing on cast (QA 2026-10-22 Bless).
 */

import bundledSpells2014 from '../../../public/spells-2014.json'
import { sheetSpellFromCatalog, type SheetSpell } from './spells'

type CatalogSpellEntry = {
  id: string
  name_ru: string
  name_en?: string
  slug?: string
  data?: Record<string, unknown>
}

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/['’]/g, "'")
}

const byEn = new Map<string, CatalogSpellEntry>()
const byRu = new Map<string, CatalogSpellEntry>()

for (const raw of bundledSpells2014 as CatalogSpellEntry[]) {
  if (!raw || typeof raw.id !== 'string') continue
  if (typeof raw.name_en === 'string' && raw.name_en.trim()) {
    byEn.set(norm(raw.name_en), raw)
  }
  if (typeof raw.name_ru === 'string' && raw.name_ru.trim()) {
    byRu.set(norm(raw.name_ru), raw)
  }
}

/** Resolve catalog entry by English seed name or Russian sheet label. */
export function findBundledSpellForAlwaysPrepared(
  englishName: string,
  nameRu?: string,
): CatalogSpellEntry | null {
  const en = englishName.trim()
  if (en) {
    const hit = byEn.get(norm(en))
    if (hit) return hit
  }
  const ru = nameRu?.trim()
  if (ru) {
    const hit = byRu.get(norm(ru))
    if (hit) return hit
  }
  return null
}

/**
 * Merge catalog mechanics onto an always-prepared stub while keeping the
 * stable subclass spell id / prepared_locked flags from `base`.
 */
export function enrichAlwaysPreparedSheetSpell(
  base: SheetSpell,
  englishName: string,
): SheetSpell {
  const entry = findBundledSpellForAlwaysPrepared(englishName, base.name)
  if (!entry) return base
  const fromCatalog = sheetSpellFromCatalog({
    id: entry.id,
    name_ru: entry.name_ru,
    slug: entry.slug,
    data: entry.data,
  })
  return {
    ...fromCatalog,
    ...base,
    catalog_id: base.catalog_id ?? fromCatalog.catalog_id,
    name: base.name || fromCatalog.name,
    level: Number.isFinite(base.level) ? base.level : fromCatalog.level,
    casting_time: base.casting_time || fromCatalog.casting_time,
    range: base.range || fromCatalog.range,
    attack_or_save: base.attack_or_save || fromCatalog.attack_or_save,
    damage: base.damage || fromCatalog.damage,
    concentration: Boolean(base.concentration || fromCatalog.concentration),
    duration: base.duration || fromCatalog.duration,
    ritual: base.ritual ?? fromCatalog.ritual,
    school: base.school || fromCatalog.school,
    source_book: base.source_book || fromCatalog.source_book,
    components: base.components ?? fromCatalog.components,
    description: base.description || fromCatalog.description,
    higher_levels: base.higher_levels || fromCatalog.higher_levels,
    damage_at_character_level:
      base.damage_at_character_level ?? fromCatalog.damage_at_character_level,
    damage_at_slot_level:
      base.damage_at_slot_level ?? fromCatalog.damage_at_slot_level,
    applies_to_allies: base.applies_to_allies ?? fromCatalog.applies_to_allies,
    ally_target_count: base.ally_target_count ?? fromCatalog.ally_target_count,
  }
}
