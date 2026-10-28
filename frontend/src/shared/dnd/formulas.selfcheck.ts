/** npx tsx src/shared/dnd/formulas.selfcheck.ts */

import {
  buildSheetFormulaVars,
  evalFormula,
  extractFormulaVars,
} from './formulas.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const plain = evalFormula('2')
assert(plain.ok && plain.value === 2, 'plain')

const vars = buildSheetFormulaVars({
  mods: { str: 2, dex: 1, con: 3, int: -1, wis: 3, cha: 0 },
  proficiencyBonus: 2,
  level: 2,
})
assert(vars.WIS === 3 && vars.PROF === 2 && vars.HALF_PROF === 1, 'vars')

const sum = evalFormula('[WIS]+2', vars)
assert(sum.ok && sum.value === 5, 'wis+2')

const neg = evalFormula('10+[INT]', vars)
assert(neg.ok && neg.value === 9, 'neg mod')

const bad = evalFormula('[FOO]+1', vars)
assert(!bad.ok, 'unknown var')

assert(extractFormulaVars('1+[str]+[PROF]').join(',') === 'STR,PROF', 'extract')

console.log('formulas.selfcheck ok')
