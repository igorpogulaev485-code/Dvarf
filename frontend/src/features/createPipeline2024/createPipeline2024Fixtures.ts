/**
 * DEV / e2e harness catalog for `/dev/p24-m03-preview` (no API, no auth for catalog reads).
 * Built from the full live 2024 seed JSON (copies of backend/data/srd/2024/live) — every class,
 * background and species. The real wizard never imports this file.
 */

import classesSrd from '../../shared/dnd/data/edition2024/classes_srd.json'
import classesEfa from '../../shared/dnd/data/edition2024/classes_efa.json'
import subclassesSrd from '../../shared/dnd/data/edition2024/subclasses_srd.json'
import subclassesPh24 from '../../shared/dnd/data/edition2024/subclasses_ph24.json'
import subclassesEfa from '../../shared/dnd/data/edition2024/subclasses_efa.json'
import subclassesFrhof from '../../shared/dnd/data/edition2024/subclasses_frhof.json'
import subclassesRtw from '../../shared/dnd/data/edition2024/subclasses_rtw.json'
import subclassesAu from '../../shared/dnd/data/edition2024/subclasses_au.json'
import speciesSrd from '../../shared/dnd/data/edition2024/species_srd.json'
import speciesPh24 from '../../shared/dnd/data/edition2024/species_ph24.json'
import speciesEfa from '../../shared/dnd/data/edition2024/species_efa.json'
import speciesRtw from '../../shared/dnd/data/edition2024/species_rtw.json'
import speciesLfl from '../../shared/dnd/data/edition2024/species_lfl.json'
import backgroundsSrd from '../../shared/dnd/data/edition2024/backgrounds_srd.json'
import backgroundsPh24 from '../../shared/dnd/data/edition2024/backgrounds_ph24.json'
import backgroundsEfa from '../../shared/dnd/data/edition2024/backgrounds_efa.json'
import backgroundsFrhof from '../../shared/dnd/data/edition2024/backgrounds_frhof.json'
import backgroundsAbh from '../../shared/dnd/data/edition2024/backgrounds_abh.json'
import backgroundsAu from '../../shared/dnd/data/edition2024/backgrounds_au.json'
import backgroundsRtw from '../../shared/dnd/data/edition2024/backgrounds_rtw.json'
import backgroundsLfl from '../../shared/dnd/data/edition2024/backgrounds_lfl.json'
import featsSrd from '../../shared/dnd/data/edition2024/feats_srd.json'
import featsPh24 from '../../shared/dnd/data/edition2024/feats_ph24.json'
import featsEfa from '../../shared/dnd/data/edition2024/feats_efa.json'
import featsFrhof from '../../shared/dnd/data/edition2024/feats_frhof.json'
import featsAbh from '../../shared/dnd/data/edition2024/feats_abh.json'
import featsAu from '../../shared/dnd/data/edition2024/feats_au.json'
import featsRtw from '../../shared/dnd/data/edition2024/feats_rtw.json'
import featsLfl from '../../shared/dnd/data/edition2024/feats_lfl.json'
import spellsSrd from '../../shared/dnd/data/edition2024/spells_srd.json'
import spellsPh24 from '../../shared/dnd/data/edition2024/spells_ph24.json'
import spellsEfa from '../../shared/dnd/data/edition2024/spells_efa.json'
import spellsFrhof from '../../shared/dnd/data/edition2024/spells_frhof.json'
import spellsAu from '../../shared/dnd/data/edition2024/spells_au.json'
import weaponsSrd from '../../shared/dnd/data/edition2024/weapons_srd.json'
import armorSrd from '../../shared/dnd/data/edition2024/armor_srd.json'
import equipmentSrd from '../../shared/dnd/data/edition2024/equipment_srd.json'
import equipmentFrhof from '../../shared/dnd/data/edition2024/equipment_frhof.json'
import type { CatalogEntry } from '../../shared/api/catalog'
import type { Create2024CatalogBundle, LanguagesBundle } from './createPipeline2024Types'

type SeedRow = {
  kind?: string
  slug?: string
  name_ru?: string
  name_en?: string | null
  source?: string | null
  sort_order?: number
  external_ref?: Record<string, unknown> | null
  data?: unknown
}

type SeedPack = { entries?: SeedRow[] }

function toCatalogEntries(
  kind: CatalogEntry['kind'],
  packs: ReadonlyArray<unknown>,
): CatalogEntry[] {
  const now = '2024-01-01T00:00:00Z'
  const out: CatalogEntry[] = []
  const seen = new Set<string>()
  for (const raw of packs) {
    for (const row of (raw as SeedPack).entries ?? []) {
      const slug = String(row.slug || '')
      if (!slug || seen.has(slug)) continue
      seen.add(slug)
      out.push({
        id: `seed-${kind}-${slug}`,
        kind,
        slug,
        name_ru: String(row.name_ru || ''),
        name_en: row.name_en ?? null,
        rules_edition: '2024',
        parent_id: null,
        source: row.source ?? null,
        external_ref: row.external_ref ?? null,
        data: (row.data && typeof row.data === 'object' ? row.data : {}) as Record<string, unknown>,
        sort_order: Number(row.sort_order ?? 0),
        is_active: true,
        created_at: now,
        updated_at: now,
      })
    }
  }
  return out.sort((a, b) => a.sort_order - b.sort_order)
}

export const FIXTURE_LANGUAGES: LanguagesBundle = {
  common_id: 'common',
  choice_count: 2,
  languages: [
    { id: 'common-sign-language', name_ru: 'Язык жестов', kind: 'standard' },
    { id: 'dwarvish', name_ru: 'Дварфийский', kind: 'standard' },
    { id: 'elvish', name_ru: 'Эльфийский', kind: 'standard' },
    { id: 'giant', name_ru: 'Великаний', kind: 'standard' },
    { id: 'gnomish', name_ru: 'Гномий', kind: 'standard' },
    { id: 'goblin', name_ru: 'Гоблинский', kind: 'standard' },
    { id: 'halfling', name_ru: 'Язык полуросликов', kind: 'standard' },
    { id: 'orc', name_ru: 'Орочий', kind: 'standard' },
    { id: 'abyssal', name_ru: 'Бездны', kind: 'exotic' },
    { id: 'celestial', name_ru: 'Небесный', kind: 'exotic' },
    { id: 'deep-speech', name_ru: 'Глубинная речь', kind: 'exotic' },
    { id: 'draconic', name_ru: 'Драконий', kind: 'exotic' },
    { id: 'infernal', name_ru: 'Инфернальный', kind: 'exotic' },
    { id: 'primordial', name_ru: 'Первичный', kind: 'exotic' },
    { id: 'sylvan', name_ru: 'Сильван', kind: 'exotic' },
    { id: 'undercommon', name_ru: 'Подземный', kind: 'exotic' },
  ],
  class_special: [
    { id: 'druidic', name_ru: 'Друидический', kind: 'class_special' },
    { id: 'thieves-cant', name_ru: 'Воровской жаргон', kind: 'class_special' },
  ],
}

export function buildCreate2024Fixtures(): Create2024CatalogBundle {
  const weapons = toCatalogEntries('weapon', [weaponsSrd])
  const armor = toCatalogEntries('armor', [armorSrd])
  const gear = toCatalogEntries('item', [equipmentSrd, equipmentFrhof])
  return {
    classes: toCatalogEntries('class', [classesSrd, classesEfa]),
    subclasses: toCatalogEntries('subclass', [
      subclassesSrd,
      subclassesPh24,
      subclassesEfa,
      subclassesFrhof,
      subclassesRtw,
      subclassesAu,
    ]),
    backgrounds: toCatalogEntries('background', [
      backgroundsSrd,
      backgroundsPh24,
      backgroundsEfa,
      backgroundsFrhof,
      backgroundsAbh,
      backgroundsAu,
      backgroundsRtw,
      backgroundsLfl,
    ]),
    species: toCatalogEntries('race', [
      speciesSrd,
      speciesPh24,
      speciesEfa,
      speciesRtw,
      speciesLfl,
    ]),
    feats: toCatalogEntries('feat', [
      featsSrd,
      featsPh24,
      featsEfa,
      featsFrhof,
      featsAbh,
      featsAu,
      featsRtw,
      featsLfl,
    ]),
    weapons,
    spells: toCatalogEntries('spell', [spellsSrd, spellsPh24, spellsEfa, spellsFrhof, spellsAu]),
    items: [...weapons, ...armor, ...gear],
  }
}
