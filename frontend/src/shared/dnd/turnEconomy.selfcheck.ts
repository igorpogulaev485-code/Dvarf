/**
 * node --experimental-strip-types src/shared/dnd/turnEconomy.selfcheck.ts
 */
import {
  applyActionSurge,
  applyAttackSpend,
  applyCastSpend,
  applyCunningBonus,
  applyFeatureSpend,
  applyHideSpend,
  applySearchSpend,
  applySteadyAim,
  canCastByBonusSpellRule,
  canCastSpell,
  canSpendAttack,
  canSpendCast,
  canSpendCunningBonus,
  canSpendSearch,
  canSpendSteadyAim,
  castingTimeToEconomyMark,
  emptyTurnEconomy,
  inferFeatureTiming,
  readTurnEconomy,
  resetTurnEconomy,
  resolveHideTiming,
  serializeTurnEconomy,
  setMoved,
  toggleTurnMark,
  turnsUntilOwn,
} from './turnEconomy'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}

let s = emptyTurnEconomy()
assert(!s.action && !s.bonus && !s.reaction, 'empty marks off')

// Warrior: attack → action on; second attack ok
assert(canSpendAttack(s).ok, 'first attack ok')
s = applyAttackSpend(s)
assert(s.action && s.actionSpentAs === 'attack', 'action spent by attack')
assert(canSpendAttack(s).ok, 'extra attack ok')
s = applyAttackSpend(s)
assert(s.action && s.actionSpentAs === 'attack', 'still attack')

// Cast Cure Wounds (action) blocked while action spent by attack
assert(!canSpendCast(s, 'action').ok, 'cure wounds blocked')
s = toggleTurnMark(s, 'action')
assert(!s.action && s.actionSpentAs == null, 'manual clear action')
assert(canSpendCast(s, 'action').ok, 'cast after manual clear')

// Cleric: Spiritual Weapon bonus → attack still free
s = emptyTurnEconomy()
assert(castingTimeToEconomyMark('1 бонусное действие') === 'bonus', 'bonus label')
assert(canSpendCast(s, 'bonus').ok, 'bonus cast ok')
s = applyCastSpend(s, {
  timing: 'bonus',
  name: 'Духовное оружие',
  level: 2,
})
assert(s.bonus && !s.action, 'bonus on, action free')
assert(canSpendAttack(s).ok, 'attack after bonus cast')
assert(!canSpendCast(s, 'bonus').ok, 'second bonus blocked')

// Shield reaction
s = emptyTurnEconomy()
assert(castingTimeToEconomyMark('1 реакция') === 'reaction', 'reaction label')
s = applyCastSpend(s, { timing: 'reaction', name: 'Щит', level: 1 })
assert(s.reaction, 'reaction spent')
assert(!canSpendCast(s, 'reaction').ok, 'second shield blocked')
s = resetTurnEconomy(s)
assert(!s.reaction && s.castsThisTurn.length === 0, 'reset clears')

// Feature timing heuristics
assert(inferFeatureTiming('Как бонусное действие…') === 'bonus', 'feature bonus')
assert(inferFeatureTiming('Реакцией, когда…') === 'reaction', 'feature reaction')
assert(inferFeatureTiming('Вы атакуете.') === 'action', 'feature default action')
s = emptyTurnEconomy()
s = applyFeatureSpend(s, 'action')
assert(s.action && s.actionSpentAs === 'feature', 'feature spends action')

// Ritual / minute — no mark
assert(castingTimeToEconomyMark('10 минут') == null, 'minute no mark')
assert(castingTimeToEconomyMark({ unit: 'hour', amount: 1 }) == null, 'hour no mark')

// Persist round-trip
s = applyAttackSpend(emptyTurnEconomy())
s = applyCastSpend(s, { timing: 'bonus', name: 'X', level: 1 })
const raw = serializeTurnEconomy(s)
const back = readTurnEconomy(raw)
assert(back.action && back.bonus && back.castsThisTurn.length === 1, 'round-trip')
assert(readTurnEconomy(null).action === false, 'null = empty')

// Queue distance
assert(
  turnsUntilOwn(
    [
      { kind: 'enemy', ref_id: 'e1' },
      { kind: 'pc', ref_id: 'me' },
      { kind: 'pc', ref_id: 'other' },
    ],
    0,
    'me',
  ) === 1,
  'turns until = 1',
)
assert(
  turnsUntilOwn([{ kind: 'pc', ref_id: 'me' }], 0, 'me') === 0,
  'own turn = 0',
)

// ——— T-02: Э6 бонусное заклинание ———
// Бонусное «Духовное оружие» + действие «Огненный снаряд» (не заговор) — нельзя
s = emptyTurnEconomy()
s = applyCastSpend(s, { timing: 'bonus', name: 'Духовное оружие', level: 2 })
assert(!canCastByBonusSpellRule(s, { timing: 'action', level: 1 }).ok, 'bonus then firebolt leveled blocked')
// + заговор действием — можно
assert(canCastByBonusSpellRule(s, { timing: 'action', level: 0 }).ok, 'bonus then cantrip ok')
assert(canCastSpell(s, { timing: 'action', level: 0 }).ok, 'canCastSpell cantrip ok')
assert(!canCastSpell(s, { timing: 'action', level: 3 }).ok, 'canCastSpell fireball blocked')

// Чародей: бонусные «Мелкие друзья» + «Огненный шар» — нельзя; + «Огненный снаряд» — можно
s = emptyTurnEconomy()
s = applyCastSpend(s, { timing: 'bonus', name: 'Мелкие друзья', level: 0 })
assert(!canCastByBonusSpellRule(s, { timing: 'action', level: 3 }).ok, 'friends + fireball no')
assert(canCastByBonusSpellRule(s, { timing: 'action', level: 0 }).ok, 'friends + fire bolt ok')

// Жрец: действие «Лечение ран» + бонусное «Духовное оружие» — нельзя
s = emptyTurnEconomy()
s = applyCastSpend(s, { timing: 'action', name: 'Лечение ран', level: 1 })
assert(!canCastByBonusSpellRule(s, { timing: 'bonus', level: 2 }).ok, 'cure + spiritual weapon no')
assert(canCastByBonusSpellRule(s, { timing: 'bonus', level: 0 }).ok, 'cure + bonus cantrip ok')
// «Щит» реакцией после любого каста — можно
assert(canCastByBonusSpellRule(s, { timing: 'reaction', level: 1 }).ok, 'shield reaction ok')
assert(canSpendCast(s, 'reaction').ok, 'reaction mark free')

// «Щит веры» действием + «Щит» реакцией — можно
s = emptyTurnEconomy()
s = applyCastSpend(s, { timing: 'action', name: 'Щит веры', level: 1 })
assert(canCastSpell(s, { timing: 'reaction', level: 1 }).ok, 'shield of faith + shield ok')

// ——— T-02: Э7 Всплеск ———
s = emptyTurnEconomy()
s = applyCastSpend(s, { timing: 'action', name: 'Огненный снаряд', level: 0 })
assert(!canSpendCast(s, 'action').ok, 'second action cast blocked without surge')
s = applyActionSurge(s)
assert(s.extraActions === 1, 'surge grants extra action')
assert(canSpendCast(s, 'action').ok, 'surge unlocks second action cast')
assert(canCastByBonusSpellRule(s, { timing: 'action', level: 3 }).ok, 'surge second leveled ok')
s = applyCastSpend(s, { timing: 'action', name: 'Огненный шар', level: 3 })
assert(s.extraActions === 0 && s.castsThisTurn.length === 2, 'surge spent on second cast')
s = resetTurnEconomy(s)
assert(s.extraActions === 0, 'reset burns unused surge action')

// ——— T-02: Э8 Ускоренное ———
s = emptyTurnEconomy()
s = applyCastSpend(s, {
  timing: 'bonus',
  name: 'Огненный шар',
  level: 3,
  quickened: true,
})
assert(s.bonus && !s.action && s.castsThisTurn[0]?.quickened, 'quickened spends bonus')
assert(canCastByBonusSpellRule(s, { timing: 'action', level: 0 }).ok, 'quickened then cantrip ok')
assert(!canCastByBonusSpellRule(s, { timing: 'action', level: 3 }).ok, 'quickened then fireball no')

// ——— T-02: Э9 Поиск / Засада ———
s = emptyTurnEconomy()
assert(canSpendSearch(s).ok, 'search ok')
s = applySearchSpend(s)
assert(s.action && s.actionSpentAs === 'search', 'search spends action')
assert(!canSpendSearch(s).ok, 'second search blocked')

s = emptyTurnEconomy()
const hideRogue = resolveHideTiming(s, true)
assert(hideRogue.ok && hideRogue.timing === 'bonus', 'rogue hide = bonus')
s = applyHideSpend(s, 'bonus')
assert(s.bonus && !s.action, 'rogue hide marked bonus')

s = emptyTurnEconomy()
const hideFighter = resolveHideTiming(s, false)
assert(hideFighter.ok && hideFighter.timing === 'action', 'fighter hide = action')
s = applyHideSpend(s, 'action')
assert(s.action && s.actionSpentAs === 'search', 'fighter hide marked action')

// Rogue: bonus spent → hide falls back to action
s = emptyTurnEconomy()
s = { ...s, bonus: true }
const hideFallback = resolveHideTiming(s, true)
assert(hideFallback.ok && hideFallback.timing === 'action', 'rogue hide fallback action')

// ——— L-20: Точное прицеливание / Хитрое действие ———
s = emptyTurnEconomy()
assert(canSpendSteadyAim(s).ok, 'steady aim ok at start')
s = applySteadyAim(s)
assert(s.bonus && s.steadyAim, 'steady aim spends bonus + flag')
assert(!canSpendSteadyAim(s).ok, 'second steady aim blocked')
s = applyAttackSpend(s)
assert(!s.steadyAim && s.action, 'attack clears steadyAim advantage')

s = emptyTurnEconomy()
s = setMoved(s, true)
assert(!canSpendSteadyAim(s).ok, 'moved blocks steady aim')

s = emptyTurnEconomy()
assert(canSpendCunningBonus(s).ok, 'cunning dash/disengage ok')
s = applyCunningBonus(s)
assert(s.bonus && !canSpendCunningBonus(s).ok, 'cunning bonus spent')

const rawAim = serializeTurnEconomy(applySteadyAim(emptyTurnEconomy()))
assert(rawAim.steady_aim === true && rawAim.moved === false, 'serialize steady_aim')
assert(readTurnEconomy(rawAim).steadyAim === true, 'read steadyAim')

// O-07: Отход → disengagedThisTurn (Страж / O-08)
s = emptyTurnEconomy()
s = applyCunningBonus(s, 'disengage')
assert(s.disengagedThisTurn && s.bonus, 'cunning disengage flag')
assert(
  readTurnEconomy(serializeTurnEconomy(s)).disengagedThisTurn,
  'disengage round-trip',
)

console.log('turnEconomy.selfcheck: ok')
