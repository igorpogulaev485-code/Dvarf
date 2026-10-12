import {
  armorGivesStealthDisadvantage,
  formatAttackRoll,
  formatSkillRoll,
  parseDamageExpression,
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

console.log('deskRolls.selfcheck ok')
