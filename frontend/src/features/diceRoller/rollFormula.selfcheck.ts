/**
 * DICE-01 roll selfcheck.
 * Run: npm run selfcheck:dice-roll
 */
import assert from 'node:assert/strict'
import { rollExpression } from './rollFormula'

function seq(values: number[]): (sides: number) => number {
  let i = 0
  return () => {
    const v = values[i] ?? values[values.length - 1]!
    i += 1
    return v
  }
}

{
  const r = rollExpression('2d6+3', 'none', seq([4, 5]))
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.result.total, 12)
    assert.equal(r.result.dice.length, 2)
    assert.equal(r.result.modifierTotal, 3)
  }
}

{
  const r = rollExpression('1d20-1', 'none', seq([15]))
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.result.total, 14)
  }
}

{
  const r = rollExpression('3к8', 'none', seq([2, 3, 4]))
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.result.total, 9)
    assert.equal(r.result.expression, '3d8')
  }
}

{
  // 4d6kh3 — values 6,1,5,4 → keep 6,5,4 drop 1
  const r = rollExpression('4d6kh3', 'none', seq([6, 1, 5, 4]))
  assert.equal(r.ok, true)
  if (r.ok) {
    const kept = r.result.dice.filter((d) => !d.dropped)
    const dropped = r.result.dice.filter((d) => d.dropped)
    assert.equal(kept.length, 3)
    assert.equal(dropped.length, 1)
    assert.equal(dropped[0]?.value, 1)
    assert.equal(r.result.total, 15)
  }
}

{
  const r = rollExpression('2d20kl1', 'none', seq([18, 3]))
  assert.equal(r.ok, true)
  if (r.ok) {
    const kept = r.result.dice.filter((d) => !d.dropped)
    assert.equal(kept.length, 1)
    assert.equal(kept[0]?.value, 3)
    assert.equal(r.result.total, 3)
  }
}

{
  const r = rollExpression('d20', 'advantage', seq([5, 17]))
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.result.total, 17)
    assert.equal(r.result.dice.length, 2)
    assert.equal(r.result.dice.filter((d) => d.dropped).length, 1)
    assert.equal(r.result.dice.find((d) => d.dropped)?.value, 5)
  }
}

{
  const r = rollExpression('1d20+1d4', 'disadvantage', seq([12, 4, 3]))
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.result.total, 4 + 3) // keep low 4 from d20s, + d4=3
    assert.equal(r.result.dice.filter((d) => d.sides === 20).length, 2)
  }
}

{
  const r = rollExpression('2d20', 'advantage', seq([1, 2]))
  assert.equal(r.ok, false)
  if (!r.ok) assert.match(r.message, /d20/i)
}

{
  const r = rollExpression('2d6+', 'none')
  assert.equal(r.ok, false)
}

{
  const r = rollExpression('d20', 'none', seq([20]))
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.result.dice[0]?.nat, '20')
  }
}

{
  const r = rollExpression('d20', 'none', seq([1]))
  assert.equal(r.ok, true)
  if (r.ok) {
    assert.equal(r.result.dice[0]?.nat, '1')
  }
}

console.log('rollFormula.selfcheck ok')
