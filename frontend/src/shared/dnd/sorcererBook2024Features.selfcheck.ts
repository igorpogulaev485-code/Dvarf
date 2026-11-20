/**
 * Self-check for P24-M02B-sorcerer book helpers (node --import tsx).
 */
import assert from 'node:assert/strict'
import {
  BEASTS_OF_ILL_OMEN_NAME_RU,
  SPELLFIRE_BURST_NAME_RU,
  STRENGTH_OF_THE_GRAVE_NAME_RU,
  burningLifeMaxDice2024,
  isM02bSorcererBookSubclass,
  isShadowSorcery2024,
  isSpellfireSorcery2024,
  spellfireBurstDie2024,
  spellfireBurstTempHpBonus2024,
  strengthOfTheGraveDc2024,
  strengthOfTheGraveHp2024,
} from './sorcererBook2024Features'
import {
  alwaysPreparedForSubclass2024,
  buildPermanentBonuses2024,
  buildSubclassResources2024,
  isPhb2024CreateSubclass,
  sharedOptionsForSubclass2024,
} from './edition2024Subclasses'

assert.equal(SPELLFIRE_BURST_NAME_RU, 'Прорыв чаропламени')
assert.equal(BEASTS_OF_ILL_OMEN_NAME_RU, 'Звери дурных знамений')
assert.equal(STRENGTH_OF_THE_GRAVE_NAME_RU, 'Сила могилы')

assert.equal(isM02bSorcererBookSubclass('sorcerer__spellfire-sorcery'), true)
assert.equal(isSpellfireSorcery2024('sorcerer__spellfire-sorcery'), true)
assert.equal(isShadowSorcery2024('sorcerer__shadow-sorcery'), true)
assert.equal(isPhb2024CreateSubclass('sorcerer__spellfire-sorcery'), true)
assert.equal(isPhb2024CreateSubclass('sorcerer__shadow-sorcery'), true)
assert.equal(isPhb2024CreateSubclass('warlock__undead'), true)

assert.equal(spellfireBurstDie2024(3), '1d4')
assert.equal(spellfireBurstDie2024(14), '1d8')
assert.equal(
  spellfireBurstTempHpBonus2024({ sorcererLevel: 3, chaMod: 3, dieRoll: 2 }),
  5,
)
assert.equal(
  spellfireBurstTempHpBonus2024({ sorcererLevel: 14, chaMod: 3, dieRoll: 2 }),
  19,
)
assert.equal(strengthOfTheGraveHp2024({ chaMod: 3, sorcererLevel: 6 }), 9)
assert.equal(strengthOfTheGraveDc2024(12), 17)
assert.equal(burningLifeMaxDice2024(0), 1)
assert.equal(burningLifeMaxDice2024(4), 4)

assert.deepEqual(sharedOptionsForSubclass2024('sorcerer__spellfire-sorcery', 3), [])
assert.equal(
  buildSubclassResources2024({
    subclassSlug: 'sorcerer__shadow-sorcery',
    classLevel: 3,
    abilities: { cha: 16 },
  }).find((p) => p.pool_id === 'power_of_shadow')?.max,
  1,
)
assert.equal(
  buildSubclassResources2024({
    subclassSlug: 'sorcerer__spellfire-sorcery',
    classLevel: 3,
    abilities: { cha: 16 },
  }).find((p) => p.pool_id === 'spellfire_burst')?.name,
  'Прорыв чаропламени',
)
assert.equal(
  buildSubclassResources2024({
    subclassSlug: 'sorcerer__shadow-sorcery',
    classLevel: 14,
    abilities: { cha: 16 },
  }).find((p) => p.pool_id === 'shadow_walk')?.name,
  'Хождение по теням',
)
assert.equal(
  buildSubclassResources2024({
    subclassSlug: 'warlock__vestige-patron',
    classLevel: 3,
    abilities: { cha: 16 },
  }).find((p) => p.pool_id === 'vestige_companion')?.name,
  'Спутник-предтеча',
)

const free6 = alwaysPreparedForSubclass2024('sorcerer__spellfire-sorcery', 6)
assert.ok(free6.includes('counterspell'))
assert.ok(free6.includes('cure-wounds'))

const bonuses = buildPermanentBonuses2024({
  subclassSlug: 'sorcerer__spellfire-sorcery',
  classLevel: 18,
  abilities: { cha: 16 },
})
assert.ok(bonuses.some((b) => b.feature_id === 'crown-of-spellfire'))
assert.ok(bonuses.some((b) => b.name_ru === 'Прорыв чаропламени'))

console.log('sorcererBook2024Features.selfcheck ok')
