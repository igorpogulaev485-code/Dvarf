/**
 * Run: npx --yes tsx src/features/characters/pactChainEffects.selfcheck.ts
 */
import { emptyFeaturePicks, setFeaturePick } from '../../shared/dnd/featurePicks.ts'
import { createSheetSpell, type SpellsState } from './spells.ts'
import {
  PACT_BOON_FEATURE_ID,
} from './pactTomeEffects.ts'
import {
  pactChainFamiliarSpellId,
  syncPactChainFamiliar,
} from './pactChainEffects.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function emptySpells(): SpellsState {
  return {
    casting_ability: 'cha',
    max_prepared: null,
    slots: {},
    pact_slots: null,
    known: [],
  }
}

const classId = 'warlock-1'
let picks = setFeaturePick(
  emptyFeaturePicks(),
  classId,
  PACT_BOON_FEATURE_ID,
  'chain',
)

const on = syncPactChainFamiliar({
  spells: emptySpells(),
  featurePicks: picks,
  classes: [{ id: classId, name: 'Колдун', level: 5 }],
})
assert(on.changed, 'chain injects familiar')
assert(on.spells.known.length === 1, 'one row')
const row = on.spells.known[0]!
assert(row.id === pactChainFamiliarSpellId(), 'stable id')
assert(row.name === 'Поиск фамильяра', 'RU name')
assert(row.class_slug === 'warlock', 'warlock slug')
assert(row.prepared_locked, 'locked')
assert(row.ritual, 'ritual')

const off = syncPactChainFamiliar({
  spells: on.spells,
  featurePicks: setFeaturePick(picks, classId, PACT_BOON_FEATURE_ID, 'blade'),
  classes: [{ id: classId, name: 'Колдун', level: 5 }],
})
assert(off.changed, 'blade removes chain spell')
assert(off.spells.known.length === 0, 'cleared')

const keepOther = syncPactChainFamiliar({
  spells: {
    ...emptySpells(),
    known: [
      { ...createSheetSpell(), id: 'other', name: 'Мистический заряд', level: 0 },
    ],
  },
  featurePicks: emptyFeaturePicks(),
  classes: [{ id: classId, name: 'Колдун', level: 5 }],
})
assert(!keepOther.changed, 'no pact → no change')
assert(keepOther.spells.known.length === 1, 'other kept')

console.log('pactChainEffects.selfcheck: ok')
