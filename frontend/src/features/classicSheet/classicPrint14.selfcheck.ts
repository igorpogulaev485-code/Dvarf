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

assert(!/<input\b/.test(sheet), 'ClassicPrintSheet must not render <input>')
assert(!/<select\b/.test(sheet), 'ClassicPrintSheet must not render <select>')
assert(!/<textarea\b/.test(sheet), 'ClassicPrintSheet must not render <textarea>')
assert(sheet.includes('ClassicStaticField'), 'uses ClassicStaticField')
assert(sheet.includes('classic-ability__score'), 'official ability score oval')
assert(sheet.includes('classic-ability__mod'), 'official ability modifier')
assert(!/<input\b/.test(fit), 'ClassicFitInput is static')
assert(!/<textarea\b/.test(shared), 'Expanding is a div, not textarea')
assert(staticField.includes('classic-static--pencil'), 'pencil blanks for empty fields')

const print2024 = readFileSync(join(here, 'ClassicPrint2024.tsx'), 'utf8')
assert(print2024.length > 100, 'ClassicPrint2024 present and untouched by this check')

console.log('classicPrint14.selfcheck: ok')
