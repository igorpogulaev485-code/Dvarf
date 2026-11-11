/**
 * Smoke: Arcane Recovery budget + slot restore rules.
 * Run: npx tsx scripts/smoke-arcane-recovery.ts
 */
import {
  applyArcaneRecovery,
  arcaneRecoveryBudget,
} from '../src/shared/dnd/arcaneRecovery'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(arcaneRecoveryBudget(1) === 1, 'L1 budget 1')
assert(arcaneRecoveryBudget(5) === 3, 'L5 budget 3')
assert(arcaneRecoveryBudget(6) === 3, 'L6 budget 3')
assert(arcaneRecoveryBudget(20) === 10, 'L20 budget 10')

const slots = {
  '1': { max: 4, used: 2 },
  '2': { max: 3, used: 1 },
  '3': { max: 2, used: 0 },
  '6': { max: 1, used: 1 },
}

const ok = applyArcaneRecovery({
  slots,
  wizardLevel: 5,
  recoverByLevel: { 1: 1, 2: 1 },
})
assert(ok.ok, 'recover 1+2 = 3')
if (ok.ok) {
  assert(ok.cost === 3, 'cost 3')
  assert(ok.slots['1']!.used === 1, '1st used 1')
  assert(ok.slots['2']!.used === 0, '2nd used 0')
}

const over = applyArcaneRecovery({
  slots,
  wizardLevel: 5,
  recoverByLevel: { 1: 2, 2: 1 },
})
assert(!over.ok, '4 > budget 3')

const high = applyArcaneRecovery({
  slots,
  wizardLevel: 20,
  recoverByLevel: { 6: 1 },
})
assert(!high.ok, 'no 6+')

const none = applyArcaneRecovery({
  slots,
  wizardLevel: 5,
  recoverByLevel: {},
})
assert(!none.ok, 'empty selection')

console.log('smoke-arcane-recovery: ok', {
  l5: arcaneRecoveryBudget(5),
  recovered: ok.ok ? ok.slots : null,
})
