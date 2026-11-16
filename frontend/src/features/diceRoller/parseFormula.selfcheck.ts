/**
 * DICE-01 parser selfcheck.
 * Run: npm run selfcheck:dice-parser
 */
import assert from 'node:assert/strict'
import { formulaFromPool, parseFormula } from './parseFormula'

function ok(expr: string) {
  const r = parseFormula(expr)
  assert.equal(r.ok, true, `expected ok: ${expr}`)
  return r
}

function fail(expr: string, msgPart?: string) {
  const r = parseFormula(expr)
  assert.equal(r.ok, false, `expected fail: ${expr}`)
  if (msgPart && r.ok === false) {
    assert.match(r.message, new RegExp(msgPart, 'i'), r.message)
  }
  return r
}

{
  const r = ok('2d6+3')
  assert.equal(r.ok && r.canonical, '2d6+3')
  assert.equal(r.ok && r.totalDice, 2)
  assert.equal(r.ok && r.simplePool, true)
  assert.equal(r.ok && r.pool.counts[6], 2)
  assert.equal(r.ok && r.pool.modifier, 3)
}

{
  const r = ok('1d20-1')
  assert.equal(r.ok && r.canonical, '1d20-1')
  assert.equal(r.ok && r.singleD20Eligible, true)
  assert.equal(r.ok && r.pool.modifier, -1)
}

{
  const r = ok('3к8')
  assert.equal(r.ok && r.canonical, '3d8')
  assert.equal(r.ok && r.pool.counts[8], 3)
}

{
  const r = ok('1К12')
  assert.equal(r.ok && r.canonical, '1d12')
}

{
  const r = ok('4d6kh3')
  assert.equal(r.ok && r.canonical, '4d6kh3')
  assert.equal(r.ok && r.totalDice, 4)
  assert.equal(r.ok && r.simplePool, false)
  const g = r.ok && r.terms[0]
  assert.ok(g && g.kind === 'dice' && g.keepHighest === 3)
}

{
  const r = ok('2d20kl1')
  assert.equal(r.ok && r.canonical, '2d20kl1')
  const g = r.ok && r.terms[0]
  assert.ok(g && g.kind === 'dice' && g.keepLowest === 1)
  assert.equal(r.ok && r.singleD20Eligible, false)
}

{
  const r = ok('  2 d 6  +  3  ')
  assert.equal(r.ok && r.canonical, '2d6+3')
}

{
  const r = ok('d20')
  assert.equal(r.ok && r.canonical, '1d20')
  assert.equal(r.ok && r.singleD20Eligible, true)
}

{
  const r = ok('d%')
  assert.equal(r.ok && r.canonical, '1d100')
  assert.equal(r.ok && r.pool.counts[100], 1)
}

{
  const r = ok('1d20+1d4+2')
  assert.equal(r.ok && r.canonical, '1d20+1d4+2')
  assert.equal(r.ok && r.singleD20Eligible, true)
  assert.equal(r.ok && r.simplePool, true)
}

fail('', 'пуст')
fail('@@@', 'понял')
fail('2d6+', 'понял')
fail('4d6kh5', 'больше')
fail('1d1', 'граней')
fail('1d1001', 'граней')
fail('101d6', 'много')

{
  const long = `${'1d6+'.repeat(60)}1d6`
  assert.ok(long.length > 200)
  fail(long, 'длинн')
}

assert.equal(formulaFromPool({ counts: { 6: 2, 20: 1 }, modifier: 3 }), '2d6+1d20+3')
assert.equal(formulaFromPool({ counts: { 20: 1 }, modifier: -1 }), '1d20-1')
assert.equal(formulaFromPool({ counts: {}, modifier: 0 }), '')

console.log('parseFormula.selfcheck ok')
