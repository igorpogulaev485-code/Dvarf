/**
 * Single RU label resolver for class-feature choice chips (create wizard + sheet).
 * Catalog options_from (metamagic / infusions / invocations / …) must never fall
 * back to raw English snake_case ids in any picker.
 */

import {
  ARMORER_ARMOR_MODELS,
  infusionById,
} from './artificerInfusions'
import { maneuverById } from './battleMasterManeuvers'
import { druidLandById } from './druidLandChoices'
import {
  THIEVES_TOOLS_LABEL_RU,
  THIEVES_TOOLS_OPTION_ID,
} from './expertise'
import { fightingStyleById } from './fightingStyles'
import { elementalDisciplineById } from './monkElementalDisciplines'
import { rangerChoiceLabel } from './rangerChoices'
import { metamagicById } from './sorcererMetamagic'
import {
  invocationById,
  WARLOCK_PACT_BOONS,
} from './warlockInvocations'

/** One-off inline option ids (ancestries, ASI scaffold, affinity, …). */
export const FEATURE_OPTION_LABELS_RU: Record<string, string> = {
  bear: 'Медведь',
  eagle: 'Орёл',
  wolf: 'Волк',
  desert: 'Пустыня',
  sea: 'Море',
  tundra: 'Тундра',
  bite: 'Укус',
  claws: 'Когти',
  tail: 'Хвост',
  acid: 'Кислота',
  cold: 'Холод',
  fire: 'Огонь',
  lightning: 'Молния',
  thunder: 'Гром',
  colossus_slayer: 'Убийца колосса',
  giant_killer: 'Убийца великанов',
  horde_breaker: 'Крушитель орды',
  escape_the_horde: 'Побег от орды',
  multiattack_defense: 'Защита от мультиатаки',
  steel_will: 'Стальная воля',
  volley: 'Залп',
  whirlwind: 'Вихрь',
  evasion: 'Уклонение',
  stand_against_the_tide: 'Стойкость против волны',
  uncanny_dodge: 'Невероятное уклонение',
  black: 'Чёрный (кислота)',
  blue: 'Синий (молния)',
  brass: 'Латунный (огонь)',
  bronze: 'Бронзовый (молния)',
  copper: 'Медный (кислота)',
  gold: 'Золотой (огонь)',
  green: 'Зелёный (яд)',
  red: 'Красный (огонь)',
  silver: 'Серебряный (холод)',
  white: 'Белый (холод)',
  full_moon: 'Полная луна',
  new_moon: 'Новолуние',
  crescent_moon: 'Полумесяц',
  beast_phb: 'Зверь (PHB)',
  primal_companion_tasha: 'Первобытный спутник (Tasha)',
  poison: 'Яд',
  dao: 'Дао (земля)',
  djinni: 'Джинн (воздух)',
  efreeti: 'Ифрит (огонь)',
  marid: 'Марид (вода)',
  flamethrower: 'Огнемёт',
  force_ballista: 'Силовая баллиста',
  protector: 'Защитник',
  plus2: '+2 к одной характеристике',
  plus1x2: '+1 к двум характеристикам',
  feat_coming_soon: 'Черта (скоро)',
  trip: 'Сбить с ног',
  push_15ft: 'Оттолкнуть на 15 фт.',
  no_reactions: 'Без реакций',
  defensive_flourish: 'Защитный flourish',
  slashing_flourish: 'Рубящий flourish',
  mobile_flourish: 'Подвижный flourish',
  damage_1d6: '+1к6 урона',
  push_target_5: 'Сдвинуть цель на 5 фт.',
  self_move_5: 'Сдвинуть себя на 5 фт.',
  phb_beast_cr_1_4: 'Зверь PHB (КР ≤ ¼)',
  beast_of_the_land: 'Зверь суши (Tasha)',
  beast_of_the_sea: 'Зверь моря (Tasha)',
  beast_of_the_sky: 'Зверь неба (Tasha)',
  archer: 'Лучник',
  chalice: 'Чаша',
  dragon: 'Дракон',
  air: 'Воздух',
  earth: 'Земля',
  water: 'Вода',
  good: 'Добро',
  evil: 'Зло',
  law: 'Закон',
  chaos: 'Хаос',
  neutral: 'Нейтралитет',
  wisdom: 'Мудрость',
  intelligence: 'Интеллект',
  charisma: 'Харизма',
  nature: 'Природа',
  arcana: 'Магия',
  history: 'История',
  insight: 'Проницательность',
  religion: 'Религия',
  animal_handling: 'Уход за животными',
  survival: 'Выживание',
  deception: 'Обман',
  performance: 'Выступление',
  persuasion: 'Убеждение',
  unarmed_fighting: 'Безоружный бой',
  necrotic: 'Некротический',
  radiant: 'Лучистый',
  psychic: 'Психический',
  force: 'Силовой',
  bludgeoning: 'Дробящий',
  piercing: 'Колющий',
  slashing: 'Рубящий',
  speed_10: '+10 фт. скорости',
  darkvision_60: 'Тёмное зрение 60 фт.',
  resistance_acid_cold_fire_lightning_thunder:
    'Сопр. кислоте/холоду/огню/молнии/грому',
  con_save_proficiency: 'Владение спасом Тел.',
  major_transformation: 'Большое преобразование',
  panacea: 'Панацея',
  restore_life: 'Вернуть жизнь',
  restore_youth: 'Вернуть молодость',
  wizard_6th: 'Заклинание волшебника 6 круга',
  wizard_7th: 'Заклинание волшебника 7 круга',
  wizard_8th: 'Заклинание волшебника 8 круга',
  wizard_9th: 'Заклинание волшебника 9 круга',
  kensei_melee_ranged_note: 'Рукопашное + дальнобойное (заметка)',
}

export type FeatureChoiceOptionLabelContext = {
  option_labels_ru?: Record<string, string> | null
}

/**
 * Resolve a human RU label for a feature-choice option id.
 * Prefer pack `option_labels_ru`, then dedicated catalogs (infusions/metamagic/…),
 * then the static fallback map. Last resort: raw id (should be rare).
 */
export function featureChoiceOptionLabel(
  optionId: string,
  choice?: FeatureChoiceOptionLabelContext | null,
  skillLabel?: (id: string) => string | undefined | null,
): string {
  if (optionId === THIEVES_TOOLS_OPTION_ID) return THIEVES_TOOLS_LABEL_RU
  const fromChoice = choice?.option_labels_ru?.[optionId]?.trim()
  if (fromChoice) return fromChoice
  if (FEATURE_OPTION_LABELS_RU[optionId]) return FEATURE_OPTION_LABELS_RU[optionId]

  // Use *ById / null-returning helpers — *Label helpers fall back to the raw
  // id and would short-circuit the OR chain (infusions looked like English).
  const pact = WARLOCK_PACT_BOONS.find((row) => row.id === optionId)
  const armorModel = ARMORER_ARMOR_MODELS.find((row) => row.id === optionId)
  const fromSkill = skillLabel?.(optionId)?.trim()

  return (
    fightingStyleById(optionId)?.nameRu ||
    rangerChoiceLabel(optionId) ||
    druidLandById(optionId)?.nameRu ||
    metamagicById(optionId)?.nameRu ||
    invocationById(optionId)?.nameRu ||
    infusionById(optionId)?.nameRu ||
    elementalDisciplineById(optionId)?.nameRu ||
    maneuverById(optionId)?.nameRu ||
    pact?.nameRu ||
    armorModel?.nameRu ||
    fromSkill ||
    optionId
  )
}
