/**
 * ABL-01: filters, darkvision dedupe, dragon ancestor pick keys, piety gate.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/abl01Abilities.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getFeatureChoicePick,
  emptyFeaturePicks,
  setFeaturePick,
} from '../../shared/dnd/featurePicks.ts'
import { isFeatureChoiceComplete } from '../../shared/dnd/pendingFeatureChoices.ts'
import { bridgeOriginPicks } from '../../shared/dnd/pack04SorcererWarlock.ts'
import { displayResourceLabel } from '../../shared/dnd/rest.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const panel = readFileSync(
  join(root, 'src/features/characters/ClassFeaturesPanel.tsx'),
  'utf8',
)
const scenes = readFileSync(
  join(root, 'src/features/characters/minimalSheet/PlayDeskScenes.tsx'),
  'utf8',
)
const draft = readFileSync(
  join(root, 'src/features/characters/minimalSheet/draft.ts'),
  'utf8',
)

assert.match(panel, /id: 'needs_choice',\s*label: 'Нужен выбор'/)
assert.match(panel, /id: 'resource',\s*label: 'С ресурсом'/)
assert.match(panel, /id: 'passive',\s*label: 'Пассивные'/)
assert.match(panel, /id: 'custom',\s*label: 'Свои'/)
assert.doesNotMatch(panel, /label: 'Активные'/)
assert.doesNotMatch(panel, /label: 'Не выбраны опции'/)
assert.doesNotMatch(panel, /label: 'Подкласс'/)
assert.doesNotMatch(panel, /features-panel__lede/)
assert.match(panel, /Chip className="feature-card__need-choice-chip"/)
assert.match(panel, /isDarkvisionTrait/)
assert.match(panel, /compareFeaturesForAbl/)
assert.match(panel, /displayResourceLabel/)
assert.match(panel, /visibleFilters/)

assert.match(scenes, /allowed_sources\.includes\(\s*'mot'/)
assert.match(scenes, /model\.draft\.piety\.god/)
assert.match(draft, /bridgeFeaturePicksFromSubclassSetups/)
assert.match(draft, /bridgeOriginPicks/)

assert.equal(displayResourceLabel('Ки'), 'Ци')

const picksChoiceId = setFeaturePick(
  emptyFeaturePicks(),
  'sorcerer',
  'draconic_ancestry',
  'red',
)
const featureStub = {
  id: 'dragon_ancestor',
  classEntryId: 'sorcerer',
  classLevel: 5,
  choice: {
    id: 'draconic_ancestry',
    label_ru: 'Драконий предок',
    options: ['red'],
  },
} as Parameters<typeof isFeatureChoiceComplete>[0]

assert.equal(
  getFeatureChoicePick(picksChoiceId, 'sorcerer', 'dragon_ancestor', 'draconic_ancestry'),
  'red',
)
assert.equal(isFeatureChoiceComplete(featureStub, picksChoiceId), true)

const bridged = bridgeOriginPicks({
  featurePicks: emptyFeaturePicks(),
  classEntryId: 'sorcerer',
  subclassSlug: 'draconic_bloodline',
  grantPicks: { values: { dragon_ancestor: 'red' } },
})
assert.equal(getFeatureChoicePick(bridged, 'sorcerer', 'dragon_ancestor', 'draconic_ancestry'), 'red')

console.log('abl01Abilities.selfcheck: ok')
