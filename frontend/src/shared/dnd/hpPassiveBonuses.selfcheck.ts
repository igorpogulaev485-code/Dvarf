/**
 * Draconic Resilience + Dwarven Toughness HP.
 * Run: npx tsx src/shared/dnd/hpPassiveBonuses.selfcheck.ts
 */
import { buildMaxHpByLevels } from './multiclassRules.ts'
import {
  expectedPassiveHpBonuses,
  formatAverageHpLabel,
  hasDwarvenToughness,
  reconcilePassiveHpBonuses,
} from './hpPassiveBonuses.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(hasDwarvenToughness('hill_dwarf'), 'hill_dwarf toughness')
assert(hasDwarvenToughness('gold_dwarf'), 'gold_dwarf toughness')
assert(!hasDwarvenToughness('mountain_dwarf'), 'mountain no toughness')

// CON 14 (+2), sorcerer d6 averages: L1 max 6+2(+1)=9; later 4+2(+1)=7
{
  const L1 = buildMaxHpByLevels({
    classes: [{ name: 'Чародей', level: 1 }],
    constitutionMod: 2,
    fallbackDie: 'd6',
    draconicResilience: true,
  })!
  assert(L1.total === 9, `draconic L1 → 9 got ${L1.total}`)

  const L8 = buildMaxHpByLevels({
    classes: [{ name: 'Чародей', level: 8 }],
    constitutionMod: 2,
    fallbackDie: 'd6',
    draconicResilience: true,
  })!
  // 9 + 7×7 = 58
  assert(L8.total === 58, `draconic L8 → 58 got ${L8.total}`)

  const L8plain = buildMaxHpByLevels({
    classes: [{ name: 'Чародей', level: 8 }],
    constitutionMod: 2,
    fallbackDie: 'd6',
    draconicResilience: false,
  })!
  assert(L8plain.total === 50, `plain L8 → 50 got ${L8plain.total}`)

  const L20 = buildMaxHpByLevels({
    classes: [{ name: 'Чародей', level: 20 }],
    constitutionMod: 2,
    fallbackDie: 'd6',
    draconicResilience: true,
  })!
  // 9 + 19×7 = 142
  assert(L20.total === 142, `draconic L20 → 142 got ${L20.total}`)
}

// Multiclass: only sorcerer levels get +1
{
  const multi = buildMaxHpByLevels({
    classes: [
      { name: 'Чародей', level: 3 },
      { name: 'Воин', level: 2 },
    ],
    constitutionMod: 2,
    draconicResilience: true,
  })!
  // Sorc L1: 9; Sorc L2-3: 7+7; Fighter L1 (mc): avg d10=6+2=8; Fighter L2: 8
  // = 9+7+7+8+8 = 39
  assert(multi.total === 39, `multiclass draconic → 39 got ${multi.total}`)
  const expected = expectedPassiveHpBonuses({
    classes: [
      { name: 'Чародей', level: 3 },
      { name: 'Воин', level: 2 },
    ],
    draconicResilience: true,
  })
  assert(expected.draconic === 3, `multiclass sorcerer levels → 3 got ${expected.draconic}`)
  assert(expected.dwarven === 0, 'no dwarf')
}

// Hill dwarf alone: +1 every level
{
  const dwarf = buildMaxHpByLevels({
    classes: [{ name: 'Воин', level: 5 }],
    constitutionMod: 2,
    dwarvenToughness: true,
  })!
  // L1: 10+2+1=13; L2-5: (6+2+1)×4 = 9×4=36; total 49
  assert(dwarf.total === 49, `hill dwarf fighter 5 → 49 got ${dwarf.total}`)
}

// Both bonuses: hill dwarf + draconic sorcerer 8
{
  const both = buildMaxHpByLevels({
    classes: [{ name: 'Чародей', level: 8 }],
    constitutionMod: 2,
    fallbackDie: 'd6',
    draconicResilience: true,
    dwarvenToughness: true,
  })!
  // plain 50 +8 dragon +8 dwarf = 66
  assert(both.total === 66, `dwarf+draconic L8 → 66 got ${both.total}`)
}

// Open-sheet reconcile: 50 → +8
{
  const fix = reconcilePassiveHpBonuses({
    hpMax: 50,
    classes: [{ name: 'Чародей', level: 8 }],
    constitutionMod: 2,
    draconicResilience: true,
    raceSlug: null,
    ledger: null,
  })
  assert(fix.delta === 8, `reconcile delta 8 got ${fix.delta}`)
  assert(fix.ledger.draconic === 8, 'ledger draconic 8')
  assert(fix.matchedAverage, 'matched average-without')
}

// Already correct: no change
{
  const ok = reconcilePassiveHpBonuses({
    hpMax: 58,
    classes: [{ name: 'Чародей', level: 8 }],
    constitutionMod: 2,
    draconicResilience: true,
    raceSlug: null,
    ledger: null,
  })
  assert(ok.delta === 0, 'already 58 → delta 0')
  assert(ok.ledger.draconic === 8, 'ledger pinned')
}

// Manual total: leave HP alone
{
  const manual = reconcilePassiveHpBonuses({
    hpMax: 61,
    classes: [{ name: 'Чародей', level: 8 }],
    constitutionMod: 2,
    draconicResilience: true,
    raceSlug: null,
    ledger: null,
  })
  assert(manual.delta === 0, 'manual HP untouched')
  assert(manual.ledger.draconic === 8, 'ledger still pinned to expected')
}

{
  const label = formatAverageHpLabel({
    hitDie: 'd6',
    constitutionMod: 2,
    averageGain: 7,
    draconicResilience: true,
  })
  assert(
    label.includes('+1 Драконья устойчивость') && label.includes('= +7'),
    `label draconic got ${label}`,
  )
  const dwarfLabel = formatAverageHpLabel({
    hitDie: 'd10',
    constitutionMod: 2,
    averageGain: 9,
    dwarvenToughness: true,
  })
  assert(
    dwarfLabel.includes('+1 Дварфийская стойкость') && dwarfLabel.includes('= +9'),
    `label dwarf got ${dwarfLabel}`,
  )
}

console.log('hpPassiveBonuses.selfcheck: ok')
