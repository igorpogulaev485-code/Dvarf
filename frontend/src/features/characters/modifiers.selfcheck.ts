/** npx tsx src/features/characters/modifiers.selfcheck.ts */

import { buildSheetFormulaVars } from '../../shared/dnd/formulas.ts'
import {
  applyBonusStack,
  createBonusLine,
  normalizeBonusLines,
  patchModifierList,
  readModifiers,
} from './modifiers.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const vars = buildSheetFormulaVars({
  mods: { str: 2, dex: 1, con: 3, int: -1, wis: 3, cha: 0 },
  proficiencyBonus: 2,
  level: 2,
})

const lines = normalizeBonusLines([
  { id: 'a', target: 'ac', label: 'Инфузия', op: '+', expr: '1', enabled: true },
  {
    id: 'b',
    target: 'ac',
    label: 'Щит веры',
    op: '+',
    expr: '2',
    enabled: false,
  },
  {
    id: 'c',
    target: 'ac',
    label: 'Мудрость',
    op: '+',
    expr: '[WIS]',
    enabled: true,
  },
])
assert(lines.length === 3, 'normalize')

const stacked = applyBonusStack(16, lines, vars)
assert(stacked.total === 20, `stack got ${stacked.total}`) // 16+1+3
assert(stacked.applied.filter((row) => row.ok).length === 2, 'enabled only')

const setLine = createBonusLine({
  target: 'ac',
  label: 'Override',
  op: '=',
  expr: '12',
  enabled: true,
})
const afterSet = applyBonusStack(16, [setLine, lines[0]!], vars)
assert(afterSet.total === 13, `set then + got ${afterSet.total}`)

const sheet = { modifiers: lines }
assert(readModifiers(sheet).length === 3, 'read')

const patched = patchModifierList([], lines, 'ac')
assert(patched.length === 3, 'patch')

console.log('modifiers.selfcheck ok')
