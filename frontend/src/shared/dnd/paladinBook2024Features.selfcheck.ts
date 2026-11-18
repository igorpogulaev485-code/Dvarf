/**
 * Lightweight self-check: npx --yes tsx --tsconfig tsconfig.app.json \
 *   src/shared/dnd/paladinBook2024Features.selfcheck.ts
 */
import assert from 'node:assert/strict'
import {
  ELEMENTAL_SMITE_MODES_2024,
  GENIES_SPLENDOR_SKILLS_2024,
  M02B_PALADIN_BOOK_SLUGS,
  OATH_OF_THE_NOBLE_GENIES_NAME_RU,
  elementalRebukeDamageFormulaRu2024,
  elementalRebukePoolMax2024,
  genieAlwaysPrepared2024,
  geniesSplendorAcFormula2024,
  isOathOfTheNobleGenies2024,
  paladinBookAllowlistOpen2024,
  paladinBookFeatureIdsAtLevel2024,
} from './paladinBook2024Features'
import { isPhb2024CreateSubclass, M02B_PALADIN_BOOK_SUBCLASS_SLUGS } from './edition2024Subclasses'

assert.deepEqual([...M02B_PALADIN_BOOK_SLUGS], ['paladin__oath-of-the-noble-genies'])
assert.equal(OATH_OF_THE_NOBLE_GENIES_NAME_RU, 'Клятва благородных гениев')
assert.equal(isOathOfTheNobleGenies2024('paladin__oath-of-the-noble-genies'), true)
assert.equal(isOathOfTheNobleGenies2024('paladin__oath-of-glory'), false)
assert.equal(paladinBookAllowlistOpen2024('paladin__oath-of-the-noble-genies'), true)
assert.equal(isPhb2024CreateSubclass('paladin__oath-of-the-noble-genies'), true)
assert.equal(M02B_PALADIN_BOOK_SUBCLASS_SLUGS.has('paladin__oath-of-the-noble-genies'), true)
assert.equal(isPhb2024CreateSubclass('paladin__oath-of-the-crown'), false)

assert.deepEqual(paladinBookFeatureIdsAtLevel2024('paladin__oath-of-the-noble-genies', 3), [
  'elemental-smite',
  'genie-spells',
  'genies-splendor',
])
assert.ok(paladinBookFeatureIdsAtLevel2024('paladin__oath-of-the-noble-genies', 7).includes('aura-of-elemental-shielding'))
assert.ok(paladinBookFeatureIdsAtLevel2024('paladin__oath-of-the-noble-genies', 15).includes('elemental-rebuke'))
assert.ok(paladinBookFeatureIdsAtLevel2024('paladin__oath-of-the-noble-genies', 20).includes('noble-scion'))
assert.deepEqual(paladinBookFeatureIdsAtLevel2024('paladin__oath-of-glory', 20), [])

const free3 = genieAlwaysPrepared2024(3)
assert.ok(free3.includes('thunderous-smite'))
assert.ok(free3.includes('chromatic-orb'))
assert.ok(free3.includes('elementalism'))
assert.ok(!genieAlwaysPrepared2024(4).includes('phantasmal-force'))
assert.ok(genieAlwaysPrepared2024(5).includes('phantasmal-force'))

const ac = geniesSplendorAcFormula2024(3)
assert.equal(ac.base, 13)
assert.equal(ac.allowsShield, true)
assert.equal(ac.key, 'genies_splendor')

assert.equal(elementalRebukePoolMax2024(3), 3)
assert.equal(elementalRebukePoolMax2024(0), 1)
assert.equal(elementalRebukeDamageFormulaRu2024(3), '2к10+3')
assert.deepEqual([...ELEMENTAL_SMITE_MODES_2024], ['marid', 'dao', 'djinn', 'efreet'])
assert.deepEqual([...GENIES_SPLENDOR_SKILLS_2024], [
  'acrobatics',
  'performance',
  'intimidation',
  'persuasion',
])

console.log('paladinBook2024Features.selfcheck ok')
