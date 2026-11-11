/**
 * Q5: class change in create draft resets magic correctly.
 * Run: npx tsx frontend/src/features/createPipeline/createPipelineMagicReset.selfcheck.ts
 */

import { createSheetSpell, asAlwaysPreparedSpell } from '../characters/spells.ts'
import {
  casterSlugsForClasses,
  pruneSubclassSetupsForClasses,
  resetSpellsForClassChange,
} from './createPipelineMagicReset.ts'
import { createClassLevel } from '../../shared/dnd/classLevels.ts'
import { retainSpellsForRemainingClasses } from '../characters/spells.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

{
  const wizard = createClassLevel({ id: 'w1', name: 'Волшебник', level: 1 })
  const fighter = createClassLevel({ id: 'f1', name: 'Воин', level: 1 })
  assert(casterSlugsForClasses([wizard])[0] === 'wizard', 'wizard slug')
  assert(casterSlugsForClasses([fighter])[0] === 'fighter', 'fighter slug kept for prune')
}

{
  const race = {
    ...createSheetSpell(),
    id: 'race-spell:x:light',
    name: 'Свет',
    level: 0,
    source_kind: 'race' as const,
  }
  const wizCantrip = {
    ...createSheetSpell(),
    id: 'k1',
    name: 'Огненный болт',
    level: 0,
    class_slug: 'wizard',
  }
  const untagged = {
    ...createSheetSpell(),
    id: 'k2',
    name: 'Починка',
    level: 0,
  }
  const domain = asAlwaysPreparedSpell(
    {
      ...createSheetSpell(),
      id: 'subclass-spell:c1:life:bless',
      name: 'Благословение',
      level: 1,
    },
    { source_kind: 'subclass', label: 'Домен жизни' },
  )

  const kept = retainSpellsForRemainingClasses(
    [race, wizCantrip, untagged, domain],
    ['fighter'],
    { dropUntagged: true },
  )
  assert(kept.length === 1 && kept[0]?.id === race.id, 'Q5 swap keeps race only')

  const pruned = retainSpellsForRemainingClasses(
    [race, wizCantrip, untagged, domain],
    ['wizard'],
    { dropUntagged: false },
  )
  assert(
    pruned.some((s) => s.id === wizCantrip.id) &&
      pruned.some((s) => s.id === untagged.id) &&
      pruned.some((s) => s.id === race.id) &&
      !pruned.some((s) => s.id === domain.id),
    'Q5 MC prune keeps wizard+untagged+race, drops domain',
  )
}

{
  const setups = {
    a: { entry: { id: '1', slug: 'life', name_ru: 'Life' }, picks: { values: {} } },
    b: { entry: { id: '2', slug: 'devotion', name_ru: 'Devotion' }, picks: { values: {} } },
  }
  const next = pruneSubclassSetupsForClasses(setups as never, [
    createClassLevel({ id: 'a', name: 'Жрец', level: 1 }),
  ])
  assert(Object.keys(next).length === 1 && next.a, 'Q5 prune setups')
}

{
  const prev = {
    casting_ability: 'int' as const,
    max_prepared: null,
    slots: {},
    pact_slots: null,
    known: [
      {
        ...createSheetSpell(),
        id: 'k1',
        name: 'Огненный болт',
        level: 0,
        class_slug: 'wizard',
      },
    ],
  }
  const reset = resetSpellsForClassChange({
    prev: prev as never,
    remainingClasses: [createClassLevel({ id: 'f1', name: 'Воин', level: 1 })],
    dropUntagged: true,
  })
  assert(reset.known.length === 0, 'Q5 resetSpells clears wizard known on fighter')
}

console.log('createPipelineMagicReset.selfcheck: all ok')
