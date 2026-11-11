/** npx tsx src/shared/dnd/featureSaveProficiency.selfcheck.ts */
import {
  applyFeatureSaveProficiencies,
  saveProficiencyKeysFromFeatures,
} from './featureSaveProficiency'
import type { UnlockedFeature } from './classFeatures'

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(message)
}

const diamond = {
  id: 'diamond_soul',
  save_proficiency: 'all' as const,
} as UnlockedFeature

const keys = saveProficiencyKeysFromFeatures([diamond])
assert(keys.length === 6, 'all six saves')
assert(keys.includes('cha') && keys.includes('con'), 'con+cha included')

const before = {
  str: true,
  dex: true,
  con: false,
  int: false,
  wis: false,
  cha: false,
}
const after = applyFeatureSaveProficiencies(before, [diamond])
assert(after.con && after.int && after.wis && after.cha, 'Diamond Soul fills saves')
assert(after.str && after.dex, 'keeps class saves')

const noop = applyFeatureSaveProficiencies(after, [diamond])
assert(noop === after, 'idempotent reference when unchanged')

console.log('featureSaveProficiency.selfcheck: ok')
