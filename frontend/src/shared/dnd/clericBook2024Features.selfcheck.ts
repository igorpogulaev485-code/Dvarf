/** P24-M02B-cleric selfcheck — npm run selfcheck:p24-m02b-cleric */
import assert from 'node:assert/strict'
import {
  ARCANA_DOMAIN_NAME_RU,
  DISPELLING_RECOVERY_FEATURE_ID,
  DISPELLING_RECOVERY_NAME_RU,
  DIVINE_FOREKNOWLEDGE_FEATURE_ID,
  FORBIDDEN_PATH_TO_GRAVE_2014_NAME_RU,
  GRAVE_DOMAIN_NAME_RU,
  KEEPER_OF_SOULS_NAME_RU,
  KNOWLEDGE_DOMAIN_NAME_RU,
  MODIFY_MAGIC_FEATURE_ID,
  MODIFY_MAGIC_NAME_RU,
  MIND_MAGIC_FEATURE_ID,
  MIND_MAGIC_NAME_RU,
  PATH_TO_THE_GRAVE_FEATURE_ID,
  PATH_TO_THE_GRAVE_NAME_RU,
  SENTINEL_AT_DEATHS_DOOR_FEATURE_ID,
  arcanaAlwaysPrepared2024,
  clericBookFeatureIdsAtLevel2024,
  graveAlwaysPrepared2024,
  isArcanaDomain2024,
  isGraveDomain2024,
  isKnowledgeDomain2024,
  isM02bClericBookSubclass,
  keeperOfSoulsHeal2024,
  knowledgeAlwaysPrepared2024,
  sentinelPoolMax2024,
} from './clericBook2024Features'
import { isPhb2024CreateSubclass, sharedOptionsForSubclass2024 } from './edition2024Subclasses'

assert.equal(isM02bClericBookSubclass('cleric__arcana-domain'), true)
assert.equal(isM02bClericBookSubclass('cleric__knowledge-domain'), true)
assert.equal(isM02bClericBookSubclass('cleric__grave-domain'), true)
assert.equal(isArcanaDomain2024('cleric__arcana-domain'), true)
assert.equal(isKnowledgeDomain2024('cleric__knowledge-domain'), true)
assert.equal(isGraveDomain2024('cleric__grave-domain'), true)
assert.equal(isPhb2024CreateSubclass('cleric__arcana-domain'), true)
assert.equal(isPhb2024CreateSubclass('cleric__life-domain'), true)

assert.equal(ARCANA_DOMAIN_NAME_RU, 'Домен магии')
assert.equal(KNOWLEDGE_DOMAIN_NAME_RU, 'Домен знания')
assert.equal(GRAVE_DOMAIN_NAME_RU, 'Домен упокоения')
assert.equal(MODIFY_MAGIC_NAME_RU, 'Изменение магии')
assert.equal(MIND_MAGIC_NAME_RU, 'Магия разума')
assert.equal(PATH_TO_THE_GRAVE_NAME_RU, 'Путь к могиле')
assert.equal(FORBIDDEN_PATH_TO_GRAVE_2014_NAME_RU, 'Путь в могилу')
assert.equal(SENTINEL_AT_DEATHS_DOOR_FEATURE_ID, 'sentinel-at-death-s-door')
assert.equal(KEEPER_OF_SOULS_NAME_RU, 'Хранитель душ')

const arcanaL3 = arcanaAlwaysPrepared2024(3)
assert.ok(arcanaL3.includes('magic-missile'), `arcana L3: ${arcanaL3.join(',')}`)
assert.ok(arcanaL3.includes('detect-magic'), `arcana L3: ${arcanaL3.join(',')}`)

const knowledgeL5 = knowledgeAlwaysPrepared2024(5)
assert.ok(knowledgeL5.includes('dispel-magic'), `knowledge L5: ${knowledgeL5.join(',')}`)

const graveL7 = graveAlwaysPrepared2024(7)
assert.ok(graveL7.includes('death-ward'), `grave L7: ${graveL7.join(',')}`)

assert.equal(sentinelPoolMax2024(3), 3)
assert.equal(sentinelPoolMax2024(-1), 1)
assert.equal(keeperOfSoulsHeal2024(17), 34)

assert.deepEqual(
  clericBookFeatureIdsAtLevel2024({ subclassSlug: 'cleric__arcana-domain', clericLevel: 3 }),
  [
    'arcana-domain-spells',
    MODIFY_MAGIC_FEATURE_ID,
    'student-of-arcana',
  ],
)
assert.deepEqual(
  clericBookFeatureIdsAtLevel2024({ subclassSlug: 'cleric__arcana-domain', clericLevel: 17 }),
  [
    'arcana-domain-spells',
    MODIFY_MAGIC_FEATURE_ID,
    'student-of-arcana',
    DISPELLING_RECOVERY_FEATURE_ID,
    'magical-mastery',
  ],
)
assert.deepEqual(
  clericBookFeatureIdsAtLevel2024({ subclassSlug: 'cleric__knowledge-domain', clericLevel: 6 }),
  [
    'knowledge-domain-spells',
    'blessings-of-knowledge',
    MIND_MAGIC_FEATURE_ID,
    'unfettered-mind',
  ],
)
assert.deepEqual(
  clericBookFeatureIdsAtLevel2024({ subclassSlug: 'cleric__grave-domain', clericLevel: 17 }),
  [
    'grave-domain-spells',
    'circle-of-mortality',
    PATH_TO_THE_GRAVE_FEATURE_ID,
    SENTINEL_AT_DEATHS_DOOR_FEATURE_ID,
    'divine-reaper',
  ],
)
assert.deepEqual(
  clericBookFeatureIdsAtLevel2024({ subclassSlug: 'cleric__life-domain', clericLevel: 14 }),
  [],
)

const arcanaOpts = sharedOptionsForSubclass2024('cleric__arcana-domain', 6)
assert.ok(
  arcanaOpts.some((o) => o.feature_id === MODIFY_MAGIC_FEATURE_ID && o.kind === 'cast'),
  JSON.stringify(arcanaOpts),
)
const knowledgeOpts = sharedOptionsForSubclass2024('cleric__knowledge-domain', 6)
assert.ok(
  knowledgeOpts.some((o) => o.feature_id === MIND_MAGIC_FEATURE_ID && o.kind === 'action'),
)
const graveOpts = sharedOptionsForSubclass2024('cleric__grave-domain', 6)
assert.ok(
  graveOpts.some(
    (o) =>
      o.feature_id === PATH_TO_THE_GRAVE_FEATURE_ID &&
      o.kind === 'bonus' &&
      o.name_ru === PATH_TO_THE_GRAVE_NAME_RU,
  ),
)

console.log('clericBook2024Features.selfcheck ok')