/** P24-M02b selfcheck — npm run selfcheck:p24-m02b-subclasses */
import assert from 'node:assert/strict'
import {
  alwaysPreparedForSubclass2024,
  buildSubclassResources2024,
  listSubclassSlugs2024,
  thirdCasterBlock2024,
} from './edition2024Subclasses'
import { computeProgression2024 } from './edition2024Classes'
import { createClassLevel } from './classLevels'

const slugs = listSubclassSlugs2024()
assert.equal(slugs.length, 76, `expected 76 subclasses, got ${slugs.length}`)

const bm = buildSubclassResources2024({
  subclassSlug: 'fighter__battlemaster',
  classLevel: 11,
})
assert.equal(bm[0]?.pool_id, 'superiority_dice')
assert.equal(bm[0]?.max, 5)

const alch = alwaysPreparedForSubclass2024('artificer__alchemist', 5)
assert.ok(alch.includes('healing-word'))
assert.ok(alch.includes('melfs-acid-arrow'))

const third = thirdCasterBlock2024('fighter__eldritch-knight', 3)
assert.ok(third)
assert.equal(third?.slots['1'], 2)

const snap = computeProgression2024({
  classes: [
    createClassLevel({
      name: 'Воин',
      level: 11,
      catalog_id: 'fighter',
      subclass_catalog_id: 'fighter__battlemaster',
      subclass_name: 'Мастер боевых искусств',
    }),
  ],
})
assert.ok(snap.desiredResources.some((r) => r.id.includes('superiority_dice')))
assert.ok(snap.features.some((f) => f.source === 'subclass'))

console.log('edition2024Subclasses.selfcheck: ok', {
  subclasses: slugs.length,
  bmDice: bm[0]?.max,
  alchSpells: alch.length,
})
