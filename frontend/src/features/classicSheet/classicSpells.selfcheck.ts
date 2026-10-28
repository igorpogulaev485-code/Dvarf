/** Run: npx tsx src/features/classicSheet/classicSpells.selfcheck.ts */
import { classicCastProfiles, classicSpellStats, classicSpellsState } from './classicSpells.ts'
import {
  sampleClassic2014Character,
  sampleQuackClassicCharacter,
} from './sampleClassicCharacter.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const mono = classicCastProfiles(sampleClassic2014Character)
assert(mono.length <= 1, `mono profiles ${mono.length}`)

const quack = classicCastProfiles(sampleQuackClassicCharacter)
assert(quack.length === 2, `quack profiles ${quack.length}`)
const art = quack.find((row) => row.slug === 'artificer')
const wlk = quack.find((row) => row.slug === 'warlock')
assert(art != null && art.saveDc === 19 && art.attackBonus === 11, `art ${art?.saveDc}/${art?.attackBonus}`)
assert(wlk != null && wlk.saveDc === 18 && wlk.attackBonus === 10, `wlk ${wlk?.saveDc}/${wlk?.attackBonus}`)

const monoStats = classicSpellStats(
  sampleClassic2014Character,
  classicSpellsState(sampleClassic2014Character),
)
assert(monoStats.saveDc !== '', 'mono stats still work')

console.log('classicSpells.selfcheck: ok')
