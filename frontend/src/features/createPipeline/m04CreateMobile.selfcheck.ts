/**
 * M-04: create pipeline mobile — step strip scroll edges + summary close.
 * Run: npx --yes tsx src/features/createPipeline/m04CreateMobile.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPipelineStepsScrollEdges } from './CreatePipelineShell'

const here = dirname(fileURLToPath(import.meta.url))
const shellSrc = readFileSync(join(here, 'CreatePipelineShell.tsx'), 'utf8')
const css14 = readFileSync(
  join(here, '../../styles/14-create-pipeline.css'),
  'utf8',
)
const css13 = readFileSync(
  join(here, '../../styles/13-responsive-create.css'),
  'utf8',
)
const cssDialogs = readFileSync(
  join(here, '../../styles/07-features-dialogs.css'),
  'utf8',
)
const identitySrc = readFileSync(
  join(here, '../characters/minimalSheet/SheetIdentityDialog.tsx'),
  'utf8',
)

// M11 — overflow edges
assert.deepEqual(
  createPipelineStepsScrollEdges(0, 360, 360),
  { canScrollLeft: false, canScrollRight: false },
  'no overflow → no arrows',
)
assert.deepEqual(
  createPipelineStepsScrollEdges(0, 360, 720),
  { canScrollLeft: false, canScrollRight: true },
  'start → right arrow',
)
assert.deepEqual(
  createPipelineStepsScrollEdges(200, 360, 720),
  { canScrollLeft: true, canScrollRight: true },
  'middle → both',
)
assert.deepEqual(
  createPipelineStepsScrollEdges(360, 360, 720),
  { canScrollLeft: true, canScrollRight: false },
  'end → left only',
)

assert.match(shellSrc, /create-pipeline__steps-arrow/, 'shell renders step arrows')
assert.match(shellSrc, /create-pipeline__steps-fade/, 'shell renders step fades')
assert.match(css14, /create-pipeline__steps-fade--right/, 'mobile CSS has right fade')
assert.match(css14, /create-pipeline__step-label/, 'step label class kept full word')
assert.match(css14, /white-space:\s*nowrap/, 'step chips do not wrap/clip mid-word')

// M20 — summary: one visible close button (no secondaryLabel)
assert.match(shellSrc, /primaryLabel="Закрыть"/, 'summary primary Закрыть')
assert.doesNotMatch(
  shellSrc,
  /secondaryLabel="Отмена"/,
  'summary must not show Отмена',
)
assert.match(shellSrc, /onSecondary=\{closeSummary\}/, 'backdrop/Escape still close')

// M18 — phone inputs ≥ 16px
assert.match(css13, /\.ui-input[\s\S]*font-size:\s*16px/, 'responsive create inputs 16px')
assert.match(
  cssDialogs,
  /@media \(max-width: 959px\)[\s\S]*\.ui-dialog__body \.ui-input[\s\S]*font-size:\s*16px/,
  'dialog inputs 16px on phone',
)

// M14 retest leftover after UX-21
assert.doesNotMatch(identitySrc, /Опыт \(XP\)/, 'Основное: no XP in label')
assert.match(identitySrc, /label="Опыт"/, 'Основное: Опыт label')

console.log('m04CreateMobile.selfcheck: ok')
