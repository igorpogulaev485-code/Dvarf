/**
 * PRINT-14: classic 2014 print body has no interactive form controls.
 * Run: npx tsx src/features/classicSheet/classicPrint14.selfcheck.ts
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const sheet = readFileSync(join(here, 'ClassicPrintSheet.tsx'), 'utf8')
const fit = readFileSync(join(here, 'ClassicFitInput.tsx'), 'utf8')
const shared = readFileSync(join(here, 'classicPrintShared.tsx'), 'utf8')
const staticField = readFileSync(join(here, 'ClassicStaticField.tsx'), 'utf8')
const css = readFileSync(join(here, 'classicPrint.css'), 'utf8')
const caption = readFileSync(join(here, 'ClassicFitCaption.tsx'), 'utf8')

assert(!/<input\b/.test(sheet), 'ClassicPrintSheet must not render <input>')
assert(!/<select\b/.test(sheet), 'ClassicPrintSheet must not render <select>')
assert(!/<textarea\b/.test(sheet), 'ClassicPrintSheet must not render <textarea>')
assert(sheet.includes('ClassicStaticField'), 'uses ClassicStaticField')
assert(sheet.includes('classic-ability__score'), 'official ability score oval')
assert(sheet.includes('classic-ability__mod'), 'official ability modifier')
assert(!/<input\b/.test(fit), 'ClassicFitInput is static')
assert(!/<textarea\b/.test(shared), 'Expanding is a div, not textarea')
assert(staticField.includes('classic-static--pencil'), 'pencil blanks for empty fields')

assert(sheet.includes("['cp', 'Медь']"), 'coin mark Медь')
assert(sheet.includes("['sp', 'Серебро']"), 'coin mark Серебро')
assert(sheet.includes("['ep', 'Электрум']"), 'coin mark Электрум')
assert(!sheet.includes('Медные'), 'no long Медные hyphen bait')
assert(!/letterSpacing = `-0/.test(caption), 'ClassicFitCaption must not use negative tracking')
assert(caption.includes("letterSpacing = '0'"), 'ClassicFitCaption floors tracking at 0')
assert(
  /\.classic-panel--skills \.classic-check__name\s*\{[^}]*letter-spacing:\s*0/.test(css),
  'skills: no negative letter-spacing (stuck words)',
)
assert(
  /\.classic-coin__mark\s*\{[^}]*white-space:\s*nowrap/.test(css),
  'coin marks stay one line',
)
assert(/hyphens:\s*none/.test(css), 'coin/skill marks disable hyphenation')

const print2024 = readFileSync(join(here, 'ClassicPrint2024.tsx'), 'utf8')
assert(print2024.length > 100, 'ClassicPrint2024 present')
assert(print2024.includes('classicHpDisplay'), '2024 HP helper fills Тек/Макс')
assert(print2024.includes('subclassLabel'), '2024 subclass from class levels')
assert(print2024.includes("Медь"), '2024 coin words')
assert(print2024.includes('ClassicFitInput'), '2024 header uses ClassicFitInput')
assert(
  /classic-lss-id-grid[\s\S]*ClassicFitInput[\s\S]*wrap[\s\S]*Класс/.test(print2024) ||
    print2024.includes('aria-label="Класс"'),
  '2024 class field autofit+wrap',
)
assert(
  /\.classic-lss-death \.classic-death-line\s*\{[^}]*gap:\s*0\.55rem/.test(css),
  '2024 death label/bubble gap',
)
assert(css.includes('classic-lss-death .classic-death-bubbles'), '2024 death bubbles group')

const fromApi = readFileSync(join(here, 'fromApi.ts'), 'utf8')
assert(fromApi.includes('stripTrailingItemQty'), 'dedupe ×N in equipment line')
assert(
  sheet.includes('classic-combat-stat--ac') && sheet.includes('Класс доспеха'),
  'AC label still rendered',
)
// Label must be a sibling under --ac, not nested inside .classic-ac-shield.
assert(
  /classic-ac-shield[\s\S]*?<\/div>\s*<span className="classic-field-label">Класс доспеха<\/span>/.test(
    sheet,
  ),
  'AC label must sit outside classic-ac-shield',
)

console.log('classicPrint14.selfcheck: ok')
