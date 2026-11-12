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

const jewel: SheetResource = {
  id: 'gear-res:jewel:charges',
  name: 'Драгоценность трёх молитв (пробуждённая): заряды',
  max: 5,
  used: 4,
  reset: 'dawn',
  rechargeDice: '3',
}
const fixed = rechargeFormulaResources([jewel], () => 0.99)
assert(fixed.resources[0]!.used === 1, 'fixed 3 restores 1+3, not the whole pool')
assert(fixed.lines[0]!.includes('3 = 3'), fixed.lines[0]!)
assert(fixed.lines[0]!.includes('1 → 4'), fixed.lines[0]!)

const full: SheetResource = { ...jewel, id: 'full', max: 3, used: 3, rechargeDice: undefined }
const refilled = rechargeFormulaResources([full])
assert(refilled.resources[0]!.used === 0, 'dawn without a formula still refills')

console.log('chargeRecharge.selfcheck: ok')
