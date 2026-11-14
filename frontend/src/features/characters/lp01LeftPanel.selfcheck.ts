/**
 * LP-01: left ability rail — prof vs expertise contrast, no permanent hints,
 * collapsed «Можно позже», compact ownership CTA.
 *
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/lp01LeftPanel.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const frontendRoot = join(here, '../../..')
const repoRoot = join(frontendRoot, '..')

function read(rel: string): string {
  return readFileSync(join(frontendRoot, rel), 'utf8')
}

const railCss = read('src/styles/21-ability-rail.css')
const column = read('src/features/characters/AbilitySkillsColumn.tsx')
const checklist = read('src/features/onboarding/OnboardingChecklist.tsx')
const layout = read('src/features/characters/minimalSheet/PlayDeskLayout.tsx')
const ownership = read('src/features/characters/OwnershipSummary.tsx')
const equipment = read('src/features/characters/EquipmentProficienciesPanel.tsx')
const namePicker = read('src/features/characters/NameListPicker.tsx')
const chipsCss = read('src/styles/06-companions-features.css')
const etalon = read('src/pages/UiKitEtalonPreviewPage.tsx')
const docs = readFileSync(join(repoRoot, 'docs/ui-kit/README.md'), 'utf8')

// Expertise = solid --abil fill + white text (pre-LSS contrast)
assert.match(
  railCss,
  /\.abil-skill\.is-expert\s*\{[\s\S]*?background:\s*var\(--abil\)/,
  'expertise row must use solid --abil fill',
)
assert.match(
  railCss,
  /\.abil-skill\.is-expert\s*\{[\s\S]*?color:\s*#fff/,
  'expertise row must use white text',
)
assert.match(
  railCss,
  /\.abil-skill\.is-on\s*\{[\s\S]*?background:\s*var\(--abil-soft\)/,
  'proficiency row stays soft fill',
)
assert.match(railCss, /\.abil-skill__expert-mark/, 'expertise diamond mark in kit')
assert.match(railCss, /\.abil-prof-pip\.is-expert/, 'double-ring expertise pip')

// No permanent service paragraphs (hint only on ? title / aria-label)
assert.doesNotMatch(
  column,
  /<Text[^>]*>[\s\S]*число → бросок/,
  'rail usage hint must not be permanent body text',
)
assert.doesNotMatch(
  column,
  /className="abil-column__hint"/,
  'abil-column__hint permanent paragraphs removed',
)
assert.match(column, /abil-column__toolbar-help/, 'usage hint lives on ? button')
assert.match(column, /skillProfHint|компетентность/, 'titles mention компетентность')

// Checklist collapsed by default; empty → hide
assert.match(checklist, /Можно позже · \{items\.length\}/)
assert.match(checklist, /defaultOpen = false/)
assert.match(checklist, /if \(items\.length === 0\) return null/)

// Ownership summary under passives
assert.match(layout, /OwnershipSummary/)
assert.match(ownership, /Доспехи/)
assert.match(ownership, /Оружие/)
assert.match(ownership, /Инструменты/)
assert.match(ownership, /Языки/)
assert.match(ownership, /\+\$\{overflow\.length\}/)
assert.match(layout, /aria-label="Владения"/)
assert.doesNotMatch(layout, /Скорости и зрение/)
assert.match(railCss, /\.ownership-summary/)
const darkvision = read('src/features/characters/DarkvisionSense.tsx')
assert.match(darkvision, /DarkvisionSense/)
assert.match(darkvision, /DetailsMenu/)
const passivesPart = read('src/features/characters/minimalSheet/useSheetEditorPart5.tsx')
assert.match(passivesPart, /DarkvisionSense/)
const mobileVitals = read('src/features/characters/MobileVitalsBar.tsx')
assert.match(mobileVitals, /onAltSpeedChange/)
assert.match(mobileVitals, /ui-vital-menu__row--edit/)

// Editor: hints in ?, selected chips solid + check
assert.doesNotMatch(
  equipment,
  /Отсюда считается, можно ли надеть доспех/,
  'equipment body hint removed',
)
assert.match(equipment, /HoverTipCard|PANEL_HELP\.proficiencies/)
assert.match(equipment, /sheet-chip__check/)
assert.match(namePicker, /ownership-editor__hint-btn/)
assert.doesNotMatch(namePicker, /hint=\{hint\}/)
assert.match(
  chipsCss,
  /\.sheet-chip\.is-on[\s\S]*?background:\s*var\(--accent\)/,
  'selected sheet-chip uses solid accent',
)

// Etalon + docs
assert.match(etalon, /LP-01 · рельс характеристик/)
assert.match(etalon, /abil-skill is-on is-expert/)
assert.match(etalon, /ownership-summary/)
assert.match(docs, /LP-01 \(левая панель/)
assert.match(docs, /OwnershipSummary/)

console.log('lp01LeftPanel.selfcheck: ok')
