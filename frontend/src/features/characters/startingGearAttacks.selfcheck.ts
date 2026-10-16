/**
 * Run: npx tsx src/features/characters/startingGearAttacks.selfcheck.ts
 */
import {
  buildStartingWeaponAttacks,
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

console.log('startingGearAttacks.selfcheck: ok')
