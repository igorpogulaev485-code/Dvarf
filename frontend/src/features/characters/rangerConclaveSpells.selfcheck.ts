/**
 * Q4 ranger conclave bonus spells.
 * Run: npx tsx frontend/src/features/characters/rangerConclaveSpells.selfcheck.ts
 */

import { createClassLevel } from '../../shared/dnd/classLevels.ts'
import {
  rangerConclaveSpellsForSlug,
  syncRangerConclaveSpells,
} from './rangerConclaveSpells.ts'
import { readSpells } from './spells.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

for (const [slug, n] of [
  ['gloom_stalker', 5],
  ['horizon_walker', 5],
  ['monster_slayer', 5],
  ['fey_wanderer', 5],
  ['swarmkeeper', 6],
] as const) {
  const pack = rangerConclaveSpellsForSlug(slug)
  assert(pack, `${slug} pack`)
  assert(pack.spells.length === n, `${slug} expected ${n}, got ${pack.spells.length}`)
}

{
  const classes = [
    createClassLevel({
      id: 'r1',
      name: 'Следопыт',
      level: 5,
      subclass_name: 'Странник горизонта',
    }),
  ]
  const synced = syncRangerConclaveSpells({
    spells: readSpells({}),
    classes,
    subclassSlugByEntryId: { r1: 'horizon_walker' },
  })
  assert(synced.changed, 'horizon sync changes')
  assert(
    synced.spells.known.length === 2,
    `horizon L5 → 2 spells, got ${synced.spells.known.length}`,
  )
}

{
  const classes = [
    createClassLevel({
      id: 'r1',
      name: 'Следопыт',
      level: 3,
      subclass_name: 'Хранитель роя',
    }),
  ]
  const synced = syncRangerConclaveSpells({
    spells: readSpells({}),
    classes,
    subclassSlugByEntryId: { r1: 'swarmkeeper' },
  })
  assert(
    synced.spells.known.length === 2,
    `swarm L3 → Mage Hand + Faerie Fire, got ${synced.spells.known.length}`,
  )
}

console.log('rangerConclaveSpells.selfcheck: all ok')
