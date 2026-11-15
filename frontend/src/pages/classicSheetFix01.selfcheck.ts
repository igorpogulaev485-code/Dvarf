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

// MOB-FIX: print layout variants 2014 + 2024 (creation path 2024 stays hidden).
assert(classicPage.includes("'2024'"), 'ClassicSheetPage must offer 2024 print layout')
assert(classicPage.includes('readClassicSheetLayout'), 'ClassicSheetPage reads persisted layout')
assert(classicPage.includes('setClassicSheetLayout'), 'ClassicSheetPage can switch layout')
assert(blankPage.includes("'2024'"), 'blank sheet toolbar offers 2024')
assert(blankPage.includes("parseLayoutParam"), 'blank respects ?layout=2024')
assert(blankPage.includes("searchParams.get('layout')"), 'blank reads layout query')

console.log('classicSheetFix01.selfcheck: ok')
