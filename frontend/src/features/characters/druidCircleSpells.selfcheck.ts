/**
 * Run: npx --yes tsx src/features/characters/druidCircleSpells.selfcheck.ts
 */
import { createSheetSpell, type SpellsState } from './spells.ts'
import {
  syncDruidCircleSpells,
  WILDFIRE_CIRCLE_SPELLS,
} from './druidCircleSpells.ts'
import { findDualCastSiblings } from '../../shared/dnd/castProfiles.ts'

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

const druidId = 'druid-entry-1'
const sorcererBurning = {
  ...createSheetSpell(),
  id: 'sorc-burning',
  name: 'Огненные ладони',
  level: 1,
  catalog_id: 'burning_hands',
  class_slug: 'sorcerer',
  prepared: true,
}

// L4 wildfire: circle unlocks at 2 and 3 → 4 spells (not yet plant growth @5)
const atL4 = syncDruidCircleSpells({
  spells: { ...emptySpells(), known: [sorcererBurning] },
  classes: [
    {
      id: druidId,
      name: 'Друид',
      level: 4,
      subclass_name: 'Круг дикого огня',
    },
  ],
  subclassSlugByEntryId: { [druidId]: 'circle_of_wildfire' },
})
assert(atL4.changed, 'L4 should inject')
const l4Circle = atL4.spells.known.filter((row) =>
  row.id.startsWith(`subclass-spell:${druidId}:circle_of_wildfire:`),
)
assert(l4Circle.length === 4, `L4 circle count ${l4Circle.length}`)
assert(
  l4Circle.every((row) => row.class_slug === 'druid'),
  'circle rows tagged druid',
)
assert(
  l4Circle.every((row) => row.prepared_locked),
  'circle rows locked prepared',
)
assert(
  !l4Circle.some((row) => row.name === 'Рост растений'),
  'plant growth still locked at L4',
)

const dual = findDualCastSiblings(atL4.spells.known, sorcererBurning)
assert(dual.length === 2, `dual cast options got ${dual.length}`)
assert(
  dual.some((row) => row.class_slug === 'druid') &&
    dual.some((row) => row.class_slug === 'sorcerer'),
  'dual includes druid + sorcerer',
)

// L5 unlocks plant growth + revivify (+ flaming sphere / scorching ray from 3)
const atL5 = syncDruidCircleSpells({
  spells: emptySpells(),
  classes: [
    {
      id: druidId,
      name: 'Друид',
      level: 5,
      subclass_name: 'Круг дикого огня',
    },
  ],
  subclassSlugByEntryId: { [druidId]: 'circle_of_wildfire' },
})
const l5Circle = atL5.spells.known.filter((row) =>
  row.id.startsWith(`subclass-spell:${druidId}:circle_of_wildfire:`),
)
assert(l5Circle.length === 6, `L5 circle count ${l5Circle.length}`)
assert(
  l5Circle.some((row) => row.name === 'Огненные ладони'),
  'burning hands RU name',
)

// Moon circle: no managed circle rows
const moon = syncDruidCircleSpells({
  spells: atL5.spells,
  classes: [
    {
      id: druidId,
      name: 'Друид',
      level: 5,
      subclass_name: 'Круг луны',
    },
  ],
  subclassSlugByEntryId: { [druidId]: 'circle_of_the_moon' },
})
assert(moon.changed, 'moon clears wildfire rows')
assert(
  !moon.spells.known.some((row) => row.id.includes('circle_of_wildfire')),
  'wildfire rows removed',
)

assert(WILDFIRE_CIRCLE_SPELLS.length === 10, 'full wildfire list')

console.log('druidCircleSpells.selfcheck: ok')
