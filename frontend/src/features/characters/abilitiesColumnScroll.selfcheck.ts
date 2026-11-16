/**
 * Ability rail list scrolls inside a capped column (same pattern as spells):
 * play-desk-compact__list--scroll + align-content:start; collapse links match magic.
 *
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/abilitiesColumnScroll.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const column = read('src/features/characters/AbilitySkillsColumn.tsx')
const railCss = read('src/styles/21-ability-rail.css')
const pinnedCss = read('src/styles/20-pinned-spells.css')
const spellCss = read('src/styles/18-spell-compact-cards.css')

assert.match(
  column,
  /play-desk-compact__list--scroll/,
  'ability list reuses spells scroll class',
)
assert.match(column, /play-desk-compact__collapse-actions/)
assert.match(column, /play-desk-compact__link/)
assert.match(column, /Свернуть все/)
assert.match(column, /Развернуть все/)
assert.match(
  column,
  /aria-label="Свернуть все характеристики"/,
  'collapse-all scoped like spells aria-labels',
)
assert.match(column, /aria-label="Развернуть все характеристики"/)

assert.match(
  spellCss,
  /\.play-desk-compact__list--scroll\s*\{[\s\S]*?align-content:\s*start/,
  'shared scroll class packs grid rows to start',
)
assert.match(
  pinnedCss,
  /\.abil-column__list\s*\{[\s\S]*?align-content:\s*start/,
  'abil list packs collapsed cards without stretch gaps',
)
assert.match(
  pinnedCss,
  /\.abil-column__list\s*\{[\s\S]*?grid-auto-rows:\s*max-content/,
  'abil list rows size to card content (overflow:hidden blocks must not shrink)',
)
assert.match(
  railCss,
  /\.play-desk--wide\s+\.abil-column\s*\{[\s\S]*?max-height:\s*calc\(100dvh\s*-\s*27\.5rem\)/,
  'desktop ability column uses same viewport budget as pinned spells',
)
assert.match(
  railCss,
  /@media\s*\(max-width:\s*959px\)[\s\S]*?\.abil-column[\s\S]*?max-height:\s*none/,
  'phone keeps page scroll — no nested column clip',
)

console.log('abilitiesColumnScroll.selfcheck: ok')
