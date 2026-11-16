/**
 * Left ability rail height = min(content, stage), not calc(100dvh − …).
 *
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/abilitiesRailCap.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const railCss = read('src/styles/21-ability-rail.css')
const layout = read('src/features/characters/minimalSheet/PlayDeskLayout.tsx')
const hook = read('src/features/characters/minimalSheet/usePlayDeskRailCap.ts')
const scrollSelf = read('src/features/characters/abilitiesColumnScroll.selfcheck.ts')

assert.match(layout, /usePlayDeskRailCap/)
assert.match(layout, /leftRef/)
assert.match(layout, /stageRef/)
assert.match(hook, /ResizeObserver/)
assert.match(hook, /--play-desk-stage-h/)
assert.match(hook, /is-rail-capped/)
assert.match(hook, /min-width:\s*960px/)

assert.match(
  railCss,
  /align-items:\s*start/,
  'body must not stretch left/stage into each other',
)
assert.match(
  railCss,
  /max-height:\s*var\(--play-desk-stage-h/,
  'left rail capped to measured stage height',
)
assert.match(railCss, /\.is-rail-capped/)
assert.match(
  railCss,
  /:not\(\.is-rail-capped\)[\s\S]*?play-desk-compact__list--scroll[\s\S]*?overflow-y:\s*visible/,
  'no nested scroll when content fits under stage',
)
assert.doesNotMatch(
  railCss,
  /\.play-desk--wide\s+\.abil-column\s*\{[\s\S]*?max-height:\s*calc\(100dvh/,
  'viewport calc budget removed from ability column',
)

// Keep list scroll class contract, but cap selfcheck must not require calc.
assert.match(scrollSelf, /play-desk-compact__list--scroll/)

console.log('abilitiesRailCap.selfcheck: ok')
