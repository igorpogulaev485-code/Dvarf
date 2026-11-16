/**
 * Collapsed spell circles must pack to the top of the scroll grid
 * (align-content: start), not stretch to fill the fixed flex height.
 *
 * Run: npx tsx --tsconfig tsconfig.app.json src/features/characters/spellsCollapseAlign.selfcheck.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

const spellCss = read('src/styles/18-spell-compact-cards.css')
const deathCss = read('src/styles/17-death-saves-compact.css')
const compact = read('src/features/characters/PlayDeskSpellsCompact.tsx')
const features = read('src/features/characters/ClassFeaturesPanel.tsx')
const companions = read('src/features/characters/CompanionsPanel.tsx')
const texts = read('src/features/characters/TextBlocksPanel.tsx')
const abilities = read('src/features/characters/AbilitySkillsColumn.tsx')
const featuresCss = read('src/styles/06-companions-features.css')
const pinnedCss = read('src/styles/20-pinned-spells.css')

// Spells panel: scroll list is a grid with fixed flex height — must pack to start.
assert.match(compact, /play-desk-compact__list--scroll/)
assert.match(compact, /Свернуть все/)
assert.match(deathCss, /\.play-desk-compact__list\s*\{[\s\S]*?display:\s*grid/)
assert.match(
  spellCss,
  /\.play-desk-compact__list--scroll\s*\{[\s\S]*?align-content:\s*start/,
  'scroll list needs align-content:start so collapsed circles do not stretch',
)

// Sibling «Свернуть все» panels: not the same flex+grid stretch pattern.
assert.match(features, /Свернуть все/)
assert.match(companions, /Свернуть все/)
assert.match(texts, /Свернуть все/)
assert.match(abilities, /Свернуть все/)
assert.match(
  featuresCss,
  /\.feature-list\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column[^}]*\}/,
  'ClassFeaturesPanel uses flex column (no grid stretch)',
)
assert.doesNotMatch(
  companions,
  /play-desk-compact__list--scroll/,
  'CompanionsPanel does not use the spells scroll-grid stretch pattern',
)
assert.doesNotMatch(
  texts,
  /play-desk-compact__list--scroll/,
  'TextBlocksPanel does not use the spells scroll-grid stretch pattern',
)
// Ability rail now shares the spells scroll + align-content:start pattern.
assert.match(abilities, /abil-column__list/)
assert.match(abilities, /play-desk-compact__list--scroll/)
assert.match(pinnedCss, /\.abil-column__list\s*\{[^}]*display:\s*grid[^}]*\}/)
assert.match(
  pinnedCss,
  /\.abil-column__list\s*\{[\s\S]*?align-content:\s*start/,
  'AbilitySkillsColumn packs collapsed cards like spell circles',
)

console.log('spellsCollapseAlign.selfcheck: ok')
