/**
 * Lightweight self-check: npx --yes tsx --tsconfig tsconfig.app.json \
 *   src/shared/dnd/rangerBook2024Features.selfcheck.ts
 */
import assert from 'node:assert/strict'
import {
  FORBIDDEN_DRAFT_POOL_IDS_2024,
  FORBIDDEN_RANGER_BOOK_LABELS_2024,
  HOLLOW_WARDEN_NAME_RU,
  HUNTERS_RIME_NAME_RU,
  M02B_RANGER_BOOK_SLUGS,
  WINTER_WALKER_NAME_RU,
  WRATH_OF_THE_WILD_NAME_RU,
  catalogAlwaysPreparedMatches2024,
  hollowWardenFeatureIdsAtLevel2024,
  huntersRimeTempHpFormulaRu2024,
  isHollowWarden2024,
  isWinterWalker2024,
  polarStrikesDie2024,
  rangerBookAllowlistOpen2024,
  rangerBookFeatureIdsAtLevel2024,
  undyingWrathHp2024,
  winterWalkerFeatureIdsAtLevel2024,
  wrathAcBonus2024,
} from './rangerBook2024Features'
import {
  buildSubclassResources2024,
  isPhb2024CreateSubclass,
  M02B_RANGER_BOOK_SUBCLASS_SLUGS,
} from './edition2024Subclasses'
import { ranger2024UseFeatureId } from './ranger2024Features'

assert.deepEqual([...M02B_RANGER_BOOK_SLUGS], [
  'ranger__winter-walker',
  'ranger__hollow-warden',
])
assert.equal(WINTER_WALKER_NAME_RU, 'Зимний ходок')
assert.equal(HOLLOW_WARDEN_NAME_RU, 'Страж пустошей')
assert.equal(HUNTERS_RIME_NAME_RU, 'Изморозь охотника')
assert.equal(WRATH_OF_THE_WILD_NAME_RU, 'Ярость дикой природы')
assert.equal(isWinterWalker2024('ranger__winter-walker'), true)
assert.equal(isHollowWarden2024('ranger__hollow-warden'), true)
assert.equal(isWinterWalker2024('ranger__hunter-ranger'), false)
assert.equal(rangerBookAllowlistOpen2024('ranger__winter-walker'), true)
assert.equal(rangerBookAllowlistOpen2024('ranger__hollow-warden'), true)
assert.equal(isPhb2024CreateSubclass('ranger__winter-walker'), true)
assert.equal(isPhb2024CreateSubclass('ranger__hollow-warden'), true)
assert.equal(M02B_RANGER_BOOK_SUBCLASS_SLUGS.has('ranger__winter-walker'), true)
assert.equal(isPhb2024CreateSubclass('ranger__horizon-walker'), false)

assert.deepEqual(winterWalkerFeatureIdsAtLevel2024(3), [
  'frigid-explorer',
  'hunters-rime',
  'winter-walker-spells',
])
assert.ok(winterWalkerFeatureIdsAtLevel2024(7).includes('fortifying-soul'))
assert.ok(winterWalkerFeatureIdsAtLevel2024(11).includes('chilling-retribution'))
assert.ok(winterWalkerFeatureIdsAtLevel2024(15).includes('frozen-haunt'))
assert.ok(hollowWardenFeatureIdsAtLevel2024(3).includes('wrath-of-the-wild'))
assert.ok(hollowWardenFeatureIdsAtLevel2024(7).includes('hungering-might'))
assert.ok(hollowWardenFeatureIdsAtLevel2024(11).includes('rot-and-violence'))
assert.ok(hollowWardenFeatureIdsAtLevel2024(15).includes('ancient-might'))
assert.deepEqual(rangerBookFeatureIdsAtLevel2024('ranger__hunter-ranger', 15), [])

const free3w = catalogAlwaysPreparedMatches2024('ranger__winter-walker', 3)
assert.ok(free3w.ok)
assert.ok(free3w.expected.includes('ice-knife'))
assert.ok(!catalogAlwaysPreparedMatches2024('ranger__winter-walker', 4).expected.includes('hold-person'))
assert.ok(catalogAlwaysPreparedMatches2024('ranger__winter-walker', 5).ok)
assert.ok(catalogAlwaysPreparedMatches2024('ranger__winter-walker', 5).expected.includes('hold-person'))

const free3h = catalogAlwaysPreparedMatches2024('ranger__hollow-warden', 3)
assert.ok(free3h.ok)
assert.ok(free3h.expected.includes('wrathful-smite'))
assert.ok(catalogAlwaysPreparedMatches2024('ranger__hollow-warden', 17).expected.includes('steel-wind-strike'))

assert.equal(polarStrikesDie2024(10), '1d4')
assert.equal(polarStrikesDie2024(11), '1d6')
assert.equal(wrathAcBonus2024(10), 1)
assert.equal(wrathAcBonus2024(11), 2)
assert.equal(huntersRimeTempHpFormulaRu2024(5), '1к10+5')
assert.equal(undyingWrathHp2024(15), 30)

assert.equal(ranger2024UseFeatureId('hunters-rime'), 'hunters-rime')
assert.equal(ranger2024UseFeatureId('wrath_of_the_wild'), 'wrath-of-the-wild')
assert.equal(ranger2024UseFeatureId('fortifying-soul'), 'fortifying-soul')
assert.equal(ranger2024UseFeatureId('ancient-might'), 'ancient-might')

for (const level of [3, 7, 11, 15, 20]) {
  const winter = buildSubclassResources2024({
    subclassSlug: 'ranger__winter-walker',
    classLevel: level,
    abilities: { wis: 16 },
  })
  const hollow = buildSubclassResources2024({
    subclassSlug: 'ranger__hollow-warden',
    classLevel: level,
    abilities: { wis: 16 },
  })
  for (const bad of FORBIDDEN_DRAFT_POOL_IDS_2024) {
    assert.equal(
      winter.some((r) => r.pool_id === bad),
      false,
      `winter L${level} must not have ${bad}`,
    )
    assert.equal(
      hollow.some((r) => r.pool_id === bad),
      false,
      `hollow L${level} must not have ${bad}`,
    )
  }
  for (const bad of FORBIDDEN_RANGER_BOOK_LABELS_2024) {
    assert.equal(
      winter.some((r) => r.name_ru === bad),
      false,
      `winter L${level} forbidden name ${bad}`,
    )
    assert.equal(
      hollow.some((r) => r.name_ru === bad),
      false,
      `hollow L${level} forbidden name ${bad}`,
    )
  }
  if (level >= 7) {
    assert.ok(winter.some((r) => r.pool_id === 'fortifying_soul'))
  }
  if (level >= 11) {
    assert.ok(winter.some((r) => r.pool_id === 'chilling_retribution' && r.max === 3))
  }
  if (level >= 15) {
    assert.ok(winter.some((r) => r.pool_id === 'frozen_haunt'))
    assert.ok(hollow.some((r) => r.pool_id === 'undying_wrath'))
  }
}

console.log('rangerBook2024Features.selfcheck: ok')
