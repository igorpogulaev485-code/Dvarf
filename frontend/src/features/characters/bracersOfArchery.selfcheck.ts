/**
 * Bracers of Archery — long/short bow proficiency + scoped +2 damage.
 * Run from frontend/: npx tsx src/features/characters/bracersOfArchery.selfcheck.ts
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { createAttunementSlot } from './attunement.ts'
import {
  aggregateGearEffects,
  gearProficiencySourceForAttack,
  mergeGearWeaponProficiency,
  scopedWeaponDamageBonus,
  scopedWeaponDamageHint,
} from './gearEffects.ts'
import { isWeaponProficient } from './equipmentProficiency.ts'
import {
  buildAttackBonusParts,
  formatAttackBaseHint,
  sumAttackBonusParts,
} from './attackBonusBreakdown.ts'
import { isAutoCombatConsumable } from './combatConsumables.ts'
import { createInventoryItem, equipInventoryItem } from './inventory.ts'
import { ammoKindOfStack } from '../../shared/dnd/o09DeathInspirationAmmo.ts'

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
assert(
  gear.weaponProficiencyGrants.some(
    (row) => row.weapon === 'Длинный лук' && /наручи/i.test(row.itemName),
  ),
  'grant names item',
)
assert(gear.scopedWeaponDamage.length === 1, 'one scoped row')
assert(gear.scopedWeaponDamage[0]!.value === 2, '+2 scoped')

const sheetWeapons = { simple: true, martial: false, extras: [] as string[] }
const weapons = mergeGearWeaponProficiency(sheetWeapons, gear.weaponProficiencies)
assert(
  isWeaponProficient({ name: 'Длинный лук', weapons }),
  'proficient with longbow',
)
assert(
  !isWeaponProficient({ name: 'Длинный лук', weapons: sheetWeapons }),
  'rogue sheet alone lacks longbow',
)
assert(
  gearProficiencySourceForAttack({
    name: 'Длинный лук',
    sheetWeapons,
    grants: gear.weaponProficiencyGrants,
  }) === bracers.name,
  'source is bracers',
)
assert(
  scopedWeaponDamageHint(gear.scopedWeaponDamage, { name: 'Длинный лук' }).includes(
    '+2',
  ),
  'damage hint +2',
)
{
  const parts = buildAttackBonusParts({
    abilityKey: 'dex',
    abilityMod: 5,
    proficient: true,
    proficiencyBonus: 4,
    proficiencySource: bracers.name,
  })
  assert(sumAttackBonusParts(parts) === 9, 'hit stays +9 not +11')
  assert(
    formatAttackBaseHint(parts).includes('от Наручи'),
    `hint shows source got ${formatAttackBaseHint(parts)}`,
  )
}
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
  scopedWeaponDamageBonus(gear.scopedWeaponDamage, {
    name: 'Лук драконьих крыльев',
  }) === 2,
  '+2 on dragon wing by name even without base slug',
)
assert(
  scopedWeaponDamageBonus(gear.scopedWeaponDamage, {
    name: 'Лук драконьих крыльев',
    catalogSlug: 'dragon_wing_bow',
  }) === 2,
  '+2 via catalog slug',
)
assert(
  scopedWeaponDamageBonus(gear.scopedWeaponDamage, { name: 'Короткий меч' }) === 0,
  'no bonus on shortsword',
)
assert(
  scopedWeaponDamageBonus(gear.scopedWeaponDamage, { name: 'Лёгкий арбалет' }) === 0,
  'no bonus on light crossbow',
)
assert(gear.scopedWeaponDamage[0]!.value === 2, 'catalog value is +2 not +1')

assert(
  ammoKindOfStack({
    name: bracers.name,
    catalog_slug: bracers.catalog_slug,
    wear_slot: bracers.wear_slot,
  }) == null,
  'bracers are not ammo stacks',
)
assert(
  !isAutoCombatConsumable({
    name: bracers.name,
    qty: 1,
    wear_slot: bracers.wear_slot,
    catalog_slug: bracers.catalog_slug,
  }),
  'bracers are not auto combat consumables',
)

console.log('bracersOfArchery.selfcheck: ok')
