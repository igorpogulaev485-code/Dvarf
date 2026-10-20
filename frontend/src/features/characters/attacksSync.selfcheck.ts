/**
 * Run: npx --yes tsx src/features/characters/attacksSync.selfcheck.ts
 */
import { syncAttacksHeldFromInventory } from './attacksInventorySync.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

type Row = {
  id: string
  name: string
  inventory_item_id?: string | null
  held?: boolean
}

const bow: Row = {
  id: 'a1',
  name: 'Длинный лук',
  inventory_item_id: 'inv-bow',
  held: true,
}
const sword: Row = {
  id: 'a2',
  name: 'Короткий меч',
  inventory_item_id: 'inv-sword',
  held: true,
}
const custom: Row = {
  id: 'a3',
  name: 'Кастом',
  inventory_item_id: null,
  held: false,
}

const pruned = syncAttacksHeldFromInventory([bow, sword, custom], [
  { id: 'inv-bow', equipped: true },
])
assert(pruned.length === 2, 'sword orphan removed')
assert(pruned.some((row) => row.id === 'a1'), 'bow kept')
assert(pruned.some((row) => row.id === 'a3'), 'custom kept')
assert(!pruned.some((row) => row.id === 'a2'), 'sword gone')

const stowed = syncAttacksHeldFromInventory([bow], [
  { id: 'inv-bow', equipped: false },
])
assert(stowed[0]?.held === false, 'unequip → not held')

console.log('attacksSync.selfcheck: ok')
