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
import { raceDarkvisionFallbackFt } from '../../shared/dnd/race.ts'

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

assert.equal(
  raceDarkvisionFallbackFt({ raceName: 'Дварф (горный)' }),
  60,
  'dwarf name → 60 ft',
)
assert.equal(
  raceDarkvisionFallbackFt({ slug: 'mountain_dwarf', parentSlug: 'dwarf' }),
  60,
  'mountain_dwarf → 60 ft',
)
assert.equal(raceDarkvisionFallbackFt({ raceName: 'Человек' }), 0)
assert.equal(
  raceDarkvisionFallbackFt({ grantDarkvision: 120, raceName: 'Человек' }),
  120,
)

const part2 = readFileSync(
  join(root, 'src/features/characters/minimalSheet/useSheetEditorPart2.ts'),
  'utf8',
)
assert.match(part2, /raceDarkvisionFallbackFt/)

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

const atUseStub = {
  id: 'open_hand_technique',
  classEntryId: 'monk',
  classLevel: 3,
  choice: {
    id: 'open_hand_effect',
    label_ru: 'Эффект Шквал (при попадании)',
    at_use: true,
    options: ['trip', 'push_15ft', 'no_reactions'],
  },
} as Parameters<typeof isFeatureChoiceComplete>[0]
assert.equal(
  isFeatureChoiceComplete(atUseStub, emptyFeaturePicks()),
  true,
  'at_use choice is complete without a sheet pick',
)
assert.match(panel, /!feature\.choice\.at_use/)

const bridged = bridgeOriginPicks({
  featurePicks: emptyFeaturePicks(),
  classEntryId: 'sorcerer',
  subclassSlug: 'draconic_bloodline',
  grantPicks: { values: { dragon_ancestor: 'red' } },
})
assert.equal(getFeatureChoicePick(bridged, 'sorcerer', 'dragon_ancestor', 'draconic_ancestry'), 'red')

console.log('abl01Abilities.selfcheck: ok')
