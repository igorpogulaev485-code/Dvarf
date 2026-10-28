/**
 * Lightweight self-check: npx tsx src/shared/dnd/raceNaming.selfcheck.ts
 */

import { generateRaceName, pickFromPool, resolveNamingSpec } from './raceNaming'
import { PHB_RACE_NAMING } from './raceNamingTables'
import { MPMM_RACE_NAMING } from './raceNamingTables.mpmm'
import { SETTING_RACE_NAMING } from './raceNamingTables.setting'
import { parseCharacterGender } from './characterGender'

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message)
}

function seqRandom(values: number[]): () => number {
  let i = 0
  return () => {
    const v = values[i % values.length] ?? 0
    i += 1
    return v
  }
}

assert(parseCharacterGender('male') === 'male', 'male ok')
assert(parseCharacterGender('female') === 'female', 'female ok')
assert(parseCharacterGender('nonbinary') === null, 'legacy nonbinary rejected')
assert(parseCharacterGender('unspecified') === null, 'legacy unspecified rejected')

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
  gender: 'female',
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

const anyPool = { any: ['Эш'], male: ['Борис'], female: ['Анна'] }
assert(pickFromPool(anyPool, 'male', () => 0) === 'Борис', 'male uses male')
assert(pickFromPool(anyPool, 'female', () => 0) === 'Анна', 'female uses female')
assert(pickFromPool({ male: ['А'], female: ['Б'] }, 'male', () => 0) === 'А', 'male pool')
assert(pickFromPool({ male: ['А'], female: ['Б'] }, 'female', () => 0) === 'Б', 'female pool')

const seen = new Set<string>()
for (let i = 0; i < 40; i += 1) {
  const n = generateRaceName({ gender: 'male', slug: 'tiefling', modeId: 'virtue' })
  if (n) seen.add(n.name)
}
assert(seen.size >= 8, `virtue variety expected >=8 unique, got ${seen.size}`)

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

assert(Object.keys(MPMM_RACE_NAMING).length >= 20, 'mpmm roots covered')
assert(Object.keys(SETTING_RACE_NAMING).length >= 15, 'setting roots covered')

const tabaxi = generateRaceName({ gender: 'female', slug: 'tabaxi', random: () => 0.2 })
assert(tabaxi?.name, 'tabaxi name')

const warforged = generateRaceName({
  gender: 'male',
  slug: 'warforged',
  random: () => 0.1,
})
assert(warforged?.name, 'warforged designation')

const genasiAir = generateRaceName({
  gender: 'male',
  slug: 'genasi_air',
  parentSlug: 'genasi',
  modeId: 'air',
  random: () => 0,
})
assert(genasiAir?.modeId === 'air', 'genasi_air mode')
assert(genasiAir?.name, 'genasi air name')

console.log('raceNaming.selfcheck: ok')
