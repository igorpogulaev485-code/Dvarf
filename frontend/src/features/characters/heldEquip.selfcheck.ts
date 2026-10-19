/** Quick node selfcheck: npx tsx src/features/characters/heldEquip.selfcheck.ts */

import {
  equipHeldItem,
  handsCost,
  listShieldItems,
  resolveActiveWeaponDamage,
  resolveWeaponGrip,
  toggleShieldInHand,
  totalHeldHands,
} from './heldEquip.ts'
import { syncAttacksHeldFromInventory, type WeaponAttack } from './AttacksPanel.tsx'
import type { InventoryItem } from './inventory.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function item(partial: Partial<InventoryItem> & { id: string; name: string }): InventoryItem {
  return {
    parent_id: null,
    qty: 1,
    equipped: false,
    armor_kind: 'none',
    base_ac: null,
    max_dex_bonus: null,
    strength_requirement: null,
    weapon_grip: null,
    cost_gp: null,
    weight_lb: null,
    notes: '',
    catalog_id: null,
    spell_tooling: 'none',
    focus_kind: null,
    wear_slot: 'none',
    requires_attunement: false,
    effects: [],
    ...partial,
  }
}

function attack(partial: Partial<WeaponAttack> & { id: string; name: string }): WeaponAttack {
  return {
    catalog_id: null,
    source_kind: 'weapon',
    ability: 'str',
    is_proficient: true,
    damage: '1к8',
    damage_type: 'дробящий',
    qty: null,
    inventory_item_id: null,
    held: false,
    ...partial,
  }
}

const empty = toggleShieldInHand([])
assert(!empty.ok && empty.reason.includes('щита'), 'empty inventory')

const base = [
  item({ id: 'w1', name: 'Длинный меч', weapon_grip: 'one_hand', equipped: true }),
  item({ id: 's1', name: 'Щит', armor_kind: 'shield', base_ac: 2, equipped: false }),
]
assert(listShieldItems(base).length === 1, 'lists shield')

const drawn = toggleShieldInHand(base)
assert(drawn.ok && drawn.equipped && drawn.name === 'Щит', 'draw')
assert(drawn.ok && drawn.items.find((row) => row.id === 's1')?.equipped, 'shield on')
assert(drawn.ok && totalHeldHands(drawn.items) <= 2, 'hands ok with sword+shield')

const stowed = toggleShieldInHand(drawn.ok ? drawn.items : base)
assert(stowed.ok && !stowed.equipped, 'stow')
assert(stowed.ok && !stowed.items.find((row) => row.id === 's1')?.equipped, 'shield off')

const twoHand = [
  item({
    id: 'g1',
    name: 'Двуручный меч',
    weapon_grip: 'two_hand',
    equipped: true,
  }),
  item({ id: 's1', name: 'Щит', armor_kind: 'shield', base_ac: 2, equipped: false }),
]
const swap = toggleShieldInHand(twoHand)
assert(swap.ok && swap.equipped, 'draw frees two-hander')
assert(swap.ok && !swap.items.find((row) => row.id === 'g1')?.equipped, 'greatsword stowed')
assert(swap.ok && swap.items.find((row) => row.id === 's1')?.equipped, 'shield drawn')

// --- Versatile: warhammer must NOT be two-handed (old bug: substring «молот»).
assert(resolveWeaponGrip({ name: 'Боевой молот' }) === 'one_hand', 'warhammer grip')
assert(resolveWeaponGrip({ name: 'Лёгкий молот' }) === 'one_hand', 'light hammer grip')
assert(resolveWeaponGrip({ name: 'Молот' }) === 'two_hand', 'maul grip')
assert(resolveWeaponGrip({ name: 'Двуручный молот' }) === 'two_hand', 'maul alias grip')
assert(resolveWeaponGrip({ name: 'Боевой топор' }) === 'one_hand', 'battleaxe grip')
assert(resolveWeaponGrip({ name: 'Длинный меч' }) === 'one_hand', 'longsword grip')
assert(resolveWeaponGrip({ name: 'Копьё' }) === 'one_hand', 'spear grip')
assert(resolveWeaponGrip({ name: 'Трезубец' }) === 'one_hand', 'trident grip')
assert(resolveWeaponGrip({ name: 'Боевой посох' }) === 'one_hand', 'staff grip')
assert(resolveWeaponGrip({ name: 'Секира' }) === 'two_hand', 'greataxe grip')

// Stale stored two_hand on warhammer must still cost 1 hand.
const staleHammer = item({
  id: 'wh',
  name: 'Боевой молот',
  weapon_grip: 'two_hand',
  equipped: true,
})
assert(handsCost(staleHammer) === 1, 'stale warhammer handsCost')

const hammerShield = [
  staleHammer,
  item({ id: 's1', name: 'Щит', armor_kind: 'shield', base_ac: 2, equipped: false }),
]
const withShield = equipHeldItem(hammerShield, 's1')
assert(withShield.find((row) => row.id === 'wh')?.equipped, 'warhammer stays with shield')
assert(withShield.find((row) => row.id === 's1')?.equipped, 'shield drawn with warhammer')
assert(totalHeldHands(withShield) === 2, 'hammer+shield = 2 hands')

assert(
  resolveActiveWeaponDamage({ name: 'Боевой молот', twoHandedWield: true }) === '1к10',
  'warhammer 2H die',
)
assert(
  resolveActiveWeaponDamage({ name: 'Боевой молот', twoHandedWield: false }) === '1к8',
  'warhammer 1H die',
)
assert(
  resolveActiveWeaponDamage({ name: 'Боевой посох', twoHandedWield: true }) === '1к8',
  'staff 2H die',
)
assert(
  resolveActiveWeaponDamage({ name: 'Копьё', twoHandedWield: false }) === '1к6',
  'spear 1H die',
)

const versatileKit = [
  item({ id: 'wh', name: 'Боевой молот', equipped: true }),
  item({ id: 's1', name: 'Щит', armor_kind: 'shield', base_ac: 2, equipped: false }),
]
const attacksAlone = syncAttacksHeldFromInventory(
  [attack({ id: 'a1', name: 'Боевой молот', inventory_item_id: 'wh', damage: '1к8', held: false })],
  versatileKit,
)
assert(attacksAlone[0]?.held === true, 'sync held')
assert(attacksAlone[0]?.damage === '1к10', 'alone → 1к10')

const kitWithShield = equipHeldItem(versatileKit, 's1')
const attacksShield = syncAttacksHeldFromInventory(attacksAlone, kitWithShield)
assert(attacksShield[0]?.damage === '1к8', 'with shield → 1к8')
assert(attacksShield[0]?.held === true, 'still held with shield')

console.log('heldEquip.selfcheck ok')
