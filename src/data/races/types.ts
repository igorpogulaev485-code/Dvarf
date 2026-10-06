import type { AbilityKey, SkillKey } from '../../types/character';

/** Книга-источник расы (5e 2014 lineage). */
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
  | 'aag' // Spelljammer: Astral Adventurer's Guide
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

export type CreatureSize = 'tiny' | 'small' | 'medium' | 'large';

/** Фиксированное повышение характеристик (классический 2014). */
export type AbilityBonuses = Partial<Record<AbilityKey, number>>;

/**
 * Как раса даёт ASI.
 * - fixed: классика PHB (+2 Con и т.п.)
 * - allPlusOne: человек PHB
 * - flexibleMotm: +2/+1 или +1/+1/+1 (MotM и часть поздних книг)
 * - chooseTwoPlusOne: вариант человека / гибкий +1 к двум
 * - custom: описано в notes (например kobold −2 Str)
 */
export type AbilityScoreMode =
  | { kind: 'fixed'; bonuses: AbilityBonuses }
  | { kind: 'allPlusOne' }
  | { kind: 'flexibleMotm' }
  | { kind: 'chooseTwoPlusOne' }
  /** Фиксированные бонусы + N раз по +1 к другим характеристикам (полуэльф и т.п.). */
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
  /** Например: скорость не снижается в тяжёлых доспехах */
  notesRu?: string;
}

export interface AgeBlock {
  matureAround: number;
  lifespanAround: number;
  notesRu?: string;
}

export interface LanguageGrant {
  fixed: string[];
  /** Сколько языков выбрать дополнительно */
  choose?: number;
}

/** Машиночитаемый эффект для листа персонажа. */
export type RaceEffect =
  | { type: 'darkvision'; feet: number }
  | { type: 'speedOverride'; speed: SpeedBlock }
  | { type: 'skillProficiency'; skills: SkillKey[] }
  | { type: 'skillChoice'; count: number }
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
      /** Уровень персонажа, с которого доступно */
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
      /** Варианты выбора (тип дракона, наследие и т.п.) */
      options: { id: string; labelRu: string; effects?: RaceEffect[] }[];
    }
  | {
      type: 'feat';
      /** Вариант человека: одна черта */
      notesRu?: string;
    };

export interface RaceTrait {
  id: string;
  nameRu: string;
  nameEn?: string;
  descriptionRu: string;
  /** Эффекты, которые лист может применить автоматически */
  effects?: RaceEffect[];
}

/**
 * Запись справочника: раса или подраса.
 * Подраса ссылается на parentId и наследует базовые черты родителя.
 */
export interface RaceEntry {
  id: string;
  nameRu: string;
  nameEn: string;
  source: RaceSourceId;
  /** Если задан — это подраса / вариант */
  parentId?: string;
  kind: 'race' | 'subrace' | 'variant';
  /** Краткое описание для UI */
  summaryRu?: string;
  abilityScore: AbilityScoreMode;
  age?: AgeBlock;
  size: CreatureSize;
  sizeNotesRu?: string;
  speed: SpeedBlock;
  languages: LanguageGrant;
  traits: RaceTrait[];
  /** id подрас (только у базовой расы) */
  subraceIds?: string[];
  /** Перепечатано/обновлено в MotM */
  motmUpdate?: boolean;
  /** Неофициальный / UA материал */
  unofficial?: boolean;
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
  cantrips: { spellRu: string; ability?: AbilityKey }[];
  spells: {
    spellRu: string;
    fromLevel: number;
    uses: string;
    ability?: AbilityKey;
  }[];
  /** Текст для блока «Умения и особенности» */
  featuresText: string;
  /** Текст для блока владений/языков */
  proficienciesText: string;
  /** Неразрешённые выборы игрока */
  pendingChoices: { id: string; nameRu: string; optionIds: string[] }[];
}
