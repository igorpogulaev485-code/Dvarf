/** Quick node selfcheck: npx tsx src/features/characters/heldEquip.selfcheck.ts */

import {
  listShieldItems,
  toggleShieldInHand,
  totalHeldHands,
} from './heldEquip.ts'
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
    focus_kind: 'none',
    wear_slot: 'none',
    requires_attunement: false,
    effects: [],
    data: null,
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

console.log('heldEquip.selfcheck ok')
