/**
 * Self-check for Fighter 2024 FINAL names and table helpers.
 * Run: npx tsx src/shared/dnd/fighter2024Features.selfcheck.ts
 */
import {
  ACTION_SURGE_NAME_RU,
  ARCANE_CHARGE_NAME_RU,
  BATTLE_MASTER_MANEUVER_IDS_PHB_2024,
  BATTLE_MASTER_MANEUVER_IDS_TASHA_ONLY_2014,
  BATTLE_MASTER_NAME_RU,
  DEFY_DEATH_NAME_RU,
  FIGHTER_FEATURE_NAMES_BY_ID,
  FIGHTER_SUBCLASS_SLUGS_2024,
  GUARDED_MIND_NAME_RU,
  IMPROVED_CRITICAL_NAME_RU,
  INDOMITABLE_NAME_RU,
  KNOW_YOUR_ENEMY_NAME_RU,
  RELENTLESS_NAME_RU,
  STUDIED_ATTACKS_NAME_RU,
  STUDENT_OF_WAR_NAME_RU,
  TACTICAL_MASTER_NAME_RU,
  TACTICAL_MIND_NAME_RU,
  TACTICAL_SHIFT_NAME_RU,
  TELEKINETIC_ADEPT_NAME_RU,
  actionSurgeUses2024,
  eldritchKnightSpellTable2024,
  fighterAttackCount2024,
  indomitableUses2024,
  isOutOfPackFighterSubclassSlug,
  isPhbFighterSubclassSlug,
  maneuversKnown2024,
  psionicEnergyDice2024,
  secondWindUses2024,
  superiorityDiceCount2024,
  superiorityDieSize2024,
  weaponMasterySlots2024,
} from './fighter2024Features.ts'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`)
}

assert(FIGHTER_FEATURE_NAMES_BY_ID['tactical-mind'] === TACTICAL_MIND_NAME_RU, 'tactical mind map')
assert(TACTICAL_MIND_NAME_RU === 'Тактическое мышление', 'tactical mind final')
assert(TACTICAL_SHIFT_NAME_RU === 'Тактическое смещение', 'tactical shift final')
assert(TACTICAL_MASTER_NAME_RU === 'Тактическое решение', 'tactical master final')
assert(STUDIED_ATTACKS_NAME_RU === 'Изучающие выпады', 'studied attacks final')
assert(INDOMITABLE_NAME_RU === 'Непоколебимость', 'indomitable final')
assert(ACTION_SURGE_NAME_RU === 'Всплеск действий', 'action surge')
assert(IMPROVED_CRITICAL_NAME_RU === 'Улучшенный критический удар', 'improved crit')
assert(DEFY_DEATH_NAME_RU === 'Вызов смерти', 'defy death')
assert(BATTLE_MASTER_NAME_RU === 'Мастер боевых искусств', 'battle master')
assert(STUDENT_OF_WAR_NAME_RU === 'Ученик войны', 'student of war')
assert(KNOW_YOUR_ENEMY_NAME_RU === 'Знай своего врага', 'know your enemy')
assert(RELENTLESS_NAME_RU === 'Неутомимый', 'relentless')
assert(ARCANE_CHARGE_NAME_RU === 'Магический рывок', 'arcane charge')
assert(TELEKINETIC_ADEPT_NAME_RU === 'Телекинетический адепт', 'telekinetic adept')
assert(GUARDED_MIND_NAME_RU === 'Охраняемый разум', 'guarded mind')
assert(FIGHTER_FEATURE_NAMES_BY_ID.survivor === DEFY_DEATH_NAME_RU, 'survivor→defy death')
assert(FIGHTER_FEATURE_NAMES_BY_ID.relentless === RELENTLESS_NAME_RU, 'relentless map')

assert(secondWindUses2024(1) === 2, 'SW L1 = 2')
assert(secondWindUses2024(4) === 3, 'SW L4 = 3')
assert(secondWindUses2024(10) === 4, 'SW L10 = 4')
assert(actionSurgeUses2024(1) === 0, 'AS L1 = 0')
assert(actionSurgeUses2024(2) === 1, 'AS L2 = 1')
assert(actionSurgeUses2024(17) === 2, 'AS L17 = 2')
assert(indomitableUses2024(8) === 0, 'Ind L8 = 0')
assert(indomitableUses2024(9) === 1, 'Ind L9 = 1')
assert(indomitableUses2024(13) === 2, 'Ind L13 = 2')
assert(indomitableUses2024(17) === 3, 'Ind L17 = 3')
assert(weaponMasterySlots2024(1) === 3, 'WM L1 = 3')
assert(weaponMasterySlots2024(4) === 4, 'WM L4 = 4')
assert(weaponMasterySlots2024(10) === 5, 'WM L10 = 5')
assert(weaponMasterySlots2024(16) === 6, 'WM L16 = 6')
assert(fighterAttackCount2024(1) === 1, 'atk L1')
assert(fighterAttackCount2024(5) === 2, 'atk L5')
assert(fighterAttackCount2024(11) === 3, 'atk L11')
assert(fighterAttackCount2024(20) === 4, 'atk L20')
assert(superiorityDiceCount2024(3) === 4, 'sup dice L3 = 4')
assert(superiorityDieSize2024(3) === 8, 'sup die d8')
assert(superiorityDieSize2024(10) === 10, 'sup die d10')
assert(superiorityDieSize2024(18) === 12, 'sup die d12')
assert(maneuversKnown2024(3) === 3, 'maneuvers L3')
assert(BATTLE_MASTER_MANEUVER_IDS_PHB_2024.length === 20, '20 PHB maneuvers')
assert(BATTLE_MASTER_MANEUVER_IDS_TASHA_ONLY_2014.includes('grappling_strike'), 'tasha grappling')
assert(!BATTLE_MASTER_MANEUVER_IDS_PHB_2024.includes('grappling_strike' as never), 'no grappling in 2024')

const ek3 = eldritchKnightSpellTable2024(3)
assert(ek3.prepared === 3 && ek3.slots[0] === 2 && ek3.cantrips === 2, 'EK L3')
const ek11 = eldritchKnightSpellTable2024(11)
assert(ek11.prepared === 8 && ek11.slots[0] === 4 && ek11.slots[1] === 3, 'EK L11')
const psi3 = psionicEnergyDice2024(3)
assert(psi3.die === 6 && psi3.count === 4, 'psi L3')
const psi17 = psionicEnergyDice2024(17)
assert(psi17.die === 12 && psi17.count === 12, 'psi L17')

assert(isPhbFighterSubclassSlug(FIGHTER_SUBCLASS_SLUGS_2024.champion), 'champion PHB')
assert(isOutOfPackFighterSubclassSlug('fighter__cavalier'), 'cavalier out')
assert(!isPhbFighterSubclassSlug('fighter__cavalier'), 'cavalier not PHB picker')

console.log('fighter2024Features.selfcheck: ok')
