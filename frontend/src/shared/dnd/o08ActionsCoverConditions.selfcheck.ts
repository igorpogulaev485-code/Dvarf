/**
 * O-08 selfcheck: actions, cover, condition roll modes.
 * Run: npx --yes tsx src/shared/dnd/o08ActionsCoverConditions.selfcheck.ts
 */
import {
  applyCunningBonus,
  applyFeatureSpend,
  clearReadyPrepared,
  emptyTurnEconomy,
  markReadyPrepared,
  readTurnEconomy,
  serializeTurnEconomy,
} from './turnEconomy.ts'
import {
  applyDashAction,
  applyDisengageAction,
  buildDodgeActionEffect,
  buildHelpAdvantageEffect,
  canDashAction,
  canDisengageAction,
  canTargetWithCover,
  canTriggerReady,
  conditionModeForSelf,
  conditionModeVsTarget,
  coverAcForAttacker,
  coverBonusBeyondEffects,
  coverNumericBonus,
  effectHasDodge,
  hasFortifiedHalfCover,
  isIncapacitatedLike,
  mergeRollModes,
  skulkerKeepsHiddenOnRangedMiss,
} from './o08ActionsCoverConditions.ts'
import type { ConditionRef } from './conditions.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

function cond(slug: string): ConditionRef {
  return { slug, name: slug, catalog_id: null }
}

// —— Action Dash sets same flag as cunning ——
let te = emptyTurnEconomy()
assert(canDashAction(te).ok, 'dash action available')
te = applyDashAction(te)
assert(te.action && te.dashedThisTurn, 'dash action sets dashedThisTurn')
assert(!canDashAction(te).ok, 'dash blocked after action spent')

// Cunning dash still works on fresh turn
te = emptyTurnEconomy()
te = applyCunningBonus(te, 'dash')
assert(te.bonus && te.dashedThisTurn && !te.action, 'cunning dash is bonus only')

// —— Action Disengage ——
te = emptyTurnEconomy()
te = applyDisengageAction(te)
assert(te.action && te.disengagedThisTurn, 'disengage action flag')
const roundTrip = readTurnEconomy(serializeTurnEconomy(te))
assert(roundTrip.disengagedThisTurn, 'disengage persists')

// —— Ready prepare + trigger ——
te = emptyTurnEconomy()
te = applyFeatureSpend(te, 'action')
te = markReadyPrepared(te, { trigger: 'враг появится', kind: 'attack' })
assert(te.readyPrepared && te.readyKind === 'attack', 'ready marked')
assert(canTriggerReady(te, {
  prepared: true,
  trigger: te.readyTrigger,
  kind: te.readyKind,
}).ok, 'ready can fire with reaction free')
te = applyFeatureSpend(te, 'reaction')
te = clearReadyPrepared(te)
assert(!te.readyPrepared, 'ready cleared')
assert(
  readTurnEconomy(serializeTurnEconomy(markReadyPrepared(emptyTurnEconomy(), {
    trigger: 'x',
    kind: 'spell',
    spellName: 'Щит',
    spellLevel: 1,
  }))).readySpellName === 'Щит',
  'ready spell round-trip',
)

// —— Cover bonuses ——
assert(coverNumericBonus('half') === 2, 'half +2')
assert(coverNumericBonus('three_quarters') === 5, '¾ +5')
assert(coverNumericBonus('total') === 0, 'total no numeric')
assert(!canTargetWithCover({ cover: 'total' }).ok, 'total blocks target')
assert(canTargetWithCover({ cover: 'half' }).ok, 'half ok')

const fortifiedFx = [
  {
    id: '1',
    name: 'Укреплённая позиция',
    slug: 'fortified_position',
    mods: [
      { target: 'ac', op: 'add', value: 2, condition: 'half_cover' },
      { target: 'label', op: 'set', condition: 'fortified_position_half_cover' },
    ],
  },
]
assert(hasFortifiedHalfCover(fortifiedFx), 'detect fortified')
assert(
  coverBonusBeyondEffects({ cover: 'half', hasFortifiedHalfCover: true }) === 0,
  'half + fortified does not stack',
)
assert(
  coverBonusBeyondEffects({ cover: 'three_quarters', hasFortifiedHalfCover: true }) === 3,
  '¾ replaces half: +3 beyond fortified',
)
assert(
  coverBonusBeyondEffects({ cover: 'half', hasFortifiedHalfCover: false }) === 2,
  'half alone +2',
)

// Sharpshooter ignores ¾
assert(
  coverAcForAttacker({ cover: 'three_quarters', ignore: 'ranged_weapon' }).bonus === 0,
  'SS ignores ¾',
)
assert(
  coverAcForAttacker({ cover: 'three_quarters', ignore: 'none' }).bonus === 5,
  'normal sees ¾',
)
assert(
  coverAcForAttacker({ cover: 'total', ignore: 'ranged_weapon' }).blocked,
  'SS cannot shoot total cover',
)

// —— Condition modes ——
const poisoned = conditionModeForSelf([cond('poisoned')], {
  rollKind: 'attack',
  attackReach: 'melee',
})
assert(poisoned.mode === 'disadvantage', 'poisoned attack dis')
assert(poisoned.reasons.some((r) => /отравлен/.test(r)), 'poison reason')

const checkPoison = conditionModeForSelf([cond('poisoned')], { rollKind: 'check' })
assert(checkPoison.mode === 'disadvantage', 'poisoned check dis')

const proneMeleeSelf = conditionModeForSelf([cond('prone')], {
  rollKind: 'attack',
  attackReach: 'melee',
})
assert(proneMeleeSelf.mode === 'disadvantage', 'prone melee self dis')

const vsProneMelee = conditionModeVsTarget({
  targetConditions: [cond('prone')],
  attackReach: 'melee',
})
assert(vsProneMelee.mode === 'advantage', 'vs prone melee adv')

const vsProneRanged = conditionModeVsTarget({
  targetConditions: [cond('prone')],
  attackReach: 'ranged',
})
assert(vsProneRanged.mode === 'disadvantage', 'vs prone ranged dis')

const invisible = conditionModeForSelf([cond('invisible')], {
  rollKind: 'attack',
  attackReach: 'melee',
})
assert(invisible.mode === 'advantage', 'invisible attack adv')

const vsInvisible = conditionModeVsTarget({
  targetConditions: [cond('invisible')],
  attackReach: 'ranged',
})
assert(vsInvisible.mode === 'disadvantage', 'vs invisible dis')

const vsDodge = conditionModeVsTarget({
  targetDodging: true,
  attackReach: 'melee',
})
assert(vsDodge.mode === 'disadvantage', 'vs dodge dis')

// Dodge + poisoned cancel when both on same attack? attacker poisoned + target dodge = 2 dis → still dis
assert(
  mergeRollModes('disadvantage', 'disadvantage') === 'disadvantage',
  'two dis stay dis',
)
// attacker poisoned (dis) + invisible (adv) = cancel
assert(mergeRollModes('disadvantage', 'advantage') === 'normal', 'cancel')

// Manual override: desk normal against auto-dis → still need merge with desk
// desk 'normal' + condition 'disadvantage' = dis; desk 'advantage' + dis = normal
assert(mergeRollModes('advantage', 'disadvantage') === 'normal', 'manual adv cancels auto dis')

const incap = isIncapacitatedLike([cond('paralyzed')])
assert(incap.blocked, 'paralyzed blocks actions')

const autoCrit = conditionModeVsTarget({
  targetConditions: [cond('unconscious')],
  attackReach: 'melee',
  within5ft: true,
})
assert(autoCrit.autoCrit, 'auto-crit in 5ft vs unconscious')

const dodgeFx = buildDodgeActionEffect('d1')
assert(effectHasDodge([dodgeFx]), 'dodge effect detected')
assert(dodgeFx.duration?.unit === 'until_source_next_turn_end', 'dodge expires')

const helpFx = buildHelpAdvantageEffect({
  forAttack: true,
  againstTargetName: 'Гоблин',
  sourceName: 'Альян',
})
assert(helpFx.mods?.some((m) => m.op === 'advantage' && m.once), 'help once adv')

assert(
  skulkerKeepsHiddenOnRangedMiss({
    hasSkulker: true,
    isRangedAttack: true,
    hit: false,
  }),
  'skulker keeps hide on miss',
)
assert(
  !skulkerKeepsHiddenOnRangedMiss({
    hasSkulker: false,
    isRangedAttack: true,
    hit: false,
  }),
  'no skulker clears',
)

console.log('o08ActionsCoverConditions.selfcheck: ok')
