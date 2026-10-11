/**
 * npx --yes tsx src/features/characters/attunement.selfcheck.ts
 * Run from frontend/.
 */
import { createInventoryItem, type InventoryItem } from './inventory'
import {
  attunementPickerItems,
  createAttunementSlot,
} from './attunement'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

function item(partial: Partial<InventoryItem> & { name: string }): InventoryItem {
  return { ...createInventoryItem(), ...partial }
}

const sword = item({ name: 'Меч', requires_attunement: false })
const ring = item({ name: 'Кольцо защиты', requires_attunement: true })
const amulet = item({ name: 'Амулет', requires_attunement: true })
const cloak = item({ name: 'Плащ', requires_attunement: true })
const nested = item({
  name: 'Вложенный',
  requires_attunement: true,
  parent_id: 'pack-1',
})

const items = [sword, ring, amulet, cloak, nested]
const slotA = createAttunementSlot({ id: 'a', item_id: ring.id, name: ring.name })
const slotB = createAttunementSlot({ id: 'b' })
const slotC = createAttunementSlot({ id: 'c' })

const forB = attunementPickerItems({
  items,
  attunements: [slotA, slotB, slotC],
  currentSlotId: 'b',
})
assert(
  forB.every((item) => item.requires_attunement),
  'picker only requires_attunement',
)
assert(
  !forB.some((item) => item.id === sword.id),
  'plain sword excluded',
)
assert(
  !forB.some((item) => item.id === ring.id),
  'already attuned ring excluded from other slot',
)
assert(
  !forB.some((item) => item.id === nested.id),
  'nested pack child excluded',
)
assert(
  forB.some((item) => item.id === amulet.id) && forB.some((item) => item.id === cloak.id),
  'unattuned magic items listed',
)

const forA = attunementPickerItems({
  items,
  attunements: [slotA, slotB, slotC],
  currentSlotId: 'a',
})
assert(
  forA.some((item) => item.id === ring.id),
  'current slot keeps its linked item visible',
)

const emptyEligible = attunementPickerItems({
  items: [sword],
  attunements: [slotB],
  currentSlotId: 'b',
})
assert(emptyEligible.length === 0, 'no fallback to full inventory')

console.log('attunement.selfcheck: ok')
