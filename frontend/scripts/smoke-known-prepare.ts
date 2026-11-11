/** Slice 7: known vs prepared casting mode helpers. */
import {
  createSheetSpell,
  ensureKnownSpellsReady,
  isKnownSpellcastingMode,
  type SheetSpell,
} from '../src/features/characters/spells.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(
  isKnownSpellcastingMode({ maxPrepared: null, hasCasterSuggestion: true }) === true,
  'bard/sorcerer/warlock: known mode',
)
assert(
  isKnownSpellcastingMode({ maxPrepared: 8, hasCasterSuggestion: true }) === false,
  'cleric with prepare budget: prepared mode',
)
assert(
  isKnownSpellcastingMode({ maxPrepared: null, hasCasterSuggestion: false }) === false,
  'fighter / no caster: not known mode',
)
assert(
  isKnownSpellcastingMode({ maxPrepared: null }) === true,
  'omit suggestion → treat as known when no prepare cap',
)

const unready: SheetSpell[] = [
  { ...createSheetSpell(), id: 'a', name: 'Fire Bolt', level: 0, prepared: true },
  { ...createSheetSpell(), id: 'b', name: 'Magic Missile', level: 1, prepared: false },
  { ...createSheetSpell(), id: 'c', name: 'Shield', level: 1, prepared: true },
]

const ready = ensureKnownSpellsReady(unready)
assert(ready !== unready, 'must clone when fixing')
assert(ready.find((s) => s.id === 'b')?.prepared === true, 'leveled becomes ready')
assert(ready.find((s) => s.id === 'a')?.prepared === true, 'cantrip stays ready')
assert(ready.find((s) => s.id === 'c')?.prepared === true, 'already ready stays')

const already = ensureKnownSpellsReady(ready)
assert(already === ready, 'idempotent when all ready')

console.log('smoke-known-prepare: ok')
