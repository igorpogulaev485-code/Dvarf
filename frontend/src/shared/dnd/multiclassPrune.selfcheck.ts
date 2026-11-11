/** npx tsx src/shared/dnd/multiclassPrune.selfcheck.ts */

import { createClassLevel } from './classLevels'
import { pruneInvalidMulticlassRows } from './multiclassPrune'

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message)
}

const rogue = createClassLevel({ name: 'Плут', level: 5 })
const barb = createClassLevel({ name: 'Варвар', level: 1 })

const lowStr = pruneInvalidMulticlassRows({
  classes: [rogue, barb],
  abilities: { str: 10, dex: 16, con: 14, int: 10, wis: 10, cha: 10 },
  primaryClassEntryId: rogue.id,
})
assert(lowStr.removed.length === 1 && lowStr.removed[0]?.name === 'Варвар', 'barb pruned')
assert(lowStr.classes.length === 1 && lowStr.classes[0]?.id === rogue.id, 'rogue kept')

const ok = pruneInvalidMulticlassRows({
  classes: [rogue, barb],
  abilities: { str: 14, dex: 16, con: 14, int: 10, wis: 10, cha: 10 },
  primaryClassEntryId: rogue.id,
})
assert(ok.removed.length === 0 && ok.classes.length === 2, 'both kept with Str 14')

console.log('multiclassPrune.selfcheck: ok')
