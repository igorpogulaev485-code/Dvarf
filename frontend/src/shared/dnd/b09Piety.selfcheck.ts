/**
 * B-09 Theros piety: score ladder, ranks, champion +2/max 22, oracle ladder, buff.
 * Run: npx tsx src/shared/dnd/b09Piety.selfcheck.ts
 */
import { buildBuffEffect } from './activeEffects.ts'
import {
  activeRewardSlugs,
  applyPietyDelta,
  chooseGod,
  emptyPiety,
  pietyAbilityMaxes,
  setChampionAbility,
  setSupernaturalGift,
  syncPietyChampion,
  unlockedRanks,
  type AbilityKey,
  type PietyState,
} from './therosPiety.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// —— start 1 on chooseGod ——
let piety = chooseGod(emptyPiety(), 'heliod')
assert(piety.score === 1, 'chooseGod starts at 1')
assert(unlockedRanks(piety.score).length === 0, 'no ranks at 1')

// —— +2 → 3 unlocks devotee ——
piety = applyPietyDelta(piety, { delta: 2 })
assert(piety.score === 3, 'score 3')
assert(unlockedRanks(piety.score).join() === 'devotee', 'devotee at 3')
assert(activeRewardSlugs(piety).join() === 'piety_heliod_devotee', 'devotee reward slug')

// —— to 10 votary ——
piety = applyPietyDelta(piety, { delta: 7 })
assert(piety.score === 10, 'score 10')
assert(unlockedRanks(piety.score).join() === 'devotee,votary', 'votary at 10')
assert(activeRewardSlugs(piety).includes('piety_heliod_votary'), 'votary reward active')

// —— to 9 hides votary ——
piety = applyPietyDelta(piety, { delta: -1 })
assert(piety.score === 9, 'score 9')
assert(!activeRewardSlugs(piety).includes('piety_heliod_votary'), 'votary hidden at 9')
assert(piety.journal.length >= 4, 'journal grows')

// —— score never below 0 ——
assert(applyPietyDelta(piety, { delta: -50 }).score === 0, 'clamped at 0')

// —— champion: wis 20 → 22, max 22 ——
function champion(): { piety: PietyState; abilities: Record<AbilityKey, number> } {
  let p = chooseGod(emptyPiety(), 'heliod')
  p = applyPietyDelta(p, { delta: 49 })
  assert(p.score === 50, 'score 50')
  p = setChampionAbility(p, 'wis')
  assert(p.champion_ability === 'wis', 'heliod champion may pick wis')
  return { piety: p, abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 20, cha: 10 } }
}
{
  const draft = syncPietyChampion(champion())
  assert(draft.abilities.wis === 22, `wis 20 → 22, got ${draft.abilities.wis}`)
  assert(draft.piety.champion_applied === 2, 'champion applied')
  assert(pietyAbilityMaxes(draft.piety).wis === 22, 'wis max 22')
  assert(syncPietyChampion(draft) === draft, 'sync idempotent')

  const dropped = syncPietyChampion({
    ...draft,
    piety: applyPietyDelta(draft.piety, { delta: -1 }),
  })
  assert(dropped.abilities.wis === 20, 'wis back to 20 below 50')
  assert(pietyAbilityMaxes(dropped.piety).wis === undefined, 'no max below 50')
}
{
  const c = champion()
  const invalid = setChampionAbility(c.piety, 'dex')
  assert(invalid.champion_ability === 'wis', 'invalid champion ability ignored')
}

// —— oracle ladder ——
{
  let p = setSupernaturalGift(emptyPiety(), 'oracle')
  p = applyPietyDelta(p, { delta: 10 })
  assert(
    activeRewardSlugs(p).join() === 'piety_oracle_devotee,piety_oracle_votary',
    'oracle ladder at 10',
  )
  p = applyPietyDelta(p, { delta: 40 })
  p = setChampionAbility(p, 'int')
  assert(p.champion_ability === 'int', 'oracle champion picks int')
  assert(
    pietyAbilityMaxes(p).int === 22 && pietyAbilityMaxes(p).wis === undefined,
    'oracle champion max',
  )
}

// —— buff builds ——
{
  const effect = buildBuffEffect({ slug: 'piety_heliod_disciple' })
  assert(effect, 'heliod disciple buff exists')
  assert(
    effect.mods?.some(
      (m) => m.target === 'resistance' && m.op === 'set' && m.condition === 'fire',
    ),
    'heliod disciple has fire resistance',
  )
}

console.log('b09Piety.selfcheck ok')
