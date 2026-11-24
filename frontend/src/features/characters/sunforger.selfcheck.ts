/**
 * Sunforger (Солнечный молот) — catalog + attack card + gear bonuses.
 * Run from frontend/: npx tsx src/features/characters/sunforger.selfcheck.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import type { CatalogEntry } from '../../shared/api/catalog.ts'
import { findWeaponPreset } from '../../shared/dnd/weaponPresets.ts'
import { createAttunementSlot } from './attunement.ts'
import { aggregateGearEffects } from './gearEffects.ts'
import { inventoryItemFromCatalog } from './gearFromCatalog.ts'
import { equipInventoryItem } from './inventory.ts'
import { syncGearResources } from './gearGrantsSync.ts'
import { resolveWeaponGrip, resolveActiveWeaponDamage } from './heldEquip.ts'
import type { SheetResource } from '../../shared/dnd/rest.ts'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

const root = join(process.cwd(), '../backend/data/srd/2014')

function load(name: string) {
  return JSON.parse(readFileSync(join(root, name), 'utf8'))
}

// Soft-match must not turn fancy *молот* names into the maul preset.
assert(findWeaponPreset('Солнечный молот') == null, 'sunforger is not maul')
assert(findWeaponPreset('Метательный молот дварфов') == null, 'dwarven thrower is not maul')
assert(findWeaponPreset('Боевой молот')?.labelRu === 'Боевой молот', 'warhammer exact')
assert(findWeaponPreset('Боевой молот +2')?.labelRu === 'Боевой молот', 'warhammer +2')
assert(findWeaponPreset('Молот')?.labelRu === 'Молот', 'maul exact')
assert(findWeaponPreset('warhammer')?.labelRu === 'Боевой молот', 'warhammer alias')

const fill = load('gear_settings_fill_v1.json')
const insert = (fill.inserts || []).find((r: { slug?: string }) => r.slug === 'sunforger')
assert(insert, 'sunforger insert')
const mergeData = { ...(insert.data || {}) }
const fix = load('gear_sunforger_fix_v1.json')
const update = (fix.updates || []).find((r: { slug?: string }) => r.slug === 'sunforger')
assert(update?.data, 'sunforger fix wave')
Object.assign(mergeData, update.data)

const entry = {
  id: '00000000-0000-4000-8000-00000000sun1',
  kind: 'weapon',
  slug: 'sunforger',
  name_ru: 'Солнечный молот',
  name_en: 'Sunforger',
  rules_edition: '2014',
  source: 'GGR 2014',
  sort_order: 12158,
  is_active: true,
  data: mergeData,
} as CatalogEntry

const added = inventoryItemFromCatalog({ entry })
assert(added, 'catalog add')
assert(added.item.base_weapon_slug === 'warhammer', 'base warhammer')
assert(added.item.magic_bonus === 2, 'magic_bonus 2')
assert(added.item.weapon_grip === 'one_hand', 'versatile one_hand grip')
assert(added.attacks.length === 1, 'one attack card')
const attack = added.attacks[0]!
assert(attack.name === 'Солнечный молот', `attack name ${attack.name}`)
assert(attack.damage === '1к8', `damage ${attack.damage}`)
assert(attack.damage_type === 'дробящий', 'bludgeoning')
assert(attack.ability === 'str', 'str')

assert(
  resolveWeaponGrip({ name: 'Солнечный молот', data: mergeData }) === 'one_hand',
  'grip with catalog data',
)
assert(
  resolveActiveWeaponDamage({
    name: 'Солнечный молот',
    data: mergeData,
    baseWeaponSlug: 'warhammer',
    twoHandedWield: true,
  }) === '1к10',
  'versatile 2H die',
)
assert(
  resolveActiveWeaponDamage({
    name: 'Солнечный молот',
    baseWeaponSlug: 'warhammer',
    twoHandedWield: false,
  }) === '1к8',
  '1H with shield is 1к8 not maul 2к6',
)
assert(
  resolveWeaponGrip({
    name: 'Солнечный молот',
    baseWeaponSlug: 'warhammer',
  }) === 'one_hand',
  'warhammer grip via base slug',
)

let items = equipInventoryItem([added.item], added.item.id, true)
const attunements = [createAttunementSlot({ item_id: added.item.id, name: added.item.name })]
const gear = aggregateGearEffects({ items, attunements })
const byItem = gear.byItem[added.item.id]
assert(byItem?.attackBonus === 2, `attack +2 got ${byItem?.attackBonus}`)
assert(byItem?.damageBonus === 2, `damage +2 got ${byItem?.damageBonus}`)

const explode = gear.resources.find((r) => r.key.includes(':explode'))
assert(explode?.max === 1, 'explode max 1')
assert(explode?.reset === 'short', `explode reset ${explode?.reset}`)

const resources: SheetResource[] = []
const synced = syncGearResources(resources, gear)
const row = synced.find((r) => r.id.includes('explode'))
assert(row?.max === 1 && row.reset === 'short', 'synced explode resource')

const desc = String(mergeData.description_ru || '')
assert(desc.includes('метнуть'), 'description has throw')
assert(desc.includes('6к6'), 'description has 6d6')
assert(!desc.includes('заклинание жреца'), 'old wrong spell text gone')

console.log('sunforger.selfcheck: ok')
