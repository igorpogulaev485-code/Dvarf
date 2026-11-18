/**
 * Self-check for Rogue 2024 FINAL names and table helpers.
 * Run: npx tsx src/shared/dnd/rogue2024Features.selfcheck.ts
 */
import {
  ASSASSINATE_NAME_RU,
  CUNNING_STRIKE_EFFECT_NAMES_RU,
  CUNNING_STRIKE_NAME_RU,
  DEVIOUS_STRIKES_NAME_RU,
  EVASION_NAME_RU,
  EXPERTISE_NAME_RU,
  IMPROVED_CUNNING_STRIKE_NAME_RU,
  INFILTRATION_EXPERTISE_NAME_RU,
  RELIABLE_TALENT_MIN_LEVEL_2024,
  REND_MIND_NAME_RU,
  ROGUE_FEATURE_NAMES_BY_ID,
  ROGUE_SUBCLASS_SLUGS_2024,
  SLIPPERY_MIND_NAME_RU,
  SNEAK_ATTACK_NAME_RU,
  SOULKNIFE_NAME_RU,
  SPELL_THIEF_NAME_RU,
  STEADY_AIM_NAME_RU,
  STROKE_OF_LUCK_NAME_RU,
  VERSATILE_TRICKSTER_NAME_RU,
  cunningStrikeEffectCount2024,
  expertiseSkillsTotal2024,
  hasReliableTalent2014,
  hasReliableTalent2024,
  isOutOfPackRogueSubclassSlug,
  isPhbRogueSubclassSlug,
  psionicEnergyDice2024,
  slipperyMindSaveProficiencies2024,
  sneakAttackDice2024,
  strokeOfLuckMax2024,
  weaponMasterySlots2024,
} from './rogue2024Features.ts'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`)
}

assert(SNEAK_ATTACK_NAME_RU === 'Скрытая атака', 'sneak attack final')
assert(EXPERTISE_NAME_RU === 'Компетентность', 'expertise final')
assert(STEADY_AIM_NAME_RU === 'Точное прицеливание', 'steady aim final')
assert(CUNNING_STRIKE_NAME_RU === 'Хитрый удар', 'cunning strike')
assert(IMPROVED_CUNNING_STRIKE_NAME_RU === 'Улучшенный Хитрый удар', 'improved cunning')
assert(DEVIOUS_STRIKES_NAME_RU === 'Бесчестные удары', 'devious')
assert(EVASION_NAME_RU === 'Увёртливость', 'evasion')
assert(SLIPPERY_MIND_NAME_RU === 'Скользкий ум', 'slippery mind')
assert(STROKE_OF_LUCK_NAME_RU === 'Удача', 'stroke of luck')
assert(ASSASSINATE_NAME_RU === 'Убийство', 'assassinate')
assert(INFILTRATION_EXPERTISE_NAME_RU === 'Мастерство внедрения', 'infiltration')
assert(VERSATILE_TRICKSTER_NAME_RU === 'Универсальный ловкач', 'versatile')
assert(SPELL_THIEF_NAME_RU === 'Похититель заклинаний', 'spell thief')
assert(SOULKNIFE_NAME_RU === 'Клинок душ', 'soulknife')
assert(REND_MIND_NAME_RU === 'Разрыв разума', 'rend mind')

assert(ROGUE_FEATURE_NAMES_BY_ID['steady-aim'] === STEADY_AIM_NAME_RU, 'steady map')
assert(ROGUE_FEATURE_NAMES_BY_ID['devious-strikes'] === DEVIOUS_STRIKES_NAME_RU, 'devious map')
assert(ROGUE_FEATURE_NAMES_BY_ID['stroke-of-luck'] === STROKE_OF_LUCK_NAME_RU, 'luck map')
assert(ROGUE_FEATURE_NAMES_BY_ID.assassinate === ASSASSINATE_NAME_RU, 'assassinate map')
assert(ROGUE_FEATURE_NAMES_BY_ID['spell-thief'] === SPELL_THIEF_NAME_RU, 'spell thief map')
assert(ROGUE_FEATURE_NAMES_BY_ID['rend-mind'] === REND_MIND_NAME_RU, 'rend map')

assert(CUNNING_STRIKE_EFFECT_NAMES_RU.poison === 'Отравление', 'poison name')
assert(CUNNING_STRIKE_EFFECT_NAMES_RU.trip === 'Подсечка', 'trip name')
assert(CUNNING_STRIKE_EFFECT_NAMES_RU.withdraw === 'Отступление', 'withdraw name')
assert(CUNNING_STRIKE_EFFECT_NAMES_RU.daze === 'Шок', 'daze name')
assert(CUNNING_STRIKE_EFFECT_NAMES_RU.obscure === 'Ослепление', 'obscure name')

assert(sneakAttackDice2024(1) === 1, 'sneak L1')
assert(sneakAttackDice2024(3) === 2, 'sneak L3')
assert(sneakAttackDice2024(5) === 3, 'sneak L5')
assert(sneakAttackDice2024(11) === 6, 'sneak L11')
assert(sneakAttackDice2024(20) === 10, 'sneak L20')
assert(weaponMasterySlots2024(1) === 2, 'WM = 2')
assert(weaponMasterySlots2024(20) === 2, 'WM still 2')
assert(expertiseSkillsTotal2024(1) === 2, 'expertise L1 = 2')
assert(expertiseSkillsTotal2024(5) === 2, 'expertise L5 = 2')
assert(expertiseSkillsTotal2024(6) === 4, 'expertise L6 = 4')
assert(cunningStrikeEffectCount2024(5) === 1, 'cunning effects L5')
assert(cunningStrikeEffectCount2024(11) === 2, 'cunning effects L11')
assert(hasReliableTalent2024(7) === true, 'reliable @7 2024')
assert(hasReliableTalent2024(6) === false, 'no reliable @6')
assert(hasReliableTalent2014(7) === false, '2014 not @7')
assert(hasReliableTalent2014(11) === true, '2014 @11')
assert(RELIABLE_TALENT_MIN_LEVEL_2024 === 7, 'reliable min level')
assert(slipperyMindSaveProficiencies2024(15).join(',') === 'wis,cha', 'slippery saves')
assert(slipperyMindSaveProficiencies2024(14).length === 0, 'no slippery before 15')
assert(strokeOfLuckMax2024(20) === 1, 'luck L20')
assert(strokeOfLuckMax2024(19) === 0, 'no luck L19')

const psi3 = psionicEnergyDice2024(3)
assert(psi3.die === 6 && psi3.count === 4, 'psi L3')
const psi5 = psionicEnergyDice2024(5)
assert(psi5.die === 8 && psi5.count === 6, 'psi L5')
const psi17 = psionicEnergyDice2024(17)
assert(psi17.die === 12 && psi17.count === 12, 'psi L17')

assert(isPhbRogueSubclassSlug(ROGUE_SUBCLASS_SLUGS_2024.thief), 'thief PHB')
assert(isPhbRogueSubclassSlug(ROGUE_SUBCLASS_SLUGS_2024.assassin), 'assassin PHB')
assert(isPhbRogueSubclassSlug(ROGUE_SUBCLASS_SLUGS_2024.arcaneTrickster), 'AT PHB')
assert(isPhbRogueSubclassSlug(ROGUE_SUBCLASS_SLUGS_2024.soulknife), 'soulknife PHB')
assert(isOutOfPackRogueSubclassSlug('rogue__phantom'), 'phantom out')
assert(!isPhbRogueSubclassSlug('rogue__phantom'), 'phantom not PHB picker')
assert(isOutOfPackRogueSubclassSlug('rogue__scion-of-the-three'), 'scion out')

console.log('rogue2024Features.selfcheck: ok')
