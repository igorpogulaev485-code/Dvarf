/**
 * Self-check: Amulet of the Devout bonuses (spellcasting + free Channel Divinity).
 * Run: npx tsx src/features/characters/gearEffects.devout.selfcheck.ts
 */

import {
  aggregateGearEffects,
  devoutAmuletBonusFromName,
} from './gearEffects'
import type { InventoryItem } from './inventory'
import type { AttunementSlot } from './attunement'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function item(partial: Partial<InventoryItem> & Pick<InventoryItem, 'id' | 'name'>): InventoryItem {
  return {
    qty: 1,
    weight_lb: 0,
    equipped: true,
    parent_id: null,
    notes: '',
    requires_attunement: true,
    effects: [{ type: 'custom_note', text: 'legacy' }],
    catalog_id: null,
    cost_gp: null,
    armor_kind: null,
    armor_base_ac: null,
    armor_max_dex: null,
    stealth_disadvantage: false,
    weapon_grip: null,
    spell_tooling: 'none',
    wear_slot: 'neck',
    container_kind: null,
    ...partial,
  } as InventoryItem
}

assert(devoutAmuletBonusFromName('Амулет благочестия +2') === 2, 'ru +2')
assert(devoutAmuletBonusFromName('Amulet of the Devout +3') === 3, 'en +3')
assert(devoutAmuletBonusFromName('Кольцо защиты') === null, 'non-amulet')

const amulet = item({
  id: 'amulet-1',
  name: 'Амулет благочестия +2',
})
const attunements: AttunementSlot[] = [
  { id: 'slot-1', item_id: 'amulet-1', name: '', notes: '' },
]

const active = aggregateGearEffects({ items: [amulet], attunements })
assert(active.spellcastingBonus === 2, `spellcastingBonus want 2 got ${active.spellcastingBonus}`)
assert(
  active.resources.some((r) => r.key.endsWith(':channel_divinity') && r.max === 1),
  'channel divinity resource missing',
)

const unequipped = aggregateGearEffects({
  items: [{ ...amulet, equipped: false }],
  attunements,
})
assert(unequipped.spellcastingBonus === 0, 'unequipped must not grant bonus')

const unattuned = aggregateGearEffects({
  items: [amulet],
  attunements: [{ id: 'slot-1', item_id: null, name: '', notes: '' }],
})
assert(unattuned.spellcastingBonus === 0, 'unattuned must not grant bonus')

const typed = item({
  id: 'amulet-2',
  name: 'Амулет благочестия +1',
  effects: [
    { type: 'spellcasting_bonus', value: 1 },
    { type: 'resource', id: 'channel_divinity', max: 1, restore: 'long' },
  ],
})
const typedAgg = aggregateGearEffects({
  items: [typed],
  attunements: [{ id: 'slot-1', item_id: 'amulet-2', name: '', notes: '' }],
})
assert(typedAgg.spellcastingBonus === 1, 'typed effect +1')
assert(
  typedAgg.resources.filter((r) => r.key.includes('channel_divinity')).length === 1,
  'no double channel resource',
)

console.log('gearEffects.devout.selfcheck: ok')
