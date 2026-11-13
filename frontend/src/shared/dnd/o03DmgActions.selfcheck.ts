/**
 * O-03 selfcheck: падение, сутки без отдыха, адамантин, выбор действие/бонусное.
 * Run: npx --yes tsx src/shared/dnd/o03DmgActions.selfcheck.ts
 */
import {
  adamantineObjectHitIsCrit,
  disarmDealsDamage,
  fallingDiceCount,
  fallingDamageFormula,
  fallingProne,
  noLongRestDc,
  pickActionOrBonus,
  resolveNoLongRestSave,
  rollFallingDamage,
} from './o03DmgActions.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(fallingDiceCount(30) === 3, '30 ft → 3d6')
assert(fallingDiceCount(60) === 6, '60 ft → 6d6')
assert(fallingDiceCount(300) === 20, '300 ft → cap 20d6')
assert(fallingDiceCount(9) === 0, '9 ft → 0')
assert(fallingDamageFormula(30) === '3к6 дробящего', 'formula 30')
assert(fallingProne(1) === true, 'damage → prone')
assert(fallingProne(0) === false, '0 damage → no prone')

const rolled = rollFallingDamage(30, () => 0) // always 1
assert(rolled.dice === 3 && rolled.total === 3, 'roll 3×1')

assert(noLongRestDc(0) === 10, 'first day DC 10')
assert(noLongRestDc(1) === 15, 'second day DC 15')
assert(noLongRestDc(2) === 20, 'third day DC 20')

const fail = resolveNoLongRestSave({ daysAlready: 0, saveTotal: 9 })
assert(fail.dc === 10 && !fail.success && fail.exhaustionDelta === 1, 'fail +exh')
assert(fail.nextDays === 1, 'days advance on attempt')
const ok = resolveNoLongRestSave({ daysAlready: 1, saveTotal: 15 })
assert(ok.success && ok.exhaustionDelta === 0 && ok.nextDays === 2, 'save ok')

assert(adamantineObjectHitIsCrit({ adamantine: true, targetIsObject: true }), 'adam object crit')
assert(
  !adamantineObjectHitIsCrit({ adamantine: true, targetIsObject: false }),
  'adam creature not auto-crit',
)
assert(!disarmDealsDamage(), 'disarm no damage')

assert(
  pickActionOrBonus({ actionFree: false, bonusFree: true }) === 'bonus',
  'only bonus',
)
assert(
  pickActionOrBonus({ actionFree: true, bonusFree: false }) === 'action',
  'only action',
)
assert(
  pickActionOrBonus({ actionFree: true, bonusFree: true, prefer: 'bonus' }) === 'bonus',
  'prefer bonus',
)
assert(pickActionOrBonus({ actionFree: false, bonusFree: false }) === null, 'none free')

console.log('o03DmgActions.selfcheck: ok')
