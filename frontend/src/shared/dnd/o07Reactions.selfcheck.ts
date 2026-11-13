/**
 * O-07 selfcheck: OA, Disengage/Sentinel, Parry math, Counterspell, Polearm.
 * Run: npx --yes tsx src/shared/dnd/o07Reactions.selfcheck.ts
 */
import {
  applyCunningBonus,
  applyFeatureSpend,
  emptyTurnEconomy,
  readTurnEconomy,
  serializeTurnEconomy,
} from './turnEconomy.ts'
import {
  applyParryDamageReduction,
  canOpportunityAttack,
  canParryReaction,
  canPolearmBonusAttack,
  canRiposteReaction,
  canSentinelAttack,
  classifyReactionSpell,
  counterspellAutoSucceeds,
  counterspellCheckDc,
  hasReactionSpellSlot,
  listReactionSpells,
  noteAttackWeaponForPolearmBonus,
  warCasterOpportunitySpellOk,
  weaponIsPolearmBonus,
  weaponIsPolearmOpportunity,
} from './o07Reactions.ts'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

// —— Disengage flag round-trip ——
let te = emptyTurnEconomy()
te = applyCunningBonus(te, 'disengage')
assert(te.bonus && te.disengagedThisTurn, 'cunning disengage sets flag')
const raw = serializeTurnEconomy(te)
const back = readTurnEconomy(raw)
assert(back.disengagedThisTurn, 'disengaged persists')

// —— OA leave blocked by Disengage without Sentinel ——
te = emptyTurnEconomy()
assert(
  canOpportunityAttack(te, {
    trigger: 'leave',
    hasSentinel: false,
    hasPolearmMaster: false,
    holdingPolearmOa: false,
    targetDisengaged: true,
  }).ok === false,
  'disengage blocks OA leave',
)
assert(
  canOpportunityAttack(te, {
    trigger: 'leave',
    hasSentinel: true,
    hasPolearmMaster: false,
    holdingPolearmOa: false,
    targetDisengaged: true,
  }).ok,
  'sentinel bypasses disengage on leave',
)

// —— OA enter needs polearm; Disengage still blocks ——
assert(
  !canOpportunityAttack(te, {
    trigger: 'enter',
    hasSentinel: true,
    hasPolearmMaster: false,
    holdingPolearmOa: false,
  }).ok,
  'enter without polearm blocked',
)
assert(
  canOpportunityAttack(te, {
    trigger: 'enter',
    hasSentinel: false,
    hasPolearmMaster: true,
    holdingPolearmOa: true,
  }).ok,
  'enter with polearm ok',
)
assert(
  !canOpportunityAttack(te, {
    trigger: 'enter',
    hasSentinel: true,
    hasPolearmMaster: true,
    holdingPolearmOa: true,
    targetDisengaged: true,
  }).ok,
  'enter + disengage blocked even with sentinel',
)

// —— Second reaction blocked ——
te = applyFeatureSpend(emptyTurnEconomy(), 'reaction')
assert(
  !canOpportunityAttack(te, {
    trigger: 'leave',
    hasSentinel: false,
    hasPolearmMaster: false,
    holdingPolearmOa: false,
  }).ok,
  'second reaction blocked',
)
assert(!canSentinelAttack(te, true).ok, 'sentinel blocked after reaction')

// —— Parry / Riposte gates ——
te = emptyTurnEconomy()
assert(
  canParryReaction(te, { knowsParry: true, hasSuperiorityDie: true }).ok,
  'parry ok',
)
assert(
  !canParryReaction(te, { knowsParry: true, hasSuperiorityDie: false }).ok,
  'parry needs die',
)
assert(
  canRiposteReaction(te, { knowsRiposte: true, hasSuperiorityDie: true }).ok,
  'riposte ok',
)
const parry = applyParryDamageReduction({ amount: 12, dieFace: 5, dexMod: 3 })
assert(parry.amount === 4 && parry.cut === 8, `parry cut ${parry.amount}`)
assert(
  applyParryDamageReduction({ amount: 3, dieFace: 8, dexMod: 2 }).amount === 0,
  'parry floor 0',
)

// —— Counterspell ——
assert(counterspellAutoSucceeds(4, 3), 'slot 4 > spell 3 auto')
assert(!counterspellAutoSucceeds(3, 3), 'equal level needs check')
assert(counterspellCheckDc(2) === 12, 'dc 10+2')

// —— Polearm weapons ——
assert(weaponIsPolearmBonus('Алебарда'), 'halberd bonus')
assert(weaponIsPolearmBonus('Копьё'), 'spear bonus')
assert(!weaponIsPolearmBonus('Пика'), 'pike no bonus attack')
assert(weaponIsPolearmOpportunity('Пика'), 'pike OA enter')
assert(weaponIsPolearmOpportunity('Глефа'), 'glaive OA')

te = emptyTurnEconomy()
te = { ...te, attackActionThisTurn: true, action: true, actionSpentAs: 'attack' }
te = noteAttackWeaponForPolearmBonus(te, {
  weaponName: 'Алебарда',
  hasPolearmMaster: true,
})
assert(te.polearmBonusReady, 'polearm ready after halberd')
assert(
  canPolearmBonusAttack(te, { hasPolearmMaster: true, holdingPolearm: true }).ok,
  'polearm bonus ok',
)
te = noteAttackWeaponForPolearmBonus(te, {
  weaponName: 'Длинный меч',
  hasPolearmMaster: true,
})
assert(!te.polearmBonusReady, 'non-polearm clears ready')

// —— Reaction spells list ——
const listed = listReactionSpells({
  known: [
    {
      id: '1',
      name: 'Щит',
      level: 1,
      casting_time: '1 реакция',
      catalog_id: 'shield',
      prepared: true,
    },
    {
      id: '2',
      name: 'Огненный снаряд',
      level: 0,
      casting_time: '1 действие',
      prepared: true,
    },
    {
      id: '3',
      name: 'Контрзаклинание',
      level: 3,
      casting_time: '1 реакция',
      catalog_id: 'counterspell',
      prepared: false,
    },
  ],
})
assert(listed.some((s) => s.kind === 'shield'), 'lists shield')
assert(!listed.some((s) => s.name === 'Огненный снаряд'), 'skips action spell')
assert(
  !listed.some((s) => s.kind === 'counterspell'),
  'skips unprepared leveled',
)
assert(classifyReactionSpell('hellish_rebuke') === 'hellish_rebuke', 'hellish')
assert(classifyReactionSpell('Поглощение стихий') === 'absorb_elements', 'absorb')
assert(hasReactionSpellSlot({ '1': { max: 2, used: 2 }, '2': { max: 1, used: 0 } }, 1), 'slot 2 covers 1')
assert(!hasReactionSpellSlot({ '1': { max: 1, used: 1 } }, 1), 'no slot')

// —— War Caster OA spell filter ——
assert(
  warCasterOpportunitySpellOk({
    name: 'Огненный снаряд',
    casting_time: '1 действие',
    range: '120 футов',
  }),
  'fire bolt ok',
)
assert(
  !warCasterOpportunitySpellOk({
    name: 'Огненный шар',
    casting_time: '1 действие',
    range: '150 футов',
    description: 'сфера радиусом 20 футов',
  }),
  'fireball rejected',
)
assert(
  !warCasterOpportunitySpellOk({
    name: 'Щит',
    casting_time: '1 реакция',
  }),
  'reaction spell not for war caster OA',
)

console.log('o07Reactions.selfcheck: ok')
