/**
 * DICE-01 fair RNG selfcheck.
 * Run: npm run selfcheck:dice-rng
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomIntBelow, rollFairDie } from './fairRandom'

const here = dirname(fileURLToPath(import.meta.url))

{
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  const src = strip(readFileSync(join(here, 'fairRandom.ts'), 'utf8'))
  assert.doesNotMatch(src, /Math\.random/)
  const rollSrc = strip(readFileSync(join(here, 'rollFormula.ts'), 'utf8'))
  assert.doesNotMatch(rollSrc, /Math\.random/)
}

function seqFill(values: number[]): (out: Uint32Array) => void {
  let i = 0
  return (out) => {
    out[0] = values[i] ?? values[values.length - 1]!
    i += 1
  }
}

// Rejection: value >= threshold must be discarded.
// For maxExclusive=3, threshold = 2^32 - (2^32 % 3) = 4294967295? 
// 0x100000000 % 3 = 1, threshold = 0x100000000 - 1 = 0xFFFFFFFF
// So only 0xFFFFFFFF is rejected for n=3? Actually 2^32 % 3 = 1, yes threshold = 2^32-1.
// Better test with power-of-two-ish: n=3, feed 0,1,2 → 0,1,2
{
  const fill = seqFill([0, 1, 2])
  assert.equal(randomIntBelow(3, fill), 0)
  assert.equal(randomIntBelow(3, fill), 1)
  assert.equal(randomIntBelow(3, fill), 2)
}

{
  const fill = seqFill([0, 19])
  assert.equal(rollFairDie(20, fill), 1)
  assert.equal(rollFairDie(20, fill), 20)
}

// Range check: many rolls stay in 1…N
{
  const N = 20
  const counts = new Array(N + 1).fill(0)
  const trials = 12_000
  for (let i = 0; i < trials; i += 1) {
    const v = rollFairDie(N)
    assert.ok(v >= 1 && v <= N, `out of range ${v}`)
    counts[v] += 1
  }
  // Chi-square goodness of fit vs uniform.
  const expected = trials / N
  let chi = 0
  for (let face = 1; face <= N; face += 1) {
    const o = counts[face]!
    chi += ((o - expected) ** 2) / expected
  }
  // df=19, critical ~36.2 at p=0.01; use generous 45 to avoid flakes.
  assert.ok(chi < 45, `d20 chi-square too high: ${chi}`)
}

{
  const N = 6
  const counts = new Array(N + 1).fill(0)
  const trials = 9_000
  for (let i = 0; i < trials; i += 1) {
    const v = rollFairDie(N)
    assert.ok(v >= 1 && v <= N)
    counts[v] += 1
  }
  const expected = trials / N
  let chi = 0
  for (let face = 1; face <= N; face += 1) {
    const o = counts[face]!
    chi += ((o - expected) ** 2) / expected
  }
  // df=5, critical ~15.1 at p=0.01; use 20.
  assert.ok(chi < 20, `d6 chi-square too high: ${chi}`)
}

console.log('fairRandom.selfcheck ok')
