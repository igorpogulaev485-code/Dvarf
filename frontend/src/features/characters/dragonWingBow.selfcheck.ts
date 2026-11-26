/**
 * Dragon Wing Bow — weapon catalog row + attack card + heal path.
 * Run from frontend/: npx tsx src/features/characters/dragonWingBow.selfcheck.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import type { CatalogEntry } from '../../shared/api/catalog.ts'
import { createAttunementSlot } from './attunement.ts'
import { ensureInventoryWeaponAttacks } from './attacksInventorySync.ts'
import { aggregateGearEffects } from './gearEffects.ts'
import { inventoryItemFromCatalog } from './gearFromCatalog.ts'
import { createInventoryItem, equipInventoryItem } from './inventory.ts'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

const root = join(process.cwd(), '../backend/data/srd/2014')
const settings = JSON.parse(readFileSync(join(root, 'gear_settings_v1.json'), 'utf8'))
const insert = (settings.inserts || []).find(
  (row: { slug?: string }) => row.slug === 'dragon_wing_bow',
)
assert(insert, 'dragon wing insert')
assert(insert.kind === 'weapon', `kind ${insert.kind}`)
assert(insert.data?.base_weapon_slug === 'longbow', 'base longbow')
assert(
  Array.isArray(insert.data?.allowed_base_weapon) &&
    insert.data.allowed_base_weapon.includes('shortbow'),
  'any bow',
)

const entry = {
  id: insert.id,
  kind: 'weapon',
  slug: 'dragon_wing_bow',
  name_ru: 'Лук драконьих крыльев',
  name_en: 'Dragon Wing Bow',
  rules_edition: '2014',
  source: 'FTD 2014',
  sort_order: 10520,
  is_active: true,
  data: insert.data,
} as CatalogEntry

const added = inventoryItemFromCatalog({ entry })
assert(added, 'catalog add')
assert(added.attacks.length === 1, 'one attack card on add')
assert(added.attacks[0]!.name === 'Лук драконьих крыльев', 'attack name')
assert(added.item.base_weapon_slug === 'longbow', 'item base')
assert(added.item.weapon_grip === 'two_hand', `grip ${added.item.weapon_grip}`)

let items = equipInventoryItem([added.item], added.item.id, true)
const attunements = [createAttunementSlot({ item_id: added.item.id, name: added.item.name })]
const gear = aggregateGearEffects({ items, attunements })
assert(gear.byItem[added.item.id]?.attackBonus === 1, 'attack +1')
assert(gear.byItem[added.item.id]?.damageBonus === 1, 'damage +1')

// Legacy wondrous-shaped row (no attack card) → heal creates one.
const legacy = createInventoryItem()
legacy.name = 'Лук драконьих крыльев'
legacy.catalog_id = insert.id
legacy.catalog_slug = 'dragon_wing_bow'
legacy.equipped = true
legacy.requires_attunement = true
legacy.wear_slot = 'held_main'
legacy.magic_bonus = 1
legacy.effects = [
  { type: 'attack_bonus', value: 1 },
  { type: 'damage_bonus', value: 1 },
]
legacy.base_weapon_slug = 'longbow'
const healed = ensureInventoryWeaponAttacks({
  items: [legacy],
  weapons: [],
  catalogBySlug: new Map([
    [
      'dragon_wing_bow',
      {
        slug: 'dragon_wing_bow',
        damage: '1к8+1к6',
        damage_type: 'колющий + стихия дракона',
        ability: 'dex',
      },
    ],
  ]),
})
assert(healed.weapons.length === 1, 'heal creates attack')
assert(healed.weapons[0]!.inventory_item_id === legacy.id, 'linked')
assert(healed.weapons[0]!.held === true, 'held while equipped')
assert(healed.weapons[0]!.damage === '1к8+1к6', `heal damage ${healed.weapons[0]!.damage}`)
assert(healed.items[0]!.weapon_grip === 'two_hand', 'heal sets grip')

console.log('dragonWingBow.selfcheck: ok')
