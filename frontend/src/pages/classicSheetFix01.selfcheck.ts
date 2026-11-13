/** Run: npx tsx src/pages/classicSheetFix01.selfcheck.ts */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const here = dirname(fileURLToPath(import.meta.url))
const classicPage = readFileSync(join(here, 'ClassicSheetPage.tsx'), 'utf8')
const blankPage = readFileSync(join(here, 'ClassicBlankSheetPage.tsx'), 'utf8')

assert(!classicPage.includes("'2024'"), 'ClassicSheetPage must not offer 2024 layout switch')
assert(classicPage.includes("sheetLayout = '2014'"), 'ClassicSheetPage forced 2014')
assert(!blankPage.includes("'2024'"), 'blank sheet toolbar has no 2024')
assert(blankPage.includes("layout: ClassicSheetLayout = '2014'"), 'blank forced 2014')

console.log('classicSheetFix01.selfcheck: ok')
