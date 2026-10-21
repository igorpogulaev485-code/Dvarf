/**
 * Run: npx --yes tsx src/features/characters/rangerConclaveSpells.selfcheck.ts
 */
import { createSheetSpell, type SpellsState } from './spells.ts'
import {
  gloomStalkerSpellId,
  syncRangerConclaveSpells,
} from './rangerConclaveSpells.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function emptySpells(): SpellsState {
  return {
    casting_ability: 'wis',
    max_prepared: null,
    slots: {},
    pact_slots: null,
    known: [],
    has_spell_focus: false,
    has_component_pouch: false,
  }
}

const classId = 'ranger-1'
const atL4 = syncRangerConclaveSpells({
  spells: emptySpells(),
  classes: [
    {
      id: classId,
      name: 'Следопыт',
      level: 4,
      subclass_name: 'Сумрачный охотник',
    },
  ],
})
assert(atL4.changed, 'L4 gloom sync changes sheet')
assert(atL4.spells.known.length === 1, 'L4 only Disguise Self')
assert(atL4.spells.known[0]?.name === 'Disguise Self', 'Disguise Self name')
assert(
  atL4.spells.known[0]?.id === gloomStalkerSpellId(classId, 'Disguise Self'),
  'stable spell id',
)
assert(atL4.spells.known[0]?.prepared_locked === true, 'always prepared')

const atL5 = syncRangerConclaveSpells({
  spells: atL4.spells,
  classes: [
    {
      id: classId,
      name: 'Следопыт',
      level: 5,
      subclass_name: 'Сумрачный охотник',
    },
  ],
})
assert(atL5.spells.known.length === 2, 'L5 adds Rope Trick')
assert(
  atL5.spells.known.some((row) => row.name === 'Rope Trick'),
  'Rope Trick present',
)

const hunter = syncRangerConclaveSpells({
  spells: atL5.spells,
  classes: [
    {
      id: classId,
      name: 'Следопыт',
      level: 5,
      subclass_name: 'Охотник',
    },
  ],
})
assert(hunter.spells.known.length === 0, 'hunter drops conclave spells')

// Custom spell must survive
const withCustom: SpellsState = {
  ...emptySpells(),
  known: [{ ...createSheetSpell(), name: 'Hunter’s Mark', level: 1 }],
}
const keepCustom = syncRangerConclaveSpells({
  spells: withCustom,
  classes: [
    {
      id: classId,
      name: 'Следопыт',
      level: 4,
      subclass_name: 'Сумрачный охотник',
    },
  ],
})
assert(
  keepCustom.spells.known.some((row) => row.name === 'Hunter’s Mark'),
  'player spells kept',
)
assert(
  keepCustom.spells.known.some((row) => row.name === 'Disguise Self'),
  'conclave added alongside',
)

console.log('rangerConclaveSpells.selfcheck: ok')
