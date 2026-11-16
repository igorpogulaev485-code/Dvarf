/**
 * Selfcheck: Stroke of Luck on unified journal entries.
 * Run: npx tsx src/features/diceRoller/strokeOfLuckJournal.selfcheck.ts
 */
import {
  applyStrokeOfLuckToEntry,
  entryAllowsStrokeOfLuck,
  journalEntryLuckText,
} from './strokeOfLuckJournal.ts'
import type { DiceLogEntry } from './types.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const miss: DiceLogEntry = {
  id: 'e1',
  at: Date.now(),
  expression: '1d20+4',
  advantageMode: 'none',
  total: 7,
  modifierTotal: 4,
  dice: [{ sides: 20, value: 3, dropped: false, nat: '1' }],
  title: 'Атлетика',
  toastText: 'Атлетика: 7 (d20:3 +4)',
  source: 'sheet',
  repeatable: true,
}

assert(entryAllowsStrokeOfLuck(miss), 'miss check allows luck')
assert(journalEntryLuckText(miss).includes('Атлетика'), 'luck text')
const next = applyStrokeOfLuckToEntry(miss)
assert(next, 'applied')
assert(next.total === 24, `total 20+4 got ${next.total}`)
assert(next.dice[0]?.value === 20, 'd20 face → 20')
assert(next.toastText?.includes('d20:20'), 'toast shows 20')
assert(next.toastText?.includes('удача'), 'toast marks luck')
assert(!entryAllowsStrokeOfLuck(next), 'already lucked')

const attack: DiceLogEntry = {
  id: 'e2',
  at: Date.now(),
  expression: '1d20+5',
  advantageMode: 'none',
  total: 12,
  modifierTotal: 5,
  dice: [{ sides: 20, value: 7, dropped: false }],
  title: 'Кинжал',
  toastText: 'Кинжал: 12 (d20:7 +5) · урон 4 (1d4: 2+2)',
  source: 'sheet',
  repeatable: true,
}
assert(entryAllowsStrokeOfLuck(attack), 'attack allows luck')
const hit = applyStrokeOfLuckToEntry(attack)
assert(hit?.toastText?.includes('попадание (удача)'), 'attack marked hit')

console.log('strokeOfLuckJournal.selfcheck: ok')
