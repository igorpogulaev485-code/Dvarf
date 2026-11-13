/** Run: npx tsx src/features/characters/restSummary.selfcheck.ts */
import {
  buildHitDieHealPreview,
  buildLongRestSummary,
  buildShortRestResourcesSummary,
} from './restSummary.ts'
import type { SheetResource } from '../../shared/dnd/rest.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`restSummary.selfcheck: ${msg}`)
}

const heal = buildHitDieHealPreview({ hpCurrent: 40, hpMax: 70, healAmount: 12 })
assert(heal != null && heal.line.includes('Хиты 40 → 52/70'), heal?.line ?? 'missing')
assert(!heal!.line.includes('HP'), 'no HP in hit-die preview')

const pact = { max: 2, used: 1, level: 3 }
const shortRes: SheetResource[] = [
  { id: 'ki', name: 'Ки', max: 5, used: 3, reset: 'short' },
]
const short = buildShortRestResourcesSummary({
  resources: shortRes,
  pact_slots: pact,
  effects: [],
})
assert(
  short.lines.some((line) => line.includes('ячейки договора') || line.includes('Ячейки договора')),
  short.lines.join(' | '),
)
assert(short.lines.every((line) => !/\bpact\b/i.test(line) && !/\bHP\b/.test(line)), 'no pact/HP')
assert(short.result.pact_slots?.used === 0, 'pact cleared in result')
assert(short.result.resources[0]!.used === 0, 'short resource cleared')

const dawn: SheetResource = {
  id: 'gear-res:staff',
  name: 'Посох мага: заряды',
  max: 50,
  used: 20,
  reset: 'dawn',
  rechargeDice: '4d6+2',
}
const longRes: SheetResource[] = [
  dawn,
  { id: 'rage', name: 'Ярость', max: 3, used: 2, reset: 'long' },
]
const rolls = [4, 6, 6, 2]
let i = 0
const rng = () => {
  const value = rolls[i] ?? 1
  i += 1
  return (value - 1) / 6
}
const long = buildLongRestSummary({
  resources: longRes,
  slots: { '1': { max: 4, used: 2 } },
  pact_slots: pact,
  exhaustion: 2,
  hp_current: 40,
  hp_max: 70,
  hp_temp: 5,
  hit_dice_current: 2,
  hit_dice_max: 8,
  effects: [],
  rng,
})
assert(long.lines.some((line) => line.includes('Хиты 40 → 70')), long.lines.join(' | '))
assert(long.lines.some((line) => line.includes('Истощение 2 → 1')), 'exhaustion')
assert(long.lines.some((line) => line.includes('Временные хиты 5 → 0')), 'temp hp')
assert(long.lines.some((line) => line.includes('Ячейки договора')), 'pact label')
assert(long.lines.some((line) => line.includes('Посох мага')), 'dawn recharge')
assert(long.lines.every((line) => !/\bpact\b/i.test(line) && !/\bHP\b/.test(line)), 'no pact/HP')
assert(long.result.exhaustion === 1, 'same applyLongRest exhaustion')
assert(long.result.hp_current === 70, 'same applyLongRest hp')

console.log('restSummary.selfcheck: ok')
