/**
 * Run: npx tsx src/shared/dnd/speciesHpBonus2024.selfcheck.ts
 */
import assert from 'node:assert/strict'
import {
  DWARVEN_TOUGHNESS_NAME_RU,
  dwarvenToughnessHpDelta2024,
  dwarvenToughnessHpTotal2024,
  hasDwarvenToughness2024,
  resolveSpeciesSlug2024,
} from './speciesHpBonus2024.js'

assert.equal(hasDwarvenToughness2024('dwarf'), true)
assert.equal(hasDwarvenToughness2024('hill_dwarf'), false)
assert.equal(hasDwarvenToughness2024('human'), false)
assert.equal(hasDwarvenToughness2024(null), false)

assert.equal(
  dwarvenToughnessHpTotal2024({ characterLevel: 11, speciesSlug: 'dwarf' }),
  11,
)
assert.equal(
  dwarvenToughnessHpTotal2024({ characterLevel: 5, speciesSlug: 'dwarf' }),
  5,
)
assert.equal(
  dwarvenToughnessHpTotal2024({ characterLevel: 10, speciesSlug: 'tiefling' }),
  0,
)

assert.equal(
  dwarvenToughnessHpDelta2024({
    oldCharacterLevel: 4,
    newCharacterLevel: 5,
    speciesSlug: 'dwarf',
  }),
  1,
)
assert.equal(
  dwarvenToughnessHpDelta2024({
    oldCharacterLevel: 5,
    newCharacterLevel: 4,
    speciesSlug: 'dwarf',
  }),
  -1,
)

assert.equal(
  resolveSpeciesSlug2024({ speciesSlug: 'dwarf', raceName: 'Эльф' }),
  'dwarf',
)
assert.equal(resolveSpeciesSlug2024({ raceName: 'Дварф' }), 'dwarf')
assert.equal(DWARVEN_TOUGHNESS_NAME_RU, 'Дварфийская стойкость')

console.log('speciesHpBonus2024.selfcheck: ok')
