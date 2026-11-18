/**
 * Self-check for Barbarian 2024 FINAL names and table helpers.
 * Run: npx tsx src/shared/dnd/barbarian2024Features.selfcheck.ts
 */
import {
  BARBARIAN_FEATURE_NAMES_BY_ID,
  BARBARIAN_SUBCLASS_SLUGS_2024,
  BRUTAL_STRIKE_NAME_RU,
  DANGER_SENSE_NAME_RU,
  FANATICAL_FOCUS_NAME_RU,
  FRENZY_NAME_RU,
  INDOMITABLE_MIGHT_NAME_RU,
  INSTINCTIVE_POUNCE_NAME_RU,
  PERSISTENT_RAGE_NAME_RU,
  PRIMAL_KNOWLEDGE_NAME_RU,
  RAGE_OF_THE_WILDS_NAME_RU,
  RELENTLESS_RAGE_NAME_RU,
  VITALITY_OF_THE_TREE_NAME_RU,
  ZEALOUS_PRESENCE_NAME_RU,
  barbarianAttackCount2024,
  brutalStrikeDice2024,
  brutalStrikeEffectCount2024,
  isOutOfPackBarbarianSubclassSlug,
  isPhbBarbarianSubclassSlug,
  primalChampionAbilityBonus2024,
  rageDamageBonus2024,
  rageUses2024,
  relentlessRageHeal2024,
  warriorOfTheGodsDice2024,
  weaponMasterySlots2024,
} from './barbarian2024Features.ts'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`)
}

assert(BARBARIAN_FEATURE_NAMES_BY_ID['danger-sense'] === DANGER_SENSE_NAME_RU, 'danger sense map')
assert(DANGER_SENSE_NAME_RU === 'Чувство опасности', 'danger sense final')
assert(PRIMAL_KNOWLEDGE_NAME_RU === 'Изначальные знания', 'primal knowledge final')
assert(INSTINCTIVE_POUNCE_NAME_RU === 'Инстинктивный прыжок', 'instinctive pounce final')
assert(BRUTAL_STRIKE_NAME_RU === 'Жестокий удар', 'brutal strike')
assert(RELENTLESS_RAGE_NAME_RU === 'Непреклонная ярость', 'relentless rage final')
assert(PERSISTENT_RAGE_NAME_RU === 'Стойкая ярость', 'persistent rage')
assert(INDOMITABLE_MIGHT_NAME_RU === 'Неукротимая мощь', 'indomitable might final')
assert(FRENZY_NAME_RU === 'Безумие', 'frenzy final')
assert(RAGE_OF_THE_WILDS_NAME_RU === 'Ярость дикой природы', 'wilds rage')
assert(VITALITY_OF_THE_TREE_NAME_RU === 'Жизненная сила Древа', 'tree vitality')
assert(FANATICAL_FOCUS_NAME_RU === 'Фанатичный фокус', 'fanatical focus')
assert(ZEALOUS_PRESENCE_NAME_RU === 'Ревностное присутствие', 'zealous presence')
assert(BARBARIAN_FEATURE_NAMES_BY_ID.frenzy === FRENZY_NAME_RU, 'frenzy map')
assert(BARBARIAN_FEATURE_NAMES_BY_ID['fanatical-focus'] === FANATICAL_FOCUS_NAME_RU, 'focus map')

assert(rageUses2024(1) === 2, 'rage L1 = 2')
assert(rageUses2024(3) === 3, 'rage L3 = 3')
assert(rageUses2024(6) === 4, 'rage L6 = 4')
assert(rageUses2024(12) === 5, 'rage L12 = 5')
assert(rageUses2024(17) === 6, 'rage L17 = 6')
assert(rageDamageBonus2024(1) === 2, 'rage dmg L1')
assert(rageDamageBonus2024(9) === 3, 'rage dmg L9')
assert(rageDamageBonus2024(16) === 4, 'rage dmg L16')
assert(weaponMasterySlots2024(1) === 2, 'WM L1 = 2')
assert(weaponMasterySlots2024(4) === 3, 'WM L4 = 3')
assert(weaponMasterySlots2024(10) === 4, 'WM L10 = 4')
assert(barbarianAttackCount2024(1) === 1, 'atk L1')
assert(barbarianAttackCount2024(5) === 2, 'atk L5')
assert(brutalStrikeDice2024(9) === 1, 'brutal L9')
assert(brutalStrikeDice2024(17) === 2, 'brutal L17')
assert(brutalStrikeEffectCount2024(13) === 1, 'effects L13 = 1')
assert(brutalStrikeEffectCount2024(17) === 2, 'effects L17 = 2')
assert(relentlessRageHeal2024(11) === 22, 'relentless heal L11 = 22')
assert(relentlessRageHeal2024(20) === 40, 'relentless heal L20 = 40')
const wog3 = warriorOfTheGodsDice2024(3)
assert(wog3.die === 12 && wog3.count === 4, 'WoG L3')
const wog17 = warriorOfTheGodsDice2024(17)
assert(wog17.count === 7, 'WoG L17')
const champ = primalChampionAbilityBonus2024(20)
assert(champ.bonus === 4 && champ.max === 25, 'primal champion')

assert(isPhbBarbarianSubclassSlug(BARBARIAN_SUBCLASS_SLUGS_2024.berserker), 'berserker PHB')
assert(isPhbBarbarianSubclassSlug(BARBARIAN_SUBCLASS_SLUGS_2024.wildHeart), 'wild heart PHB')
assert(isOutOfPackBarbarianSubclassSlug('barbarian__totem-warrior'), 'totem out')
assert(!isPhbBarbarianSubclassSlug('barbarian__totem-warrior'), 'totem not PHB picker')
assert(isOutOfPackBarbarianSubclassSlug('barbarian__beast'), 'beast out')

console.log('barbarian2024Features.selfcheck: ok')
