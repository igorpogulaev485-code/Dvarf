/**
 * Stone of Good Luck (Luckstone) — +1 saves and ability checks.
 * Run from frontend/: npx tsx src/features/characters/luckstone.selfcheck.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import type { CatalogEntry } from '../../shared/api/catalog.ts'
import { createAttunementSlot } from './attunement.ts'
import { aggregateGearEffects } from './gearEffects.ts'
import { inventoryItemFromCatalog } from './gearFromCatalog.ts'
import { equipInventoryItem } from './inventory.ts'
import { SKILL_DEFS } from './sheetTypes.ts'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

const root = join(process.cwd(), '../backend/data/srd/2014')
const wondrous = JSON.parse(readFileSync(join(root, 'gear_wondrous_srd_v1.json'), 'utf8'))
const insert = (wondrous.inserts || []).find(
  (row: { slug?: string }) => row.slug === 'stone_of_good_luck',
)
assert(insert, 'luckstone insert')
const effects = insert.data?.effects || []
assert(
  effects.some((e: { type?: string; value?: number }) => e.type === 'save_bonus' && e.value === 1),
  'save_bonus +1',
)
assert(
  effects.some(
    (e: { type?: string; value?: number }) => e.type === 'ability_check_bonus' && e.value === 1,
  ),
  'ability_check_bonus +1',
)

const entry = {
  id: insert.id,
  kind: 'item',
  slug: 'stone_of_good_luck',
  name_ru: 'Камень удачи',
  name_en: 'Stone of Good Luck (Luckstone)',
  rules_edition: '2014',
  source: 'DMG 2014',
  sort_order: 9271,
  is_active: true,
  data: insert.data,
} as CatalogEntry

const added = inventoryItemFromCatalog({ entry })
assert(added, 'catalog add')
let items = equipInventoryItem([added.item], added.item.id, true)
const attunements = [createAttunementSlot({ item_id: added.item.id, name: added.item.name })]
const gear = aggregateGearEffects({ items, attunements })
assert((gear.saveBonuses.all ?? 0) === 1, `saves ${gear.saveBonuses.all}`)
assert((gear.abilityCheckBonuses.all ?? 0) === 1, `checks ${gear.abilityCheckBonuses.all}`)

// Skills inherit the flat check bonus in sheet wiring; spot-check defs exist.
assert(SKILL_DEFS.some((s) => s.key === 'perception' && s.base === 'wis'), 'perception wis')

console.log('luckstone.selfcheck: ok')
