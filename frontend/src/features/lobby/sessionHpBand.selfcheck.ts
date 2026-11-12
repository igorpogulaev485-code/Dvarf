import { hpBand, hpLabelEnemy, hpLabelHero, hpRatio } from './sessionHpBand.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(hpBand(42, 60) === 'ok', '42/60 >50% → здоров')
assert(hpBand(30, 60) === 'warn', '30/60 ≤50% → ранен')
assert(hpBand(20, 60) === 'critical', '20/60 ≤1/3 → тяжело ранен')
assert(hpLabelHero('ok') === 'Здоров', 'герой: Здоров')
assert(hpLabelHero('critical') === 'Тяжело ранен', 'герой: Тяжело ранен')
assert(hpLabelEnemy('ok') === 'Цел', 'враг: Цел')
assert(Math.abs(hpRatio(30, 60) - 0.5) < 1e-9, 'ratio 0.5')

console.log('sessionHpBand selfcheck ok')
