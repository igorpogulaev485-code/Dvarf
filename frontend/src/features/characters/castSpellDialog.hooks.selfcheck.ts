/**
 * P0: CastSpellDialog must not call hooks after `if (!spell) return null`.
 * Regression: useMemo(sorceryLeft) after early return → ErrorBoundary on CAST.
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/castSpellDialog.hooks.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const src = readFileSync(join(root, 'src/features/characters/CastSpellDialog.tsx'), 'utf8')

const early = src.indexOf('if (!spell)')
assert.ok(early > 0, 'expected early return when spell is null')

const afterEarly = src.slice(early)
assert.match(src.slice(0, early), /const sorceryLeft = useMemo/)
assert.doesNotMatch(afterEarly, /\buse(Memo|Effect|State|Callback|Ref|LayoutEffect)\b/)

console.log('castSpellDialog.hooks.selfcheck: ok')
