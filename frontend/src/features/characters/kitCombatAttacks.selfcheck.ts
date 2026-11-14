/**
 * CMB-01 kit unarmed / improvised rows.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/kitCombatAttacks.selfcheck.ts
 */
import assert from 'node:assert/strict'
import {
  KIT_IMPROVISED_ATTACK_ID,
  KIT_UNARMED_ATTACK_ID,
  isDraftUnarmedOrImprovisedDuplicate,
  listDeskCombatAttacks,
  resolveKitUnarmedDamage,
} from './kitCombatAttacks.ts'
import type { WeaponAttack } from './AttacksPanel.ts'
import { MONK_UNARMED_ATTACK_ID } from '../../shared/dnd/martialArts.ts'

assert.equal(resolveKitUnarmedDamage({
  hasTavernBrawler: false,
  styleIds: [],
  holdingWeaponOrShield: false,
}), '1', 'PHB unarmed = 1')

assert.equal(resolveKitUnarmedDamage({
  hasTavernBrawler: true,
  styleIds: [],
  holdingWeaponOrShield: false,
}), '1к4', 'TB floor 1к4')

assert.equal(resolveKitUnarmedDamage({
  hasTavernBrawler: false,
  styleIds: ['unarmed_fighting'],
  holdingWeaponOrShield: true,
}), '1к6', 'UF with weapon/shield')

assert.equal(resolveKitUnarmedDamage({
  hasTavernBrawler: false,
  styleIds: ['unarmed_fighting'],
  holdingWeaponOrShield: false,
}), '1к8', 'UF hands free')

assert.equal(resolveKitUnarmedDamage({
  hasTavernBrawler: true,
  styleIds: ['unarmed_fighting'],
  holdingWeaponOrShield: false,
}), '1к8', 'UF beats TB floor')

const sword: WeaponAttack = {
  id: 'w1',
  name: 'Длинный меч',
  catalog_id: null,
  source_kind: 'inventory',
  ability: 'str',
  is_proficient: true,
  damage: '1к8',
  damage_type: 'рубящий',
  held: true,
  inventory_item_id: 'inv1',
}

const rows = listDeskCombatAttacks({
  weapons: [sword],
  martialArtsDie: null,
  hasTavernBrawler: false,
  styleIds: [],
  inventoryItems: [{ id: 'inv1', equipped: true, weapon_grip: 'one_hand', name: 'Длинный меч' } as never],
})
assert.equal(rows.length, 3, 'weapon + unarmed + improvised')
assert.equal(rows[1]?.id, KIT_UNARMED_ATTACK_ID)
assert.equal(rows[1]?.is_proficient, true)
assert.equal(rows[1]?.damage, '1')
assert.equal(rows[2]?.id, KIT_IMPROVISED_ATTACK_ID)
assert.equal(rows[2]?.is_proficient, false)
assert.equal(rows[2]?.damage, '1к4')

const withTb = listDeskCombatAttacks({
  weapons: [sword],
  martialArtsDie: null,
  hasTavernBrawler: true,
  styleIds: [],
  inventoryItems: [],
})
assert.equal(withTb[2]?.is_proficient, true, 'TB improvised proficient')
assert.equal(withTb[1]?.damage, '1к4', 'TB unarmed die')

const monkCard: WeaponAttack = {
  id: MONK_UNARMED_ATTACK_ID,
  name: 'Безоружный удар',
  catalog_id: null,
  source_kind: 'class',
  ability: 'dex',
  is_proficient: true,
  damage: '1к6',
  damage_type: 'дробящий',
  held: true,
}
const monkRows = listDeskCombatAttacks({
  weapons: [sword, monkCard],
  martialArtsDie: '1к6',
  hasTavernBrawler: false,
  styleIds: [],
  inventoryItems: [],
})
assert.equal(
  monkRows.filter((r) => r.name === 'Безоружный удар').length,
  1,
  'no kit unarmed dup for monk',
)
assert.ok(monkRows.some((r) => r.id === MONK_UNARMED_ATTACK_ID))
assert.ok(monkRows.some((r) => r.id === KIT_IMPROVISED_ATTACK_ID))

const draftDup: WeaponAttack = {
  id: 'custom-unarmed',
  name: 'Безоружный удар',
  catalog_id: null,
  source_kind: 'custom',
  ability: 'str',
  is_proficient: true,
  damage: '1',
  damage_type: 'дробящий',
}
assert.equal(isDraftUnarmedOrImprovisedDuplicate(draftDup), true)
assert.equal(isDraftUnarmedOrImprovisedDuplicate(monkCard), false)

console.log('kitCombatAttacks.selfcheck: ok')
