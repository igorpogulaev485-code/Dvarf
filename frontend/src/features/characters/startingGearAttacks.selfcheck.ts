/**
 * Run: npx tsx src/features/characters/startingGearAttacks.selfcheck.ts
 */
import {
  buildStartingWeaponAttacks,
  filterAttackIdsAfterMerge,
  mergeStartingWeaponAttacksByIdentity,
  resolveStartingWeaponAttacks,
} from './startingGearAttacks'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// Two handaxes → one attack row with qty 2 (same as javelins).
const axes = resolveStartingWeaponAttacks('Ручной топор', 2)
assert(axes, 'handaxe resolves')
assert(axes.cardCount === 1, 'handaxe: one card, not two')
assert(axes.stackQty === 2, 'handaxe: qty 2 on the card')

const builtAxes = buildStartingWeaponAttacks({
  name: 'ручной топор',
  qty: 2,
  makeId: (i, n) => `t:${i}:${n}`,
  inventoryItemId: 'inv-axe',
})
assert(builtAxes.attacks.length === 1, 'handaxe build: single row')
assert(builtAxes.attacks[0]?.qty === 2, 'handaxe build: qty field')
assert(!builtAxes.attacks[0]?.name.includes('×'), 'handaxe: no ×N in name')

// Javelins stay stacked.
const javelins = resolveStartingWeaponAttacks('Метательное копьё', 4)
assert(javelins, 'javelin resolves')
assert(javelins.cardCount === 1 && javelins.stackQty === 4, 'javelin: one card qty 4')

// Other light duplicates (daggers, shortswords) also stack.
const daggers = resolveStartingWeaponAttacks('Кинжал', 2)
assert(daggers?.cardCount === 1 && daggers.stackQty === 2, 'dagger×2 stacks')

const shorts = resolveStartingWeaponAttacks('Короткий меч', 2)
assert(shorts?.cardCount === 1 && shorts.stackQty === 2, 'shortsword×2 stacks')

// Unique weapon → no qty.
const greataxe = resolveStartingWeaponAttacks('Секира', 1)
assert(greataxe?.cardCount === 1 && greataxe.stackQty == null, 'greataxe: no qty')

// Separate inventory lines (class pack + pick / class + background) → one card.
const classDagger = buildStartingWeaponAttacks({
  name: 'Кинжал',
  qty: 1,
  makeId: () => 'class-eq:w:inv-a',
  inventoryItemId: 'inv-a',
})
const pickDagger = buildStartingWeaponAttacks({
  name: 'кинжал',
  qty: 1,
  makeId: () => 'class-eq:w:inv-b',
  inventoryItemId: 'inv-b',
})
const bgDagger = buildStartingWeaponAttacks({
  name: 'Dagger',
  qty: 1,
  makeId: () => 'bg-eq:criminal:inv-c',
  inventoryItemId: 'inv-c',
})
const merged = mergeStartingWeaponAttacksByIdentity([
  ...classDagger.attacks,
  ...pickDagger.attacks,
  ...bgDagger.attacks,
])
assert(merged.length === 1, 'cross-line daggers: one attack card')
assert(merged[0]?.name === 'Кинжал', 'cross-line: canonical labelRu')
assert(merged[0]?.qty === 3, 'cross-line: qty summed to 3')
assert(merged[0]?.id === 'class-eq:w:inv-a', 'cross-line: first id survives')

const ids = filterAttackIdsAfterMerge(
  ['class-eq:w:inv-a', 'class-eq:w:inv-b', 'bg-eq:criminal:inv-c', 'gone'],
  merged,
)
assert(
  ids.length === 1 && ids[0] === 'class-eq:w:inv-a',
  'filterAttackIdsAfterMerge keeps survivor only',
)

// Unresolvable custom names do not collapse into each other.
const customA = {
  ...classDagger.attacks[0]!,
  id: 'custom-a',
  name: 'Клинок тени',
}
const customB = {
  ...classDagger.attacks[0]!,
  id: 'custom-b',
  name: 'Клинок пламени',
}
const customs = mergeStartingWeaponAttacksByIdentity([customA, customB])
assert(customs.length === 2, 'unknown names: no fuzzy merge')

console.log('startingGearAttacks.selfcheck: ok')
