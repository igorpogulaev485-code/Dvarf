/** P24-M02B-bard selfcheck — npm run selfcheck:p24-m02b-bard */
import assert from 'node:assert/strict'
import {
  BLESSING_OF_MOONLIGHT_FEATURE_ID,
  CHANNELER_FEATURE_ID,
  CHANNELER_NAME_RU,
  COLLEGE_OF_THE_MOON_NAME_RU,
  COLLEGE_OF_THE_SPIRITS_NAME_RU,
  EMPOWERED_CHANNELING_FEATURE_ID,
  EMPOWERED_CHANNELING_NAME_RU,
  EVENTIDES_SPLENDOR_FEATURE_ID,
  FORBIDDEN_SPIRIT_SESSION_NAME_RU,
  FORBIDDEN_SPIRITS_FROM_BEYOND_NAME_RU,
  FORBIDDEN_TALES_FROM_BEYOND_NAME_RU,
  M02B_BARD_BOOK_SLUGS,
  MOONS_INSPIRATION_FEATURE_ID,
  MOONS_INSPIRATION_NAME_RU,
  MYSTICAL_CONNECTION_FEATURE_ID,
  PRIMAL_LORE_FEATURE_ID,
  SPIRITS_FROM_BEYOND_FEATURE_ID,
  SPIRITS_FROM_BEYOND_NAME_RU,
  SPIRITS_FROM_BEYOND_TABLE_2024,
  bardBookAllowlistOpen2024,
  bardBookFeatureIdsAtLevel2024,
  isCollegeOfTheMoon2024,
  isCollegeOfTheSpirits2024,
  isM02bBardBookSubclass,
  moonAlwaysPrepared2024,
  spiritsAlwaysPrepared2024,
  spiritsGuidedMaxRoll2024,
} from './bardBook2024Features'
import { isPhb2024CreateSubclass, sharedOptionsForSubclass2024 } from './edition2024Subclasses'

assert.equal(isM02bBardBookSubclass('bard__college-of-the-moon'), true)
assert.equal(isM02bBardBookSubclass('bard__college-of-the-spirits'), true)
assert.equal(isCollegeOfTheMoon2024('bard__college-of-the-moon'), true)
assert.equal(isCollegeOfTheSpirits2024('bard__college-of-the-spirits'), true)
assert.equal(isPhb2024CreateSubclass('bard__college-of-the-moon'), true)
assert.equal(isPhb2024CreateSubclass('bard__college-of-the-spirits'), true)
assert.equal(isPhb2024CreateSubclass('bard__lore'), true)
assert.equal(bardBookAllowlistOpen2024('bard__college-of-the-moon'), true)
assert.equal(bardBookAllowlistOpen2024('bard__lore'), false)
assert.deepEqual([...M02B_BARD_BOOK_SLUGS], [
  'bard__college-of-the-moon',
  'bard__college-of-the-spirits',
])

assert.equal(COLLEGE_OF_THE_MOON_NAME_RU, 'Коллегия луны')
assert.equal(COLLEGE_OF_THE_SPIRITS_NAME_RU, 'Коллегия духов')
assert.equal(MOONS_INSPIRATION_NAME_RU, 'Вдохновение луны')
assert.equal(SPIRITS_FROM_BEYOND_NAME_RU, 'Замогильные духи')
assert.equal(CHANNELER_NAME_RU, 'Проводник')
assert.equal(EMPOWERED_CHANNELING_NAME_RU, 'Улучшенный призыв')
assert.equal(FORBIDDEN_SPIRITS_FROM_BEYOND_NAME_RU, 'Духи извне')
assert.equal(FORBIDDEN_TALES_FROM_BEYOND_NAME_RU, 'Сказания извне')
assert.equal(FORBIDDEN_SPIRIT_SESSION_NAME_RU, 'Сеанс духов')

assert.equal(SPIRITS_FROM_BEYOND_TABLE_2024.length, 12)
for (let i = 1; i <= 12; i += 1) {
  const row = SPIRITS_FROM_BEYOND_TABLE_2024[i - 1]
  assert.ok(row, `missing spirit roll ${i}`)
  assert.equal(row.roll, i)
  assert.ok(row.nameRu.length > 0, `spirit ${i} name`)
}

assert.equal(spiritsGuidedMaxRoll2024(6), 6)
assert.equal(spiritsGuidedMaxRoll2024(8), 8)
assert.equal(spiritsGuidedMaxRoll2024(10), 10)
assert.equal(spiritsGuidedMaxRoll2024(12), 12)
assert.equal(spiritsGuidedMaxRoll2024(4), 6)
assert.equal(spiritsGuidedMaxRoll2024(20), 12)

const moonL5 = moonAlwaysPrepared2024(5)
assert.ok(!moonL5.includes('moonbeam'), `moon L5: ${moonL5.join(',')}`)
const moonL6 = moonAlwaysPrepared2024(6)
assert.ok(moonL6.includes('moonbeam'), `moon L6: ${moonL6.join(',')}`)

const spiritsL5 = spiritsAlwaysPrepared2024(5)
assert.ok(!spiritsL5.includes('spirit-guardians'), `spirits L5: ${spiritsL5.join(',')}`)
const spiritsL6 = spiritsAlwaysPrepared2024(6)
assert.ok(spiritsL6.includes('spirit-guardians'), `spirits L6: ${spiritsL6.join(',')}`)

assert.deepEqual(bardBookFeatureIdsAtLevel2024('bard__college-of-the-moon', 3), [
  MOONS_INSPIRATION_FEATURE_ID,
  PRIMAL_LORE_FEATURE_ID,
])
assert.deepEqual(bardBookFeatureIdsAtLevel2024('bard__college-of-the-moon', 6), [
  MOONS_INSPIRATION_FEATURE_ID,
  PRIMAL_LORE_FEATURE_ID,
  BLESSING_OF_MOONLIGHT_FEATURE_ID,
])
assert.deepEqual(bardBookFeatureIdsAtLevel2024('bard__college-of-the-moon', 14), [
  MOONS_INSPIRATION_FEATURE_ID,
  PRIMAL_LORE_FEATURE_ID,
  BLESSING_OF_MOONLIGHT_FEATURE_ID,
  EVENTIDES_SPLENDOR_FEATURE_ID,
])
assert.deepEqual(bardBookFeatureIdsAtLevel2024('bard__college-of-the-spirits', 3), [
  CHANNELER_FEATURE_ID,
  SPIRITS_FROM_BEYOND_FEATURE_ID,
])
assert.deepEqual(bardBookFeatureIdsAtLevel2024('bard__college-of-the-spirits', 6), [
  CHANNELER_FEATURE_ID,
  SPIRITS_FROM_BEYOND_FEATURE_ID,
  EMPOWERED_CHANNELING_FEATURE_ID,
])
assert.deepEqual(bardBookFeatureIdsAtLevel2024('bard__college-of-the-spirits', 14), [
  CHANNELER_FEATURE_ID,
  SPIRITS_FROM_BEYOND_FEATURE_ID,
  EMPOWERED_CHANNELING_FEATURE_ID,
  MYSTICAL_CONNECTION_FEATURE_ID,
])
assert.deepEqual(bardBookFeatureIdsAtLevel2024('bard__lore', 14), [])

const moonOpts = sharedOptionsForSubclass2024('bard__college-of-the-moon', 6)
assert.ok(
  moonOpts.some(
    (o) =>
      o.feature_id === MOONS_INSPIRATION_FEATURE_ID &&
      o.kind === 'bonus' &&
      o.name_ru === MOONS_INSPIRATION_NAME_RU,
  ),
  JSON.stringify(moonOpts),
)
const spiritsOpts = sharedOptionsForSubclass2024('bard__college-of-the-spirits', 6)
assert.ok(
  spiritsOpts.some(
    (o) =>
      o.feature_id === SPIRITS_FROM_BEYOND_FEATURE_ID &&
      o.kind === 'bonus' &&
      o.name_ru === SPIRITS_FROM_BEYOND_NAME_RU,
  ),
  JSON.stringify(spiritsOpts),
)
assert.ok(
  !spiritsOpts.some((o) => o.name_ru === FORBIDDEN_SPIRITS_FROM_BEYOND_NAME_RU),
  'forbidden Духи извне still in shared options',
)

console.log('bardBook2024Features.selfcheck ok')
