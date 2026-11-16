/**
 * P24-02: long rest 2024 restores all Hit Point Dice; 2014 half unchanged.
 * Run: npx --yes tsx src/shared/dnd/rest2024.selfcheck.ts
 */
import { applyLongRest } from './rest.ts'
import { recoverHitDiceOnLongRest, recoverHitDiceOnLongRest2024 } from './hitDice.ts'
import {
  applyLongRestFeaturePicks2024,
  canStartLongRest2024,
  LONG_REST_COOLDOWN_HOURS_2024,
} from './rest2024.ts'
import { isBloodied } from './bloodied.ts'
import {
  initiativeModeWithSurprise2024,
  surpriseRoundAllowed,
} from './surprise2024.ts'
import { hideCheck2024, castingTimeIsMagicAction } from './turnActions2024.ts'
import {
  mergeInitiativeMode2024,
  conditionCard2024,
} from './conditions2024.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

assert(recoverHitDiceOnLongRest(0, 8) === 4, '2014 half of 8')
assert(recoverHitDiceOnLongRest2024(0, 8) === 8, '2024 all of 8')

{
  const r14 = applyLongRest({
    resources: [],
    slots: {},
    pact_slots: null,
    exhaustion: 2,
    hp_max: 40,
    hit_dice_current: 0,
    hit_dice_max: 6,
    rules_edition: '2014',
  })
  assert(r14.hit_dice_current === 3, '2014 long rest half dice')
  assert(r14.exhaustion === 1, 'exhaustion −1')

  const r24 = applyLongRest({
    resources: [],
    slots: {},
    pact_slots: null,
    exhaustion: 2,
    hp_max: 40,
    hp_current: 5,
    hit_dice_current: 0,
    hit_dice_max: 6,
    rules_edition: '2024',
  })
  assert(r24.hit_dice_current === 6, '2024 long rest all dice')
  assert(r24.exhaustion === 1, '2024 exhaustion −1')

  const blocked = applyLongRest({
    resources: [],
    slots: {},
    pact_slots: null,
    exhaustion: 0,
    hp_max: 40,
    hp_current: 0,
    hit_dice_current: 0,
    hit_dice_max: 6,
    rules_edition: '2024',
  })
  assert(blocked.blocked === true, '2024 needs ≥1 HP')
}

assert(canStartLongRest2024(1), '1 HP ok')
assert(!canStartLongRest2024(0), '0 HP blocked')
assert(LONG_REST_COOLDOWN_HOURS_2024 === 16, '16h cooldown')

assert(isBloodied(10, 20), 'bloodied at half')
assert(isBloodied(9, 20), 'bloodied below half')
assert(!isBloodied(11, 20), 'not bloodied above half')

assert(initiativeModeWithSurprise2024('normal', true) === 'disadvantage', 'surprise disadv')
assert(initiativeModeWithSurprise2024('advantage', true) === 'normal', 'surprise cancels adv')
assert(!surpriseRoundAllowed('2024'), 'no L-21 in 2024')
assert(surpriseRoundAllowed('2014'), 'L-21 ok in 2014')

assert(hideCheck2024().dc === 15, 'Hide DC 15')
assert(castingTimeIsMagicAction('action'), 'action → Magic')

assert(conditionCard2024('grappled')?.srdPage === 182, 'grappled card')
assert(conditionCard2024('incapacitated')?.effectsRu.some((t) => t.includes('инициатив')), 'incap init')
assert(
  mergeInitiativeMode2024({ invisible: true, surprised: true }) === 'normal',
  'invis+surprise cancel',
)

{
  const locked = { values: { 'c1:divine_intervention_wish_lock': '2', 'c1:other': 'x' } }
  const once = applyLongRestFeaturePicks2024(locked)
  assert(once.values['c1:divine_intervention_wish_lock'] === '1', 'wish lock 2 → 1')
  const twice = applyLongRestFeaturePicks2024(once)
  assert(twice.values['c1:divine_intervention_wish_lock'] === undefined, 'wish lock 1 → free')
  assert(twice.values['c1:other'] === 'x', 'other picks kept')
  const none = { values: { 'c1:other': 'x' } }
  assert(applyLongRestFeaturePicks2024(none) === none, 'no lock: same ref')
}

console.log('rest2024.selfcheck: ok')
