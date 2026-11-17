/**
 * Run from frontend/: npx tsx src/features/characters/gearCatalogRefresh.selfcheck.ts
 */
import type { CatalogEntry } from '../../shared/api/catalog.ts'
import { createInventoryItem } from './inventory.ts'
import { refreshInventoryItemFromCatalog, refreshInventoryItemsFromCatalog } from './gearCatalogRefresh.ts'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

function entry(
  partial: Partial<CatalogEntry> & Pick<CatalogEntry, 'kind' | 'slug' | 'name_ru' | 'data'>,
): CatalogEntry {
  return {
    id: partial.id ?? `id-${partial.slug}`,
    kind: partial.kind,
    slug: partial.slug,
    name_ru: partial.name_ru,
    name_en: partial.name_en ?? partial.slug,
    rules_edition: '2014',
    parent_id: null,
    source: 'DMG 2014',
    external_ref: null,
    data: partial.data,
    sort_order: 1,
    is_active: true,
    created_at: '',
    updated_at: '',
  }
}

const catalog = entry({
  kind: 'item',
  id: 'staff-id',
  slug: 'staff_of_power',
  name_ru: 'Посох силы',
  data: {
    requires_attunement: true,
    wear_slot: 'held_main',
    effects: [
      { type: 'ac_bonus', value: 2 },
      { type: 'save_bonus', value: 2 },
      { type: 'spellcasting_bonus', value: 2, applies_to: 'attack' },
      {
        type: 'resource',
        id: 'staff_of_power',
        max: 20,
        restore: 'dawn',
        recharge: '2d8+4',
      },
      { type: 'grant_spell', slug: 'magic_missile', pool: 'charges', charge_cost: 1 },
    ],
  },
})

const stale = {
  ...createInventoryItem(),
  catalog_id: 'staff-id',
  catalog_slug: 'staff_of_power',
  name: 'Посох силы',
  qty: 1,
  notes: 'from player',
  equipped: true,
  effects: [{ type: 'ac_bonus', value: 2 }, { type: 'grant_spell', slug: 'magic_missile', uses: 20 }],
}

const one = refreshInventoryItemFromCatalog(stale, catalog)
assert(one, 'refresh should apply')
assert(one!.effects?.length === 5, `effects ${one!.effects?.length}`)
assert(one!.name === stale.name, 'name preserved')
assert(one!.notes === stale.notes, 'notes preserved')
assert(one!.equipped === true, 'equipped preserved')

const batch = refreshInventoryItemsFromCatalog(
  [stale, { ...createInventoryItem(), name: 'ручная', catalog_id: null }],
  [catalog],
)
assert(batch.length === 2, 'row count')
assert(batch[0]!.effects?.length === 5, 'batch refresh')
assert(batch[1]!.name === 'ручная', 'unlinked row untouched')

console.log('gearCatalogRefresh.selfcheck: ok')