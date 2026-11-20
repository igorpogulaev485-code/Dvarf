/** P24-M02B-warlock selfcheck — npx tsx --tsconfig tsconfig.app.json src/shared/dnd/warlockBook2024Features.selfcheck.ts */
import assert from 'node:assert/strict'
import {
  FORBIDDEN_FORM_OF_DREAD_2014_NAME_RU,
  FORBIDDEN_VESTIGE_ECHO_NAME_RU,
  FORM_OF_DREAD_FEATURE_ID,
  FORM_OF_DREAD_NAME_RU,
  GRAVE_TOUCHED_FEATURE_ID,
  isM02bWarlockBookSubclass,
  isUndeadPatron2024,
  isVestigePatron2024,
  NECROTIC_HUSK_FEATURE_ID,
  SEMBLANCE_OF_LIFE_FEATURE_ID,
  SUPERIOR_DREAD_FEATURE_ID,
  UNDEAD_PATRON_NAME_RU,
  UNDEAD_PATRON_SPELLS_FEATURE_ID,
  undeadAlwaysPrepared2024,
  VESTIGE_COMPANION_FEATURE_ID,
  VESTIGE_COMPANION_NAME_RU,
  VESTIGE_PATRON_NAME_RU,
  VESTIGE_POWER_FEATURE_ID,
  VESTIGE_RECOVERY_FEATURE_ID,
  VESTIGE_SPELLS_FEATURE_ID,
  vestigeAlwaysPrepared2024,
  vestigeCompanionStats2024,
  warlockBookFeatureIdsAtLevel2024,
} from './warlockBook2024Features'
import { isPhb2024CreateSubclass } from './edition2024Subclasses'

assert.equal(isM02bWarlockBookSubclass('warlock__vestige-patron'), true)
assert.equal(isM02bWarlockBookSubclass('warlock__undead'), true)
assert.equal(isVestigePatron2024('warlock__vestige-patron'), true)
assert.equal(isUndeadPatron2024('warlock__undead'), true)
assert.equal(isPhb2024CreateSubclass('warlock__vestige-patron'), true)
assert.equal(isPhb2024CreateSubclass('warlock__undead'), true)
assert.equal(isPhb2024CreateSubclass('monk__warrior-of-the-mystic-arts'), true)
assert.equal(isPhb2024CreateSubclass('sorcerer__spellfire-sorcery'), true)

assert.equal(VESTIGE_PATRON_NAME_RU, 'Предтеча')
assert.equal(UNDEAD_PATRON_NAME_RU, 'Нежить')
assert.equal(VESTIGE_COMPANION_NAME_RU, 'Спутник-предтеча')
assert.equal(FORM_OF_DREAD_NAME_RU, 'Аватар ужаса')
assert.equal(FORBIDDEN_VESTIGE_ECHO_NAME_RU, 'Спутник-отголосок')
assert.equal(FORBIDDEN_FORM_OF_DREAD_2014_NAME_RU, 'Облик ужаса')

const warL3 = vestigeAlwaysPrepared2024({ warlockLevel: 3, domain: 'war' })
assert.ok(warL3.includes('spiritual-weapon'), `war L3 missing spiritual-weapon: ${warL3.join(',')}`)
assert.ok(warL3.includes('guiding-bolt'), `war L3 missing guiding-bolt: ${warL3.join(',')}`)

const undeadL5 = undeadAlwaysPrepared2024(5)
assert.ok(undeadL5.includes('summon-undead'), `undead L5 missing summon-undead: ${undeadL5.join(',')}`)

const companion = vestigeCompanionStats2024({
  type: 'fiend',
  warlockLevel: 5,
  chaMod: 3,
  characterLevel: 5,
})
assert.equal(companion.ac, 13 + 3)
assert.equal(companion.typeRu, 'Исчадие')

assert.deepEqual(
  warlockBookFeatureIdsAtLevel2024({
    subclassSlug: 'warlock__vestige-patron',
    warlockLevel: 3,
  }),
  [VESTIGE_SPELLS_FEATURE_ID, VESTIGE_COMPANION_FEATURE_ID],
)
assert.deepEqual(
  warlockBookFeatureIdsAtLevel2024({
    subclassSlug: 'warlock__vestige-patron',
    warlockLevel: 14,
  }),
  [
    VESTIGE_SPELLS_FEATURE_ID,
    VESTIGE_COMPANION_FEATURE_ID,
    VESTIGE_POWER_FEATURE_ID,
    VESTIGE_RECOVERY_FEATURE_ID,
    SEMBLANCE_OF_LIFE_FEATURE_ID,
  ],
)
assert.deepEqual(
  warlockBookFeatureIdsAtLevel2024({
    subclassSlug: 'warlock__undead',
    warlockLevel: 3,
  }),
  [UNDEAD_PATRON_SPELLS_FEATURE_ID, FORM_OF_DREAD_FEATURE_ID],
)
assert.deepEqual(
  warlockBookFeatureIdsAtLevel2024({
    subclassSlug: 'warlock__undead',
    warlockLevel: 14,
  }),
  [
    UNDEAD_PATRON_SPELLS_FEATURE_ID,
    FORM_OF_DREAD_FEATURE_ID,
    GRAVE_TOUCHED_FEATURE_ID,
    NECROTIC_HUSK_FEATURE_ID,
    SUPERIOR_DREAD_FEATURE_ID,
  ],
)
assert.deepEqual(
  warlockBookFeatureIdsAtLevel2024({
    subclassSlug: 'warlock__fiend-patron',
    warlockLevel: 14,
  }),
  [],
)

console.log('warlockBook2024Features.selfcheck ok')
