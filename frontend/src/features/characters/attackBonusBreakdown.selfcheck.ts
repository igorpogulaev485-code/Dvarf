/**
 * U09: attack bonus parts (BM + ability + magic + other).
 * Run: npx tsx src/features/characters/attackBonusBreakdown.selfcheck.ts
 */
import {
  buildAttackBonusParts,
  sumAttackBonusParts,
} from './attackBonusBreakdown.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

{
  // Celestia-style dagger +1: DEX+3, PB+3, magic+1 → +7
  const parts = buildAttackBonusParts({
    abilityKey: 'dex',
    abilityMod: 3,
    proficient: true,
    proficiencyBonus: 3,
    magicBonus: 1,
  })
  assert(parts.length === 3, `dagger+1 parts ${parts.length}`)
  assert(sumAttackBonusParts(parts) === 7, `dagger+1 total ${sumAttackBonusParts(parts)}`)
  assert(parts.some((p) => p.id === 'magic' && p.value === 1), 'magic +1')
}

{
  // Second dagger +4: DEX+3, PB+3, magic+4 → +10
  const parts = buildAttackBonusParts({
    abilityKey: 'dex',
    abilityMod: 3,
    proficient: true,
    proficiencyBonus: 3,
    magicBonus: 4,
  })
  assert(sumAttackBonusParts(parts) === 10, `dagger+4 total ${sumAttackBonusParts(parts)}`)
}

{
  // Archery + infusion + effect; zeros omitted for optional extras
  const parts = buildAttackBonusParts({
    abilityKey: 'dex',
    abilityMod: 4,
    proficient: true,
    proficiencyBonus: 2,
    magicBonus: 0,
    styleBonus: 2,
    infusionBonus: 1,
    effectBonus: 2,
  })
  assert(sumAttackBonusParts(parts) === 11, `full stack ${sumAttackBonusParts(parts)}`)
  assert(!parts.some((p) => p.id === 'magic'), 'zero magic omitted')
  assert(parts.some((p) => p.id === 'style' && p.value === 2), 'style')
  assert(parts.some((p) => p.id === 'infusion' && p.value === 1), 'infusion')
  assert(parts.some((p) => p.id === 'effects' && p.value === 2), 'effects')
}

{
  const parts = buildAttackBonusParts({
    abilityKey: 'str',
    abilityMod: 2,
    proficient: false,
    proficiencyBonus: 3,
  })
  assert(sumAttackBonusParts(parts) === 2, 'no proficiency')
  const prof = parts.find((p) => p.id === 'prof')
  assert(prof?.value === 0 && prof.hint === 'нет владения', 'prof hint')
}

console.log('U09 attackBonusBreakdown: ok')
