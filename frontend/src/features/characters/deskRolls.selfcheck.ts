import {
  armorGivesStealthDisadvantage,
  formatAttackRoll,
  formatSkillRoll,
  parseDamageExpression,
  resolveAttackRoll,
  resolveRollMode,
  rollCheck,
  rollDamage,
  rollDie,
} from './deskRolls'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function seq(values: number[]): () => number {
  let i = 0
  return () => {
    const v = values[i] ?? values[values.length - 1]!
    i += 1
    return v
  }
}

assert(rollDie(20, () => 0) === 1, 'rollDie min')
assert(rollDie(20, () => 0.999) === 20, 'rollDie max')

const check = rollCheck(5, 'normal', () => 0.5) // die 11
assert(check.die === 11 && check.total === 16, 'rollCheck total')

const adv = rollCheck(2, 'advantage', seq([0.1, 0.9])) // 3 and 19
assert(adv.die === 19 && adv.otherDie === 3 && adv.total === 21, 'advantage keep')

const dis = rollCheck(0, 'disadvantage', seq([0.9, 0.1])) // 19 and 3
assert(dis.die === 3 && dis.otherDie === 19 && dis.total === 3, 'disadvantage keep')

assert(resolveRollMode('advantage', true) === 'normal', 'adv+dis cancel')
assert(resolveRollMode('normal', true) === 'disadvantage', 'forced dis')
assert(resolveRollMode('disadvantage', true) === 'disadvantage', 'forced stays')

assert(
  JSON.stringify(parseDamageExpression('1d8+2')) ===
    JSON.stringify({ count: 1, sides: 8, modifier: 2 }),
  'parse 1d8+2',
)
assert(
  JSON.stringify(parseDamageExpression('2к6')) ===
    JSON.stringify({ count: 2, sides: 6, modifier: 0 }),
  'parse 2к6',
)
assert(
  JSON.stringify(parseDamageExpression('1d8 + 2 дробящий')) ===
    JSON.stringify({ count: 1, sides: 8, modifier: 2 }),
  'parse with type',
)
assert(parseDamageExpression('—') == null, 'parse empty')

const dmg = rollDamage('2d6+1', seq([0, 0.9])) // 1 and 6
assert(dmg != null && dmg.total === 8 && dmg.detail === '2d6: 1+6+1', 'rollDamage')

const atk = formatAttackRoll({
  name: 'Молот',
  attackBonus: 4,
  damageExpr: '1d8+2',
  damageType: 'дробящий',
  rng: seq([0.45, 0.5]), // d20=10, d8=5
})
assert(
  atk === 'Молот: 14 (d20:10 +4) · урон 7 дробящий (1d8: 5+2)',
  `attack format got: ${atk}`,
)

const skill = formatSkillRoll('Скрытность', 3, 'normal', () => 0.7) // die 15
assert(skill === 'Скрытность: 18 (d20:15 +3)', `skill format got: ${skill}`)

const advSkill = formatSkillRoll('Атака', 1, 'advantage', seq([0.2, 0.8])) // 5, 17
assert(
  advSkill === 'Атака: 18 (d20:17/5 преим. +1)',
  `adv skill got: ${advSkill}`,
)

assert(armorGivesStealthDisadvantage({ armorKind: 'heavy' }), 'heavy stealth')
assert(
  armorGivesStealthDisadvantage({ armorKind: 'medium', armorName: 'Чешуйчатый' }),
  'scale stealth',
)
assert(
  !armorGivesStealthDisadvantage({ armorKind: 'medium', armorName: 'Кираса' }),
  'breastplate ok',
)

const crit = formatAttackRoll({
  name: 'Молот',
  attackBonus: 2,
  damageExpr: '1к8+2',
  damageType: 'дробящий',
  rng: seq([0.999, 0, 0.5]), // d20=20, then 1 and 5
})
assert(
  crit === 'Молот: 22 (d20:20 +2) · критическое попадание · урон 8 дробящий (2d8: 1+5+2)',
  `crit got: ${crit}`,
)
const notCrit = formatAttackRoll({
  name: 'Арбалет',
  attackBonus: 1,
  damageExpr: '1d8+1',
  mode: 'disadvantage',
  rng: seq([0.999, 0, 0.5]), // 20 and 1, keep 1, one damage die
})
assert(!notCrit.includes('критическое'), `disadvantage 20 is not a crit: ${notCrit}`)
assert(notCrit.includes('1d8:'), `disadvantage keeps one die: ${notCrit}`)

const stackedCrit = resolveAttackRoll({
  name: 'Меч',
  attackBonus: 5,
  damageExpr: '1d8+3',
  damageType: 'рубящий',
  extraDamages: [
    { expression: '1d8', type: 'излучением', label: 'Улучшенная божественная кара, 1к8' },
    { expression: '2d8', type: 'излучением', label: 'Божественная кара, 2к8' },
  ],
  rng: seq([0.999, 0, 0.5, 0, 0.25, 0, 0.25, 0.5, 0.75]),
})
assert(stackedCrit.crit, 'natural 20 is a crit')
assert(
  stackedCrit.text.includes('Улучшенная божественная кара, 1к8, 2d8: 1+3') &&
    stackedCrit.text.includes('Божественная кара, 2к8, 4d8: 1+3+5+7'),
  `stacked crit extras got: ${stackedCrit.text}`,
)

const might = formatSkillRoll('Проверка · Сила', 5, 'normal', () => 0.1, {
  value: 20,
  label: 'неукротимая мощь',
})
assert(
  might === 'Проверка · Сила: 20 (d20:3 +5 · неукротимая мощь, было 8)',
  `might got: ${might}`,
)
const mightSkip = formatSkillRoll('Проверка · Сила', 5, 'normal', () => 0.9, {
  value: 20,
  label: 'неукротимая мощь',
})
assert(!mightSkip.includes('неукротимая'), `high roll stays: ${mightSkip}`)

console.log('deskRolls.selfcheck ok')
