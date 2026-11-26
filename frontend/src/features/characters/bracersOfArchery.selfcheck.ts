/**
 * Bracers of Archery — long/short bow proficiency + scoped +2 damage.
 * Run from frontend/: npx tsx src/features/characters/bracersOfArchery.selfcheck.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createAttunementSlot } from './attunement.ts'
import {
  aggregateGearEffects,
  mergeGearWeaponProficiency,
  scopedWeaponDamageBonus,
} from './gearEffects.ts'
import { isWeaponProficient } from './equipmentProficiency.ts'
import { createInventoryItem, equipInventoryItem } from './inventory.ts'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

const root = join(process.cwd(), '../backend/data/srd/2014')
const wondrous = JSON.parse(readFileSync(join(root, 'gear_wondrous_srd_v1.json'), 'utf8'))
const insert = (wondrous.inserts || []).find(
  (row: { slug?: string }) => row.slug === 'bracers_of_archery',
)
assert(insert, 'bracers insert')
const effects = insert.data?.effects ?? []
assert(
  effects.some((e: { type?: string }) => e.type === 'weapon_proficiency'),
  'typed weapon_proficiency',
)
assert(
  effects.some(
    (e: { type?: string; value?: number; weapons?: string[] }) =>
      e.type === 'damage_bonus' && e.value === 2 && Array.isArray(e.weapons),
  ),
  'scoped damage_bonus +2',
)

const bracers = createInventoryItem()
bracers.name = 'Наручи стрельбы'
bracers.catalog_slug = 'bracers_of_archery'
bracers.requires_attunement = true
bracers.wear_slot = 'arms'
bracers.effects = effects

let items = equipInventoryItem([bracers], bracers.id, true)
const attunements = [createAttunementSlot({ item_id: bracers.id, name: bracers.name })]
const gear = aggregateGearEffects({ items, attunements })

assert(gear.weaponProficiencies.includes('Длинный лук'), 'longbow prof')
assert(gear.weaponProficiencies.includes('Короткий лук'), 'shortbow prof')
assert(gear.scopedWeaponDamage.length === 1, 'one scoped row')
assert(gear.scopedWeaponDamage[0]!.value === 2, '+2 scoped')

const weapons = mergeGearWeaponProficiency(
  { simple: true, martial: false, extras: [] },
  gear.weaponProficiencies,
)
assert(
  isWeaponProficient({ name: 'Длинный лук', weapons }),
  'proficient with longbow',
)
assert(
  isWeaponProficient({
    name: 'Лук драконьих крыльев',
    weapons,
    baseWeaponSlug: 'longbow',
  }),
  'proficient with dragon wing via base slug',
)
assert(
  !isWeaponProficient({ name: 'Длинный меч', weapons }),
  'not proficient with longsword',
)

assert(
  scopedWeaponDamageBonus(gear.scopedWeaponDamage, { name: 'Длинный лук' }) === 2,
  '+2 on longbow',
)
assert(
  scopedWeaponDamageBonus(gear.scopedWeaponDamage, {
    name: 'Лук драконьих крыльев',
    baseWeaponSlug: 'longbow',
  }) === 2,
  '+2 on dragon wing bow',
)
assert(
  scopedWeaponDamageBonus(gear.scopedWeaponDamage, { name: 'Короткий меч' }) === 0,
  'no bonus on shortsword',
)

console.log('bracersOfArchery.selfcheck: ok')
