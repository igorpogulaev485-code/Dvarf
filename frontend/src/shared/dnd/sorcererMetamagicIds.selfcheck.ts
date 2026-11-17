/** Selfcheck: collectSorcererMetamagicIds for live / stale pick keys. */
import assert from 'node:assert/strict'
import { createClassLevel } from './classLevels.ts'
import { emptyFeaturePicks, setFeaturePick } from './featurePicks.ts'
import { collectSorcererMetamagicIds } from './sorcererMetamagicIds.ts'

const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const row = createClassLevel({
  id: uuid,
  name: 'Чародей',
  level: 7,
  catalog_id: 'sorcerer',
})
let picks = emptyFeaturePicks()
picks = setFeaturePick(picks, uuid, 'metamagic', 'empowered,quickened,twinned')

const fromClass = collectSorcererMetamagicIds({
  classes: [row],
  featurePicks: picks,
})
assert.deepEqual(fromClass.sort(), ['empowered', 'quickened', 'twinned'])

const staleOnly = collectSorcererMetamagicIds({
  classes: [createClassLevel({ id: 'new-id', name: 'Чародей', level: 7 })],
  featurePicks: picks,
})
assert.deepEqual(
  staleOnly.sort(),
  ['empowered', 'quickened', 'twinned'],
  'stale *:metamagic key still resolves',
)

const viaUnlocked = collectSorcererMetamagicIds({
  classes: [createClassLevel({ id: 'x', name: 'Герой', level: 7 })],
  featurePicks: setFeaturePick(emptyFeaturePicks(), 'x', 'metamagic', 'distant'),
  unlockedFeatures: [{ id: 'metamagic', classEntryId: 'x' }],
})
assert.deepEqual(viaUnlocked, ['distant'])

const viaCatalog = collectSorcererMetamagicIds({
  classes: [
    createClassLevel({
      id: 'c1',
      name: 'Custom',
      level: 5,
      catalog_id: 'sorcerer',
    }),
  ],
  featurePicks: setFeaturePick(emptyFeaturePicks(), 'c1', 'metamagic', 'subtle'),
})
assert.deepEqual(viaCatalog, ['subtle'])

console.log('sorcererMetamagicIds.selfcheck: ok')
