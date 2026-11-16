/** Run: npx tsx --tsconfig tsconfig.app.json src/features/createPipeline2024/create2024Labels.selfcheck.ts */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { catalogSourceLabelRu } from '../../shared/dnd/catalogSourceLabelRu'
import {
  buildItemNameIndex,
  hitDieLabel,
  itemNameRu,
  ruDice,
  ruPlural,
} from './create2024Labels'
import { buildCreate2024Fixtures, FIXTURE_LANGUAGES } from './createPipeline2024Fixtures'
import { classStartingPacks } from './createPipeline2024State'
import { CREATE_2024_STEP_LABELS } from './createPipeline2024Types'

const here = dirname(fileURLToPath(import.meta.url))
const FORBIDDEN: Array<[RegExp, string]> = [
  [/\bASI\b/, 'ASI'],
  [/RULES_EDITION/, 'RULES_EDITION flag'],
  [/фикстур/i, 'фикстуры'],
  [/Превью-fighter|preview-fighter/i, 'preview-fighter'],
  [/локальный превью/i, 'локальный превью'],
  [/Флаг/, 'Флаг'],
  [/\bcommon\b/i, 'common'],
  [/\bpack\b/i, 'pack'],
  [/класс [a-z]\b/i, 'класс a'],
  [/srd-5\.2|\bph24\b/i, 'service source id'],
  [/Point buy|\b\d+d\d+\b/, 'English dice / point buy'],
]

const UI_FILES = [
  '../../pages/CreateCharacter2024Page.tsx',
  './Create2024DetailPanel.tsx',
  './Create2024SheetPreview.tsx',
  './Create2024Picks.tsx',
  './PickChipGroup.tsx',
  './create2024Labels.ts',
  './create2024FeatPicks.ts',
  './createPipeline2024State.ts',
]

function userFacingStrings(source: string): string[] {
  const out: string[] = []
  for (const m of source.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
    const text = (m[2] ?? '').replace(/\$\{[^}]*\}/g, '')
    if (/[А-Яа-яЁё]/.test(text) || /\s/.test(text)) out.push(text)
  }
  for (const m of source.matchAll(/>([^<>{}\n]+)</g)) out.push(m[1] ?? '')
  return out
}

for (const rel of UI_FILES) {
  const source = readFileSync(join(here, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^import .*$/gm, '')
  for (const text of userFacingStrings(source)) {
    for (const [re, name] of FORBIDDEN) {
      assert.ok(!re.test(text), `${rel}: forbidden «${name}» in «${text.slice(0, 80)}»`)
    }
  }
}

for (const label of Object.values(CREATE_2024_STEP_LABELS)) {
  assert.ok(!/[A-Za-z]{2,}/.test(label), `step label ${label}`)
}

const fixtures = buildCreate2024Fixtures()
const sources = new Set<string>()
for (const list of [fixtures.classes, fixtures.backgrounds, fixtures.species, fixtures.feats, fixtures.spells]) {
  for (const row of list) if (row.source) sources.add(row.source)
}
for (const source of sources) {
  const label = catalogSourceLabelRu(source)
  assert.ok(label && /[А-Яа-яЁё]/.test(label), `source ${source} has no Russian label`)
  assert.ok(!/[A-Za-z]{3,}/.test(label.replace(/СРД/, '')), `source label ${label} leaks Latin`)
}

for (const lang of FIXTURE_LANGUAGES.languages) {
  assert.ok(/[А-Яа-яЁё]/.test(lang.name_ru), `language ${lang.id} must be Russian`)
}

const items = buildItemNameIndex([...fixtures.items, ...fixtures.weapons])
for (const cls of fixtures.classes) {
  for (const pack of classStartingPacks(cls)) {
    assert.ok(!/[A-Za-z]{2,}/.test(pack.labelRu), `${cls.slug}/${pack.id}: label «${pack.labelRu}»`)
    assert.ok(!/^Вариант [a-z]$/.test(pack.labelRu), `${cls.slug}: lowercase variant label`)
    for (const it of pack.items) {
      if (!it.id) continue
      assert.ok(
        /[А-Яа-яЁё]/.test(itemNameRu(it.id, items)),
        `${cls.slug}/${pack.id}: item ${it.id} has no Russian name`,
      )
    }
  }
}

assert.equal(ruDice('1d8 + 2d6'), '1к8 + 2к6')
assert.equal(hitDieLabel('d10'), 'к10')
assert.equal(hitDieLabel(8), 'к8')

assert.deepEqual(
  [1, 2, 4, 5, 11, 12, 21, 22, 25].map((n) => ruPlural(n, 'заклинание', 'заклинания', 'заклинаний')),
  ['заклинание', 'заклинания', 'заклинания', 'заклинаний', 'заклинаний', 'заклинаний', 'заклинание', 'заклинания', 'заклинаний'],
  'ruPlural: 1 / 2–4 / 5+ / teens',
)

console.log('create2024Labels.selfcheck: ok')
