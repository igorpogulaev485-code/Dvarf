/** P24-M02a selfcheck — run: npm run selfcheck:p24-m02a-classes */
import assert from 'node:assert/strict'
import {
  actionSurgeAllowsAction2024,
  applyShortRestResources2024,
  checkMulticlassPrerequisites2024,
  computeProgression2024,
  listClassSlugs2024,
  multiclassCasterLevel2024,
  SRD_SUBCLASS_BY_PARENT,
  slotsForCasterLevel2024,
} from './edition2024Classes'
import { createClassLevel } from './classLevels'
import { RULES_EDITION_2024_OPEN } from './rulesEdition2024'

assert.equal(RULES_EDITION_2024_OPEN, false)

const slugs = listClassSlugs2024()
assert.ok(slugs.includes('fighter'))
assert.ok(slugs.includes('artificer'))
assert.equal(slugs.length, 13)

for (const level of [1, 3, 5, 11, 20]) {
  const snap = computeProgression2024({
    classes: [
      createClassLevel({
        name: 'Воин',
        level,
        catalog_id: 'fighter',
        subclass_catalog_id: level >= 3 ? SRD_SUBCLASS_BY_PARENT.fighter : null,
      }),
    ],
  })
  assert.equal(snap.proficiency_bonus, Math.floor((level - 1) / 4) + 2)
  const sw = snap.desiredResources.find((r) => r.id.includes('second_wind'))
  assert.ok(sw, `second_wind L${level}`)
  if (level >= 2) {
    const surge = snap.desiredResources.find((r) => r.id.includes('action_surge'))
    assert.ok(surge, `action_surge L${level}`)
  }
}

const wiz = computeProgression2024({
  classes: [
    createClassLevel({
      name: 'Волшебник',
      level: 5,
      catalog_id: 'wizard',
      subclass_catalog_id: SRD_SUBCLASS_BY_PARENT.wizard,
    }),
  ],
})
assert.equal(wiz.spellcasting[0]?.prepared_spells, 9)
assert.ok(wiz.desiredResources.some((r) => r.id.includes('arcane_recovery')))

const bard = computeProgression2024({
  classes: [createClassLevel({ name: 'Бард', level: 5, catalog_id: 'bard' })],
  abilities: { cha: 16 },
})
const bi = bard.desiredResources.find((r) => r.id.includes('bardic_inspiration'))
assert.ok(bi)
assert.equal(bi!.max, 3) // CHA 16 → +3, not PB
assert.equal(bi!.reset, 'short')
assert.ok(!bi!.id.includes('heroic'))

const bardLow = computeProgression2024({
  classes: [createClassLevel({ name: 'Бард', level: 1, catalog_id: 'bard' })],
  abilities: { cha: 8 },
})
const biLow = bardLow.desiredResources.find((r) => r.id.includes('bardic_inspiration'))
assert.equal(biLow!.max, 1)
assert.equal(biLow!.reset, 'long')

assert.equal(actionSurgeAllowsAction2024('magic'), false)
assert.equal(actionSurgeAllowsAction2024('attack'), true)

const after = applyShortRestResources2024([
  {
    id: 'feat:fighter:second_wind:second_wind',
    name: 'Второе дыхание',
    max: 3,
    used: 3,
    reset: 'long',
    shortRestRegain: 1,
  },
])
assert.equal(after[0]?.used, 2)

const ok = checkMulticlassPrerequisites2024({
  currentClasses: ['fighter'],
  newClass: 'wizard',
  abilities: { str: 15, dex: 10, con: 12, int: 14, wis: 10, cha: 10 },
})
assert.equal(ok.ok, true)

assert.equal(multiclassCasterLevel2024([
  { slug: 'cleric', level: 3 },
  { slug: 'wizard', level: 2 },
]), 5)
assert.equal(slotsForCasterLevel2024(5)['3'], 2)

console.log('edition2024Classes.selfcheck: ok')
