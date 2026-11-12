import {
  SIDE_ENEMIES,
  SIDE_PARTY,
  alliesOf,
  foesOf,
  isAllySide,
  sideLabel,
} from './combatSides'
import { defaultHostileTargets, targetsFromSession } from './combatTargets'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(isAllySide(SIDE_PARTY, SIDE_PARTY), 'party ally')
assert(!isAllySide(SIDE_PARTY, SIDE_ENEMIES), 'party not enemy')
assert(sideLabel(SIDE_PARTY) === 'Партия', 'party label')
assert(sideLabel('kultisty', [{ id: 'kultisty', label: 'Культисты' }]) === 'Культисты', 'custom')

const pcId = 'pc-1'
const targets = targetsFromSession({
  seats: [
    {
      character_id: pcId,
      character_name: 'Торин',
      hp_current: 20,
      hp_max: 30,
      ac: 16,
      companions: [],
    },
    {
      character_id: 'pc-2',
      character_name: 'Грок',
      hp_current: 18,
      hp_max: 22,
      ac: 14,
      companions: [],
    },
  ],
  combatants: [
    {
      id: 'e1',
      name: 'Гоблин',
      ac: 15,
      members: [{ id: 'm1', name: 'Гоблин 1', hp_current: 7, hp_max: 7 }],
    },
  ],
  combat: {
    entries: [
      { kind: 'pc', ref_id: pcId, side: SIDE_PARTY },
      { kind: 'pc', ref_id: 'pc-2', side: SIDE_ENEMIES },
      { kind: 'enemy', ref_id: 'e1', side: SIDE_ENEMIES },
    ],
  },
})

const torin = targets.find((t) => t.name === 'Торин')
const grok = targets.find((t) => t.name === 'Грок')
const goblin = targets.find((t) => t.kind === 'enemy')
assert(torin?.side === SIDE_PARTY && torin.is_ally, 'torin ally')
assert(grok?.side === SIDE_ENEMIES && !grok.is_ally, 'grok foe for party actor')
assert(goblin && !goblin.is_ally, 'goblin foe')

const allies = alliesOf(targets, SIDE_PARTY)
assert(allies.every((t) => t.side === SIDE_PARTY), 'allies filter')
assert(!allies.some((t) => t.name === 'Гоблин 1'), 'heal allies skips goblin')

const hostile = defaultHostileTargets(targets, SIDE_ENEMIES)
assert(hostile.some((t) => t.name === 'Торин'), 'enemy defaults to party')
assert(!foesOf(targets, SIDE_PARTY).some((t) => t.name === 'Торин'), 'torin not foe of party')

console.log('sessionS05.selfcheck: ok')
