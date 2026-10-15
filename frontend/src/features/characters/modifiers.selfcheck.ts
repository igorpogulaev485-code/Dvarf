/** npx tsx src/features/characters/modifiers.selfcheck.ts */

import { buildSheetFormulaVars } from '../../shared/dnd/formulas.ts'
import {
  abilityBonusTarget,
  abilityCheckBonus,
  applyAbilityScoreBonuses,
  applyBonusStack,
  createBonusLine,
  normalizeBonusLines,
  patchModifierList,
  readModifiers,
  withInitiativeBonus,
  withSpellCastBonuses,
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

const abilityLines = normalizeBonusLines([
  {
    id: 's',
    target: abilityBonusTarget('str', 'score'),
    label: 'Горный дварф',
    op: '+',
    expr: '2',
    enabled: true,
  },
  {
    id: 'k',
    target: abilityBonusTarget('str', 'check'),
    label: 'Guidance',
    op: '+',
    expr: '1d4',
    enabled: true,
  },
])
// 1d4 is not valid scalar — normalize keeps expr but eval fails; use flat
const abilityOk = normalizeBonusLines([
  {
    id: 's',
    target: 'str_score',
    label: 'Горный дварф',
    op: '+',
    expr: '2',
    enabled: true,
  },
  {
    id: 'k',
    target: 'str_check',
    label: 'Указание',
    op: '+',
    expr: '1',
    enabled: true,
  },
])
assert(abilityLines.length === 2, 'ability targets')
const scores = applyAbilityScoreBonuses(
  { str: 13, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  abilityOk,
  vars,
)
assert(scores.str === 15, `str score ${scores.str}`)
assert(abilityCheckBonus('str', abilityOk, vars) === 1, 'str check')

const spellLines = normalizeBonusLines([
  {
    id: 'dc',
    target: 'spell_dc',
    label: 'Амулет',
    op: '+',
    expr: '1',
    enabled: true,
  },
  {
    id: 'atk',
    target: 'spell_attack',
    label: 'Благословение',
    op: '+',
    expr: '2',
    enabled: true,
  },
])
assert(spellLines.length === 2, 'spell targets')
const cast = withSpellCastBonuses({
  baseDc: 13,
  baseAttack: 5,
  modifiers: spellLines,
  vars,
})
assert(cast.dc === 14 && cast.attack === 7, `cast ${cast.dc}/${cast.attack}`)

const initLines = normalizeBonusLines([
  {
    id: 'i',
    target: 'initiative',
    label: 'Бдительный',
    op: '+',
    expr: '5',
    enabled: true,
  },
])
const init = withInitiativeBonus({
  core: 1,
  modifiers: initLines,
  vars,
})
assert(init.total === 6, `init ${init.total}`)

console.log('modifiers.selfcheck ok')
