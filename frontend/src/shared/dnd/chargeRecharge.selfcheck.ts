/** Run: npx tsx src/shared/dnd/chargeRecharge.selfcheck.ts */
import { applyLongRest, rechargeFormulaResources, type SheetResource } from './rest.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const staff: SheetResource = {
  id: 'gear-res:staff:staff_of_the_magi',
  name: 'Посох мага: заряды',
  max: 50,
  used: 20,
  reset: 'dawn',
  rechargeDice: '4d6+2',
}
const rolls = [4, 6, 6, 2]
let i = 0
const rng = () => {
  const value = rolls[i] ?? 1
  i += 1
  return (value - 1) / 6
}
const rolled = rechargeFormulaResources([staff], rng)
assert(rolled.resources[0]!.used === 50 - (30 + 4 + 6 + 6 + 2 + 2), '30 + 4d6+2, capped by max')
assert(rolled.lines[0]!.includes('4к6+2 = 20'), rolled.lines[0]!)
assert(rolled.lines[0]!.includes('30 → 50'), rolled.lines[0]!)

const longOnly: SheetResource = { id: 'a', name: 'Ярость', max: 3, used: 2, reset: 'long' }
const rested = applyLongRest({
  resources: [staff, longOnly],
  slots: {},
  pact_slots: null,
  exhaustion: 0,
  hp_max: 30,
  hit_dice_current: 1,
  hit_dice_max: 11,
  rng: () => 0,
})
assert(rested.resources.find((row) => row.id === 'a')!.used === 0, 'long pool still refills')
assert((rested.rechargeLines ?? []).some((line) => line.includes('Посох мага')), 'dawn line on long rest')

console.log('chargeRecharge.selfcheck: ok')
