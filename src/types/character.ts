/** Правила, по которым считается персонаж (формулы, термины, опции). */
export type RulesEdition = '2014' | '2024';

/**
 * Визуальная вёрстка листа.
 * Может отличаться от rulesEdition: например, правила 2014 + лист 2024.
 */
export type SheetLayout = '2014' | '2024';

export type AbilityKey =
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'intelligence'
  | 'wisdom'
  | 'charisma';

export type SkillKey =
  | 'acrobatics'
  | 'animalHandling'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleightOfHand'
  | 'stealth'
  | 'survival';

export interface AttackRow {
  name: string;
  attackBonus: string;
  damageType: string;
}

export interface SpellSlotTrack {
  total: number;
  expended: number;
}

/** Ответы мастера выбора расы (попап развилок). */
export interface RaceChoicesState {
  choices?: Record<string, string | string[]>;
  abilityBonuses?: Partial<Record<AbilityKey, number>>;
  pickedSkills?: SkillKey[];
  pickedLanguages?: string[];
  freeText?: Record<string, string>;
  customName?: string;
  /** Чтобы при смене расы снять прошлые природные атаки */
  appliedNaturalWeaponNames?: string[];
  /** Расовые заговоры — снять при смене */
  appliedCantrips?: string[];
  /** Все навыки, выданные расой (фиксированные + выбранные) */
  appliedSkillKeys?: SkillKey[];
  /** Сколько HP/уровень уже заложено от расы */
  appliedHpPerLevel?: number;
  /** Был ли выставлен КД от природной брони / acBonus */
  appliedArmorClass?: boolean;
}

export interface Character {
  id: string;
  /** По каким правилам играем / считаем */
  rulesEdition: RulesEdition;
  /** Какой визуальный лист показываем */
  sheetLayout: SheetLayout;
  /** ISO timestamp последнего сохранения (карточка ↔ лист) */
  updatedAt: string;

  name: string;
  classAndLevel: string;
  background: string;
  playerName: string;
  race: string;
  /** id из справочника `src/data/races` (например `dwarf-hill`) */
  raceId?: string;
  /**
   * Сохранённые ответы попапа расы (подраса, ASI, навыки, инструменты…).
   * Для хомбрю — customName.
   */
  raceChoices?: RaceChoicesState;
  alignment: string;
  experiencePoints: string;

  abilities: Record<AbilityKey, number>;
  inspiration: boolean;
  proficiencyBonus: number;
  savingThrowProficiencies: AbilityKey[];
  skillProficiencies: SkillKey[];
  skillExpertises?: SkillKey[];

  armorClass: string;
  initiative: string;
  speed: string;
  hitPointMax: string;
  hitPointCurrent: string;
  hitPointTemp: string;
  hitDiceTotal: string;
  hitDiceCurrent: string;
  deathSaveSuccesses: number;
  deathSaveFailures: number;

  attacks: AttackRow[];
  attacksNotes: string;
  equipment: string;
  coins: { cp: string; sp: string; ep: string; gp: string; pp: string };
  otherProficienciesAndLanguages: string;
  featuresAndTraits: string;

  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;

  age: string;
  height: string;
  weight: string;
  eyes: string;
  skin: string;
  hair: string;
  appearance: string;
  backstory: string;
  alliesAndOrganizations: string;
  additionalFeaturesAndTraits: string;
  treasure: string;

  spellcastingClass: string;
  spellcastingAbility: string;
  spellSaveDc: string;
  spellAttackBonus: string;
  cantrips: string[];
  spellsByLevel: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, string[]>;
  preparedSpells: string[];
  spellSlots: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, SpellSlotTrack>;
}

export const ABILITY_LABELS_RU: Record<AbilityKey, string> = {
  strength: 'Сила',
  dexterity: 'Ловкость',
  constitution: 'Телосложение',
  intelligence: 'Интеллект',
  wisdom: 'Мудрость',
  charisma: 'Харизма',
};

export const SKILL_DEFS: { key: SkillKey; label: string; ability: AbilityKey }[] = [
  { key: 'acrobatics', label: 'Акробатика', ability: 'dexterity' },
  { key: 'animalHandling', label: 'Уход за животными', ability: 'wisdom' },
  { key: 'arcana', label: 'Магия', ability: 'intelligence' },
  { key: 'athletics', label: 'Атлетика', ability: 'strength' },
  { key: 'deception', label: 'Обман', ability: 'charisma' },
  { key: 'history', label: 'История', ability: 'intelligence' },
  { key: 'insight', label: 'Проницательность', ability: 'wisdom' },
  { key: 'intimidation', label: 'Запугивание', ability: 'charisma' },
  { key: 'investigation', label: 'Анализ', ability: 'intelligence' },
  { key: 'medicine', label: 'Медицина', ability: 'wisdom' },
  { key: 'nature', label: 'Природа', ability: 'intelligence' },
  { key: 'perception', label: 'Восприятие', ability: 'wisdom' },
  { key: 'performance', label: 'Выступление', ability: 'charisma' },
  { key: 'persuasion', label: 'Убеждение', ability: 'charisma' },
  { key: 'religion', label: 'Религия', ability: 'intelligence' },
  { key: 'sleightOfHand', label: 'Ловкость рук', ability: 'dexterity' },
  { key: 'stealth', label: 'Скрытность', ability: 'dexterity' },
  { key: 'survival', label: 'Выживание', ability: 'wisdom' },
];

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}
