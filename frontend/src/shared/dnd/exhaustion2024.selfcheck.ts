/**
 * P24-02: exhaustion 2024 vs 2014 isolation.
 * Run: npx --yes tsx src/shared/dnd/exhaustion2024.selfcheck.ts
 */
import {
  exhaustionD20Penalty2024,
  exhaustionHpMax2024,
  exhaustionSpeedFt2024,
} from './exhaustion2024.ts'
import {
  exhaustionHpMax,
  exhaustionRollFlags,
  exhaustionSpeedFt,
} from './exhaustion2014.ts'
import {
  exhaustionD20PenaltyForEdition,
  exhaustionHpMaxForEdition,
  exhaustionRollFlagsForEdition,
  exhaustionSpeedFtForEdition,
} from './exhaustionRules.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// —— 2024 level 3: −6 D20, −15 ft ——
{
  assert(exhaustionD20Penalty2024(3) === 6, '2024 L3 → −6')
  assert(exhaustionSpeedFt2024(30, 3) === 15, '2024 L3 speed 30→15')
  assert(exhaustionHpMax2024(40, 4) === 40, '2024 L4 does not halve HP max')
}

// —— 2014 level 3 / 4 unchanged ——
{
  const flags = exhaustionRollFlags(3)
  assert(flags.disadvantageOnChecks, '2014 L3 checks disadv')
  assert(flags.disadvantageOnAttacksAndSaves, '2014 L3 attack/save disadv')
  assert(exhaustionSpeedFt(30, 2) === 15, '2014 L2 half speed')
  assert(exhaustionHpMax(40, 4) === 20, '2014 L4 half HP max')
}

// —— dispatcher ——
{
  assert(exhaustionD20PenaltyForEdition(3, '2024') === 6, 'dispatch 2024 penalty')
  assert(exhaustionD20PenaltyForEdition(3, '2014') === 0, 'dispatch 2014 no penalty')
  assert(exhaustionSpeedFtForEdition(30, 3, '2024') === 15, 'dispatch speed 2024')
  assert(exhaustionSpeedFtForEdition(30, 2, '2014') === 15, 'dispatch speed 2014')
  assert(exhaustionHpMaxForEdition(40, 4, '2024') === 40, 'dispatch hp 2024')
  assert(exhaustionHpMaxForEdition(40, 4, '2014') === 20, 'dispatch hp 2014')
  const f24 = exhaustionRollFlagsForEdition(3, '2024')
  assert(f24.d20Penalty === 6 && !f24.disadvantageOnChecks, '2024 flags')
  const f14 = exhaustionRollFlagsForEdition(3, '2014')
  assert(f14.d20Penalty === 0 && f14.disadvantageOnAttacksAndSaves, '2014 flags')
}

console.log('exhaustion2024.selfcheck: ok')
