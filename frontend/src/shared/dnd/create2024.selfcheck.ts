/** P24-M03 selfcheck — run: npm run selfcheck:p24-m03-create */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RULES_EDITION_2024_OPEN } from './rulesEdition2024'
import {
  CREATE_2024_STEPS,
  CREATE_2024_STEP_LABELS,
  createEmptyCreate2024State,
  isCasterAtLevel1,
  toCreate2024Request,
  visibleCreate2024Steps,
  type Create2024StepId,
} from '../../features/createPipeline2024/createPipeline2024Types'
import {
  backgroundAsiOverlay,
  canAdvanceCreate2024Step,
  setAsiPlus2Plus1,
} from '../../features/createPipeline2024/createPipeline2024State'
import { buildCreate2024Fixtures, FIXTURE_LANGUAGES } from '../../features/createPipeline2024/createPipeline2024Fixtures'
import type { CatalogEntry } from '../api/catalog'

assert.equal(RULES_EDITION_2024_OPEN, false, '2024 flag stays closed')

assert.deepEqual(
  [...CREATE_2024_STEPS],
  [
    'class',
    'background',
    'species',
    'abilities',
    'languages',
    'equipment',
    'spells',
    'summary',
  ],
)
assert.equal(CREATE_2024_STEP_LABELS.species, 'Вид')

const fixtures = buildCreate2024Fixtures()
assert.ok(fixtures.classes.some((c) => c.slug === 'fighter' && c.name_ru === 'Воин'))
assert.ok(fixtures.classes.some((c) => c.slug === 'wizard'))
assert.ok(fixtures.classes.some((c) => c.slug === 'cleric'))
assert.ok(
  fixtures.classes.some((c) => c.slug === 'artificer' && c.name_ru === 'Артефактор'),
  'Артефактор in fixtures',
)
assert.equal(FIXTURE_LANGUAGES.choice_count, 2)
assert.ok(FIXTURE_LANGUAGES.languages.some((l) => l.id === 'common-sign-language'))

const fighter = fixtures.classes.find((c) => c.slug === 'fighter')!
const wizard = fixtures.classes.find((c) => c.slug === 'wizard')!
assert.equal(isCasterAtLevel1(fighter), false)
assert.equal(isCasterAtLevel1(wizard), true)
assert.ok(!visibleCreate2024Steps(fighter).includes('spells'))
assert.ok(visibleCreate2024Steps(wizard).includes('spells'))

const empty = createEmptyCreate2024State()
assert.equal(empty.step, 'class')
assert.equal(
  canAdvanceCreate2024Step('class', empty, {
    classEntry: null,
    backgroundEntry: null,
    speciesEntry: null,
    languageChoiceCount: 2,
  }),
  false,
)

function find(list: CatalogEntry[], slug: string) {
  return list.find((e) => e.slug === slug)!
}

const soldier = find(fixtures.backgrounds, 'soldier')
const dwarf = find(fixtures.species, 'dwarf')

let state = createEmptyCreate2024State()
state = {
  ...state,
  classSlug: 'fighter',
  classSkillIds: ['athletics', 'perception'],
  weaponMasteryIds: ['longsword', 'longbow', 'battleaxe'],
  fightingStyleSlug: 'defense',
  backgroundSlug: 'soldier',
  backgroundAsiMode: '+2/+1',
  backgroundAsi: setAsiPlus2Plus1(['str', 'dex', 'con'], 'str', 'con'),
  backgroundToolId: 'dice-set',
  speciesSlug: 'dwarf',
  speciesSize: 'medium',
  abilityMethod: 'standard_array',
  baseAbilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
  languageIds: ['elvish', 'dwarvish'],
  classEquipment: 'a',
  backgroundEquipment: 'pack',
  characterName: 'Тест-воин',
}

assert.equal(
  canAdvanceCreate2024Step('class', state, {
    classEntry: fighter,
    backgroundEntry: soldier,
    speciesEntry: dwarf,
    languageChoiceCount: 2,
  }),
  true,
)
assert.equal(
  canAdvanceCreate2024Step('background', state, {
    classEntry: fighter,
    backgroundEntry: soldier,
    speciesEntry: dwarf,
    languageChoiceCount: 2,
  }),
  true,
)
assert.deepEqual(backgroundAsiOverlay(state), { str: 2, con: 1 })

const req = toCreate2024Request(state, { isPreview: true })
assert.equal(req.is_preview, true)
assert.equal(req.subclass_slug, null)
assert.equal(req.class_slug, 'fighter')
assert.deepEqual(req.language_ids, ['elvish', 'dwarvish'])

// Source contracts — 2014 page untouched; routes + API helpers present.
const here = dirname(fileURLToPath(import.meta.url))
const create2014 = readFileSync(join(here, '../../pages/CreateCharacterPage.tsx'), 'utf8')
assert.match(create2014, /createCharacter\('2014'/, '2014 create stays hardcoded')
assert.doesNotMatch(create2014, /createCharacter2024/, '2014 page does not call 2024 create')

const appSrc = readFileSync(join(here, '../../App.tsx'), 'utf8')
assert.match(appSrc, /\/dev\/p24-m03-preview/, 'dev preview route')
assert.match(appSrc, /\/characters\/create-2024/, 'create-2024 route')

const apiSrc = readFileSync(join(here, '../api/characters.ts'), 'utf8')
assert.match(apiSrc, /export async function createCharacter2024/)
assert.match(apiSrc, /export async function validateCreate2024/)
assert.match(apiSrc, /export async function listCreate2024Languages/)
assert.match(apiSrc, /Редакция 2024 ещё не открыта/, '2014 gate on createCharacter kept')

const btnSrc = readFileSync(
  join(here, '../../features/characters/CreateCharacterButton.tsx'),
  'utf8',
)
assert.match(btnSrc, /RULES_EDITION_2024_OPEN/, 'CTA gated')
assert.match(btnSrc, /create-character-2024/)

const shellSrc = readFileSync(
  join(here, '../../features/createPipeline/CreatePipelineShell.tsx'),
  'utf8',
)
assert.match(shellSrc, /stepLabels/, 'shell accepts custom step labels')

const wizardSrc = readFileSync(join(here, '../../pages/CreateCharacter2024Page.tsx'), 'utf8')
assert.match(wizardSrc, /p24-m03-next/)
assert.match(wizardSrc, /p24-m03-finish/)
assert.match(wizardSrc, /is_preview:\s*true|isPreview:\s*true/)
assert.match(wizardSrc, /черта происхождения|Черта происхождения/)

// Step order type exhaustiveness for labels
for (const id of CREATE_2024_STEPS) {
  assert.ok(CREATE_2024_STEP_LABELS[id as Create2024StepId])
}

console.log('create2024.selfcheck: ok')
