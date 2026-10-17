/**
 * Lightweight self-check: npx tsx src/shared/dnd/raceNaming.selfcheck.ts
 */

import { generateRaceName, pickFromPool, resolveNamingSpec } from './raceNaming'
import { PHB_RACE_NAMING } from './raceNamingTables'

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message)
}

// Deterministic RNG cycle
function seqRandom(values: number[]): () => number {
  let i = 0
  return () => {
    const v = values[i % values.length] ?? 0
    i += 1
    return v
  }
}

assert(PHB_RACE_NAMING.tiefling?.modes?.length === 4, 'tiefling has 4 modes')
assert(PHB_RACE_NAMING.dwarf, 'dwarf naming present')
assert(PHB_RACE_NAMING.human, 'human naming present')

const dwarf = resolveNamingSpec({ slug: 'hill_dwarf', parentSlug: 'dwarf' })
assert(dwarf.patterns.some((p) => p.template.includes('{clan}')), 'hill_dwarf inherits dwarf clan pattern')

const drow = resolveNamingSpec({ slug: 'drow' })
assert(drow === PHB_RACE_NAMING.drow, 'drow uses drow naming')
const seaElf = resolveNamingSpec({ slug: 'sea_elf', parentSlug: 'elf' })
assert(seaElf.patterns.some((p) => p.template.includes('{given}')), 'sea_elf inherits elf')

const virtue = generateRaceName({
  gender: 'nonbinary',
  slug: 'tiefling',
  modeId: 'virtue',
  random: seqRandom([0.1, 0.2, 0.3, 0.4]),
})
assert(virtue, 'virtue name generated')
assert(virtue!.modeId === 'virtue', 'mode forced to virtue')
assert(!virtue!.name.includes(' '), 'virtue is single token')

const infernalM = generateRaceName({
  gender: 'male',
  slug: 'tiefling',
  modeId: 'infernal',
  random: seqRandom([0.01, 0.01, 0.01, 0.01, 0.5]),
})
assert(infernalM, 'infernal male name')
assert(infernalM!.name.length > 0 && infernalM!.name.length <= 120, 'name length ok')

const dwarfName = generateRaceName({
  gender: 'female',
  slug: 'dwarf',
  random: seqRandom([0.9, 0.1, 0.2]),
})
assert(dwarfName, 'dwarf female name')
assert(dwarfName!.name.includes(' ') || dwarfName!.name.length > 2, 'dwarf name non-empty')

// nonbinary prefers any
const anyPool = { any: ['Эш'], male: ['Борис'], female: ['Анна'] }
assert(pickFromPool(anyPool, 'nonbinary', () => 0) === 'Эш', 'nonbinary uses any')
assert(pickFromPool({ male: ['А'], female: ['Б'] }, 'nonbinary', () => 0) === 'А', 'nonbinary falls back to union')
assert(pickFromPool({ male: ['А'], female: ['Б'] }, 'male', () => 0) === 'А', 'male uses male')
assert(pickFromPool({ male: ['А'], female: ['Б'] }, 'female', () => 0) === 'Б', 'female uses female')

// Variety: many generations should not all be identical for tiefling virtue
const seen = new Set<string>()
for (let i = 0; i < 40; i += 1) {
  const n = generateRaceName({ gender: 'unspecified', slug: 'tiefling', modeId: 'virtue' })
  if (n) seen.add(n.name)
}
assert(seen.size >= 8, `virtue variety expected >=8 unique, got ${seen.size}`)

// Catalog data.naming overrides curated
const custom = generateRaceName({
  gender: 'male',
  slug: 'dwarf',
  naming: {
    patterns: [{ id: 'x', template: '{given}' }],
    pools: { given: { male: ['Тестовик'], female: ['Тестовица'] } },
  },
  random: () => 0,
})
assert(custom?.name === 'Тестовик', 'catalog naming overrides curated')

console.log('raceNaming.selfcheck: ok')
