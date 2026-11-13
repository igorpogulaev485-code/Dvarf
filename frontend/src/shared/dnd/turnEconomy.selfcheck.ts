/**
 * node --experimental-strip-types src/shared/dnd/turnEconomy.selfcheck.ts
 */
import {
  applyAttackSpend,
  applyCastSpend,
  applyFeatureSpend,
  canSpendAttack,
  canSpendCast,
  castingTimeToEconomyMark,
  emptyTurnEconomy,
  inferFeatureTiming,
  readTurnEconomy,
  resetTurnEconomy,
  serializeTurnEconomy,
  toggleTurnMark,
  turnsUntilOwn,
} from './turnEconomy.ts'

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

console.log('turnEconomy.selfcheck: ok')
