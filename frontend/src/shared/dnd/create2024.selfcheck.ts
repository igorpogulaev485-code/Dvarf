/** P24-M03 selfcheck — run: npm run selfcheck:p24-m03-create */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RULES_EDITION_2024_OPEN } from './rulesEdition2024'
import {
  CREATE_2024_STEPS,
  CREATE_2024_STEP_LABELS,
  createEmptyCreate2024State,
  classL1Spellcasting,
  isCasterAtLevel1,
  toCreate2024Request,
  visibleCreate2024Steps,
  type Create2024StepId,
} from '../../features/createPipeline2024/createPipeline2024Types'
import {
  backgroundAsiOverlay,
  backgroundAsiTrio,
  canAdvanceCreate2024Step,
  classSkillNeed,
  classStartingPacks,
  classToolChoice,
  create2024StepIssues,
  creatableSpecies,
  fightingStyleFeats,
  findFeat,
  humanOriginFeatOptions,
  l1Invocations,
  masteryWeaponOptions,
  setAsiPlus2Plus1,
  speciesLineages,
  speciesNeedsAncestry,
  speciesNeedsOriginFeat,
  speciesSizeOptions,
  toolChoicePool,
  weaponMasteryLimit,
} from '../../features/createPipeline2024/createPipeline2024State'
import {
  featPickFields,
  originFeatSlugOf,
  speciesPickFields,
  spellsByLevelForClass,
  type FeatPicks,
  type PickField,
} from '../../features/createPipeline2024/create2024FeatPicks'
import {
  buildItemNameIndex,
  COMMON_LANGUAGE_NAME_RU,
} from '../../features/createPipeline2024/create2024Labels'
import { buildCreate2024SheetPreview } from '../../features/createPipeline2024/create2024SheetPreview'
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
assert.match(wizardSrc, /isPreview:\s*true/)
assert.match(wizardSrc, /createCharacter2024\(payload\)/, 'finish creates the character')
assert.match(wizardSrc, /navigate\(`\/characters\/\$\{created\.id\}`\)/, 'finish opens the real sheet')
assert.doesNotMatch(wizardSrc, /useFixtures|buildCreate2024Fixtures/, 'live wizard has no fixture fallback')
assert.doesNotMatch(wizardSrc, /createPipeline2024Fixtures/, 'live wizard never imports fixtures')
assert.match(wizardSrc, /Create2024DetailPanel/, 'rich detail panel')
assert.match(wizardSrc, /Create2024SheetPreview/, 'summary renders sheet preview')

const previewSrc = readFileSync(join(here, '../../pages/P24M03CreatePreviewPage.tsx'), 'utf8')
assert.match(previewSrc, /import\.meta\.env\.DEV/, 'fixtures only behind DEV')

for (const id of CREATE_2024_STEPS) {
  assert.ok(CREATE_2024_STEP_LABELS[id as Create2024StepId])
}

// Fixture completeness: every class / background / species from the shipped seed.
const backendData = join(here, '../../../../backend/data/srd/2024/live')
const frontendData = join(here, 'data/edition2024')
const hasBackend = existsSync(backendData)
function seedSlugs(prefix: string, kind: string): string[] {
  if (!hasBackend) return []
  const out: string[] = []
  const files = readdirSync(backendData).filter((f) => f.startsWith(prefix) && f.endsWith('.json'))
  for (const file of files) {
    const doc = JSON.parse(readFileSync(join(backendData, file), 'utf8')) as {
      entries?: Array<{ slug: string; kind: string }>
    }
    for (const e of doc.entries ?? []) if (e.kind === kind) out.push(e.slug)
  }
  return out
}
if (hasBackend) {
  for (const file of readdirSync(frontendData).filter((f) => f.endsWith('.json'))) {
    const backendFile = join(backendData, file)
    if (!existsSync(backendFile)) continue
    assert.equal(
      readFileSync(join(frontendData, file), 'utf8'),
      readFileSync(backendFile, 'utf8'),
      `frontend seed copy drifted from backend: ${file}`,
    )
  }
}
for (const [prefix, kind, list] of [
  ['classes_', 'class', fixtures.classes],
  ['backgrounds_', 'background', fixtures.backgrounds],
  ['species_', 'race', fixtures.species],
  ['feats_', 'feat', fixtures.feats],
] as const) {
  const expected = seedSlugs(prefix, kind)
  for (const slug of expected) {
    assert.ok(list.some((e) => e.slug === slug), `fixtures miss ${kind} ${slug}`)
  }
}

// Full flow for every class / background / species: auto-fill picks, no blocking issues.
const catalog = fixtures
const items = buildItemNameIndex([...catalog.items, ...catalog.weapons])
const creatable = creatableSpecies(catalog.species)

function fillFields(
  fieldsFor: (picks: FeatPicks) => PickField[],
): FeatPicks {
  let picks: FeatPicks = {}
  for (let round = 0; round < 5; round += 1) {
    const fields = fieldsFor(picks)
    const next: FeatPicks = {}
    for (const field of fields) {
      const keep = (picks[field.id] ?? []).filter((id) => field.options.some((o) => o.id === id))
      next[field.id] =
        keep.length === field.count
          ? keep
          : field.options.slice(0, field.count).map((o) => o.id)
    }
    picks = next
  }
  return picks
}

function autoState(classEntry: CatalogEntry, bg: CatalogEntry, species: CatalogEntry) {
  const ctx = { spells: catalog.spells, items }
  const skills = classSkillNeed(classEntry)
  const trio = backgroundAsiTrio(bg)
  const packs = classStartingPacks(classEntry)
  const toolChoice = classToolChoice(classEntry)
  const bgFeatSlug = originFeatSlugOf(bg)
  const bgFeat = findFeat(catalog.feats, bgFeatSlug)
  const pool = toolChoicePool(bg)
  const sc = classL1Spellcasting(classEntry)
  const sizes = speciesSizeOptions(species)
  const lineages = speciesLineages(species)
  const humanFeats = speciesNeedsOriginFeat(species)
    ? humanOriginFeatOptions(catalog.feats, bgFeatSlug)
    : []
  const humanFeat = humanFeats[0] ?? null
  const classOptionPicks: Record<string, unknown> = {}
  if (classEntry.slug === 'cleric') classOptionPicks.divine_order = 'protector'
  if (classEntry.slug === 'druid') classOptionPicks.primal_order = 'warden'
  if (classEntry.slug === 'rogue') {
    classOptionPicks.expertise = skills.from.slice(0, 2)
  }
  if (classEntry.slug === 'warlock') {
    classOptionPicks.eldritch_invocations = [l1Invocations()[0]!.id]
  }
  const classSkillIds = skills.from.slice(0, skills.count)
  if (classEntry.slug === 'rogue') classOptionPicks.expertise = classSkillIds.slice(0, 2)
  const spells = classEntry.slug
  return {
    ...createEmptyCreate2024State(),
    classSlug: classEntry.slug,
    classSkillIds,
    weaponMasteryIds: masteryWeaponOptions(classEntry, catalog.weapons)
      .slice(0, weaponMasteryLimit(classEntry.slug))
      .map((o) => o.entry.slug),
    fightingStyleSlug:
      classEntry.slug === 'fighter' ? (fightingStyleFeats(catalog.feats)[0]?.slug ?? null) : null,
    classOptionPicks,
    classToolIds: toolChoice ? toolChoice.pool.slice(0, toolChoice.count) : [],
    classEquipment: packs[0]!.id,
    backgroundSlug: bg.slug,
    backgroundAsiMode: '+2/+1' as const,
    backgroundAsi: setAsiPlus2Plus1(trio, trio[0]!, trio[1]!),
    backgroundToolId: pool ? pool[0]! : null,
    originFeatPicks: fillFields((picks) => featPickFields(bgFeatSlug, bgFeat, picks, ctx)),
    speciesSlug: species.slug,
    speciesSize: sizes.length === 1 ? sizes[0]! : sizes[0]!,
    speciesLineageId: lineages[0]?.id ?? null,
    speciesAncestryId: speciesNeedsAncestry(species) ? 'fire' : null,
    speciesPicks: fillFields(() => speciesPickFields(species.slug, species, ctx)),
    speciesFeatSlug: humanFeat?.slug ?? null,
    speciesFeatPicks: humanFeat
      ? fillFields((picks) => featPickFields(humanFeat.slug, humanFeat, picks, ctx))
      : {},
    languageIds: FIXTURE_LANGUAGES.languages.slice(0, 2).map((l) => l.id),
    cantripIds: sc
      ? spellsByLevelForClass(catalog.spells, 0, [spells]).slice(0, sc.cantrips).map((s) => s.slug)
      : [],
    preparedSpellIds: sc
      ? spellsByLevelForClass(catalog.spells, 1, [spells])
          .slice(0, sc.prepared_spells)
          .map((s) => s.slug)
      : [],
    characterName: 'Проверка',
  }
}

const combos: Array<[CatalogEntry, CatalogEntry, CatalogEntry]> = []
catalog.classes.forEach((c, i) =>
  combos.push([
    c,
    catalog.backgrounds[i % catalog.backgrounds.length]!,
    creatable[i % creatable.length]!,
  ]),
)
catalog.backgrounds.forEach((b) => combos.push([catalog.classes[0]!, b, creatable[0]!]))
creatable.forEach((sp) => combos.push([catalog.classes[1]!, catalog.backgrounds[0]!, sp]))

const LATIN_WORD = /[A-Za-z]{3,}/
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out))
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) if (k !== 'key') collectStrings(v, out)
  }
  return out
}

for (const [classEntry, bg, species] of combos) {
  const st = autoState(classEntry, bg, species)
  const label = `${classEntry.slug}/${bg.slug}/${species.slug}`
  const steps = visibleCreate2024Steps(classEntry)
  for (const id of steps) {
    const issues = create2024StepIssues(id, st, {
      classEntry,
      backgroundEntry: bg,
      speciesEntry: species,
      languageChoiceCount: FIXTURE_LANGUAGES.choice_count,
      catalog,
      items,
    })
    assert.deepEqual(issues, [], `${label}: step ${id} blocked`)
  }
  const model = buildCreate2024SheetPreview({
    state: st,
    catalog,
    languages: FIXTURE_LANGUAGES,
    classEntry,
    backgroundEntry: bg,
    speciesEntry: species,
    items,
  })
  assert.ok(model.hpMax > 0, `${label}: hp`)
  assert.ok(model.ac >= 10, `${label}: ac`)
  assert.equal(model.abilities.length, 6)
  assert.equal(model.skills.length, 18)
  assert.ok(model.inventory.length > 0, `${label}: inventory`)
  assert.ok(model.languages.includes(COMMON_LANGUAGE_NAME_RU), `${label}: common`)
  const bad = collectStrings(model).filter((x) => LATIN_WORD.test(x))
  assert.deepEqual(bad, [], `${label}: Latin in sheet preview`)
  assert.equal(toCreate2024Request(st).class_slug, classEntry.slug)
}

console.log('create2024.selfcheck: ok')
