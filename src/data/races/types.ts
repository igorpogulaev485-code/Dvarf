import type { AbilityKey, SkillKey } from '../../types/character';

/**
 * Куда параметр расы пишется на классическом листе 2014.
 * Это контракт: UI/apply опираются на него, а не на «свободный текст».
 */
export type SheetSlot =
  /** Числа характеристик (Сила…Харизма) */
  | 'abilities'
  /** Пузырьки навыков + пассивное восприятие косвенно */
  | 'skills'
  /** Поле «Скорость» */
  | 'speed'
  /** Поле «Класс доспеха» */
  | 'armorClass'
  /** Таблица атак (название / бонус / урон) */
  | 'attacks'
  /** Максимум хитов (модификатор от расы) */
  | 'hitPointMax'
  /** Список заговоров на стр. заклинаний */
  | 'cantrips'
  /** Блок «Прочие владения и языки» */
  | 'otherProficiencies'
  /** Блок «Умения и особенности» */
  | 'featuresAndTraits'
  /** Только попап выбора — на лист не пишется напрямую */
  | 'popupChoice';

/** Описание слота для UI/доков. */
export const SHEET_SLOT_META: Record<
  SheetSlot,
  { labelRu: string; whereRu: string }
> = {
  abilities: {
    labelRu: 'Характеристики',
    whereRu: 'Шесть чисел слева на стр. 1',
  },
  skills: {
    labelRu: 'Навыки',
    whereRu: 'Пузырьки навыков; Восприятие влияет на пассивное',
  },
  speed: {
    labelRu: 'Скорость',
    whereRu: 'Боевая полоса: Скорость',
  },
  armorClass: {
    labelRu: 'Класс доспеха',
    whereRu: 'Боевая полоса: КД (природная броня / бонус)',
  },
  attacks: {
    labelRu: 'Атаки',
    whereRu: 'Таблица «Атаки и заклинания»',
  },
  hitPointMax: {
    labelRu: 'Хиты',
    whereRu: 'Максимум хитов (+N за уровень)',
  },
  cantrips: {
    labelRu: 'Заговоры',
    whereRu: 'Страница заклинаний, список заговоров',
  },
  otherProficiencies: {
    labelRu: 'Владения и языки',
    whereRu: 'Блок «Прочие владения и языки» (+ чувства вроде тёмного зрения)',
  },
  featuresAndTraits: {
    labelRu: 'Умения',
    whereRu: 'Блок «Умения и особенности»',
  },
  popupChoice: {
    labelRu: 'Выбор в попапе',
    whereRu: 'Мастер расы; результат раскладывается в другие слоты',
  },
};

export type CreatureSize = 'tiny' | 'small' | 'medium' | 'large';

/** Фиксированное повышение характеристик. */
export type AbilityBonuses = Partial<Record<AbilityKey, number>>;

export type AbilityScoreMode =
  | { kind: 'fixed'; bonuses: AbilityBonuses }
  | { kind: 'allPlusOne' }
  | { kind: 'flexibleMotm' }
  | { kind: 'chooseTwoPlusOne' }
  | {
      kind: 'fixedPlusChoose';
      bonuses: AbilityBonuses;
      choosePlusOne: number;
    }
  | { kind: 'custom'; bonuses: AbilityBonuses; notesRu: string };

export interface SpeedBlock {
  walk: number;
  fly?: number;
  swim?: number;
  climb?: number;
  notesRu?: string;
}

export interface AgeBlock {
  matureAround: number;
  lifespanAround: number;
  notesRu?: string;
}

export interface LanguageGrant {
  fixed: string[];
  choose?: number;
}

/**
 * Природное оружие → строка в таблице атак.
 * attackBonus оставляем шаблоном: лист подставит мод позже или пишет «СИЛ/ЛОВ».
 */
export interface NaturalWeaponEffect {
  type: 'naturalWeapon';
  nameRu: string;
  /** Например: «1к4 + СИЛ рубящий» */
  damageRu: string;
  /** Подсказка для бонуса атаки: по какой характеристике */
  ability?: AbilityKey;
}

/**
 * Машиночитаемый эффект расы.
 * У каждого типа есть канонический SheetSlot (см. RACE_EFFECT_SHEET_SLOT).
 */
export type RaceEffect =
  | { type: 'darkvision'; feet: number }
  | { type: 'speedOverride'; speed: SpeedBlock }
  | { type: 'skillProficiency'; skills: SkillKey[] }
  | { type: 'skillChoice'; count: number; pool?: SkillKey[] }
  | { type: 'toolProficiency'; tools: string[] }
  | { type: 'toolChoice'; options: string[]; count: number }
  | { type: 'weaponProficiency'; weapons: string[] }
  | { type: 'armorProficiency'; armors: string[] }
  | { type: 'damageResistance'; damageTypes: string[] }
  | { type: 'damageImmunity'; damageTypes: string[] }
  | { type: 'conditionImmunity'; conditions: string[] }
  | { type: 'savingThrowAdvantage'; against: string }
  | { type: 'hpMaxPerLevel'; amount: number }
  | { type: 'naturalArmor'; formula: '13+DEX' | '12+CON' | '13+CON'; notesRu?: string }
  | { type: 'acBonus'; amount: number }
  | { type: 'powerfulBuild' }
  | NaturalWeaponEffect
  | {
      type: 'cantrip';
      spellRu: string;
      spellEn?: string;
      ability?: AbilityKey;
    }
  | {
      type: 'spell';
      spellRu: string;
      spellEn?: string;
      fromLevel: number;
      uses: string;
      ability?: AbilityKey;
    }
  | {
      type: 'language';
      fixed?: string[];
      choose?: number;
    }
  | {
      type: 'choice';
      id: string;
      nameRu: string;
      options: { id: string; labelRu: string; effects?: RaceEffect[] }[];
    }
  | {
      type: 'feat';
      notesRu?: string;
    };

/** Канонический слот листа для каждого type эффекта. */
export const RACE_EFFECT_SHEET_SLOT: Record<RaceEffect['type'], SheetSlot> = {
  darkvision: 'otherProficiencies',
  speedOverride: 'speed',
  skillProficiency: 'skills',
  skillChoice: 'popupChoice',
  toolProficiency: 'otherProficiencies',
  toolChoice: 'popupChoice',
  weaponProficiency: 'otherProficiencies',
  armorProficiency: 'otherProficiencies',
  damageResistance: 'otherProficiencies',
  damageImmunity: 'otherProficiencies',
  conditionImmunity: 'otherProficiencies',
  savingThrowAdvantage: 'featuresAndTraits',
  hpMaxPerLevel: 'hitPointMax',
  naturalArmor: 'armorClass',
  acBonus: 'armorClass',
  powerfulBuild: 'featuresAndTraits',
  naturalWeapon: 'attacks',
  cantrip: 'cantrips',
  spell: 'featuresAndTraits',
  language: 'otherProficiencies',
  choice: 'popupChoice',
  feat: 'popupChoice',
};

/** Человекочитаемый каталог типов параметров (для продукта/UI). */
export const RACE_EFFECT_CATALOG: {
  type: RaceEffect['type'];
  slot: SheetSlot;
  labelRu: string;
  applyRu: string;
}[] = [
  {
    type: 'darkvision',
    slot: 'otherProficiencies',
    labelRu: 'Тёмное зрение',
    applyRu: 'Строка «Тёмное зрение: N футов» во владениях/языках',
  },
  {
    type: 'speedOverride',
    slot: 'speed',
    labelRu: 'Скорость',
    applyRu: 'Перезаписывает поле «Скорость» (ходьба/полёт/плавание/лазание)',
  },
  {
    type: 'skillProficiency',
    slot: 'skills',
    labelRu: 'Владение навыком',
    applyRu: 'Отмечает пузырьки навыков; цифры считаются от характеристики + БВ',
  },
  {
    type: 'skillChoice',
    slot: 'popupChoice',
    labelRu: 'Выбор навыка',
    applyRu: 'Попап → затем skillProficiency',
  },
  {
    type: 'toolProficiency',
    slot: 'otherProficiencies',
    labelRu: 'Инструменты',
    applyRu: 'Строка «Инструменты: …»',
  },
  {
    type: 'toolChoice',
    slot: 'popupChoice',
    labelRu: 'Выбор инструмента',
    applyRu: 'Попап → toolProficiency',
  },
  {
    type: 'weaponProficiency',
    slot: 'otherProficiencies',
    labelRu: 'Оружие',
    applyRu: 'Строка «Оружие: …»',
  },
  {
    type: 'armorProficiency',
    slot: 'otherProficiencies',
    labelRu: 'Доспехи',
    applyRu: 'Строка «Доспехи: …»',
  },
  {
    type: 'damageResistance',
    slot: 'otherProficiencies',
    labelRu: 'Сопротивление урону',
    applyRu: 'Строка «Сопротивление: …»',
  },
  {
    type: 'damageImmunity',
    slot: 'otherProficiencies',
    labelRu: 'Иммунитет к урону',
    applyRu: 'Строка «Иммунитет (урон): …»',
  },
  {
    type: 'conditionImmunity',
    slot: 'otherProficiencies',
    labelRu: 'Иммунитет к состоянию',
    applyRu: 'Строка «Иммунитет (состояние): …»',
  },
  {
    type: 'savingThrowAdvantage',
    slot: 'featuresAndTraits',
    labelRu: 'Преимущество на спасбросок',
    applyRu: 'Текст в «Умения и особенности»',
  },
  {
    type: 'hpMaxPerLevel',
    slot: 'hitPointMax',
    labelRu: 'Хиты за уровень',
    applyRu: 'Увеличивает максимум хитов на N × уровень (и текущие, если равны максу)',
  },
  {
    type: 'naturalArmor',
    slot: 'armorClass',
    labelRu: 'Природная броня',
    applyRu: 'Подставляет формулу КД (если нет доспеха)',
  },
  {
    type: 'acBonus',
    slot: 'armorClass',
    labelRu: 'Бонус КД',
    applyRu: 'Добавляет +N к текущему КД',
  },
  {
    type: 'powerfulBuild',
    slot: 'featuresAndTraits',
    labelRu: 'Мощное телосложение',
    applyRu: 'Текст в умениях',
  },
  {
    type: 'naturalWeapon',
    slot: 'attacks',
    labelRu: 'Природное оружие',
    applyRu: 'Добавляет строку в таблицу атак',
  },
  {
    type: 'cantrip',
    slot: 'cantrips',
    labelRu: 'Заговор',
    applyRu: 'В список заговоров',
  },
  {
    type: 'spell',
    slot: 'featuresAndTraits',
    labelRu: 'Врождённое заклинание',
    applyRu: 'Строка в умениях (уровень / использования)',
  },
  {
    type: 'language',
    slot: 'otherProficiencies',
    labelRu: 'Язык',
    applyRu: 'Строка «Языки: …»',
  },
  {
    type: 'choice',
    slot: 'popupChoice',
    labelRu: 'Выбор опции',
    applyRu: 'Попап; вложенные effects применяются после выбора',
  },
  {
    type: 'feat',
    slot: 'popupChoice',
    labelRu: 'Черта',
    applyRu: 'Попап (пока free text) → умения',
  },
];

export type RaceSourceId =
  | 'phb'
  | 'eepc'
  | 'scag'
  | 'volo'
  | 'mtof'
  | 'ggr'
  | 'erlw'
  | 'egw'
  | 'mot'
  | 'vrgr'
  | 'aag'
  | 'ftd'
  | 'motm'
  | 'ua'
  | 'homebrew';

export interface RaceSourceMeta {
  id: RaceSourceId;
  nameRu: string;
  nameEn: string;
  year: number;
}

export interface RaceTrait {
  id: string;
  nameRu: string;
  nameEn?: string;
  descriptionRu: string;
  effects?: RaceEffect[];
}

export interface RaceEntry {
  id: string;
  nameRu: string;
  nameEn: string;
  source: RaceSourceId;
  parentId?: string;
  kind: 'race' | 'subrace' | 'variant';
  summaryRu?: string;
  abilityScore: AbilityScoreMode;
  age?: AgeBlock;
  size: CreatureSize;
  sizeNotesRu?: string;
  speed: SpeedBlock;
  languages: LanguageGrant;
  traits: RaceTrait[];
  subraceIds?: string[];
  motmUpdate?: boolean;
  unofficial?: boolean;
}

export interface AppliedNaturalWeapon {
  nameRu: string;
  damageRu: string;
  ability?: AbilityKey;
}

/** Снимок расовых бонусов, готовый к наложению на Character. */
export interface AppliedRaceBonuses {
  raceId: string;
  displayNameRu: string;
  abilityBonuses: AbilityBonuses;
  speed: SpeedBlock;
  size: CreatureSize;
  sizeNotesRu?: string;
  languages: LanguageGrant;
  darkvisionFeet?: number;
  skillProficiencies: SkillKey[];
  skillChoices: number;
  toolProficiencies: string[];
  weaponProficiencies: string[];
  armorProficiencies: string[];
  damageResistances: string[];
  damageImmunities: string[];
  conditionImmunities: string[];
  hpMaxPerLevel: number;
  naturalArmorFormula?: string;
  acBonus: number;
  powerfulBuild: boolean;
  naturalWeapons: AppliedNaturalWeapon[];
  cantrips: { spellRu: string; ability?: AbilityKey }[];
  spells: {
    spellRu: string;
    fromLevel: number;
    uses: string;
    ability?: AbilityKey;
  }[];
  featuresText: string;
  proficienciesText: string;
  pendingChoices: { id: string; nameRu: string; optionIds: string[] }[];
}
