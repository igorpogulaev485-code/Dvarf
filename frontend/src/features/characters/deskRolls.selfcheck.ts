import {
  formatAttackRoll,
  formatSkillRoll,
  parseDamageExpression,
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

const check = rollCheck(5, () => 0.5) // die 11
assert(check.die === 11 && check.total === 16, 'rollCheck total')

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

const skill = formatSkillRoll('Скрытность', 3, () => 0.7) // die 15
assert(skill === 'Скрытность: 18 (d20:15 +3)', `skill format got: ${skill}`)

console.log('deskRolls.selfcheck ok')
