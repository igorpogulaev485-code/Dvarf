import type { RaceEntry } from './types';

/**
 * Lineages из Van Richten's Guide to Ravenloft (2021).
 * В книге ASI гибкие (+2/+1 или +1/+1/+1); наследие выбирается отдельно.
 */
export const VRGR_RACES: RaceEntry[] = [
  {
    id: 'dhampir',
    nameRu: 'Дампыр',
    nameEn: 'Dhampir',
    source: 'vrgr',
    kind: 'race',
    abilityScore: { kind: 'flexibleMotm' },
    size: 'medium',
    sizeNotesRu: 'Средний или Маленький (на выбор при создании)',
    speed: { walk: 35 },
    languages: { fixed: ['Общий'], choose: 1 },
    traits: [
      {
        id: 'dhampir-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'dhampir-ancestral-legacy',
        nameRu: 'Наследие предков',
        nameEn: 'Ancestral Legacy',
        descriptionRu:
          'Если заменяете расу: сохраните навык владения и лазание/плавание от прежней расы, либо возьмите два навыка.',
        effects: [{ type: 'skillChoice', count: 2 }],
      },
      {
        id: 'dhampir-deathless-nature',
        nameRu: 'Бессмертная природа',
        nameEn: 'Deathless Nature',
        descriptionRu: 'Не нуждаетесь в воздухе.',
      },
      {
        id: 'dhampir-spider-climb',
        nameRu: 'Паучье лазание',
        nameEn: 'Spider Climb',
        descriptionRu: 'Скорость лазания равна скорости ходьбы; можете лазить по трудным поверхностям и потолкам без рук.',
        effects: [{ type: 'speedOverride', speed: { walk: 35, climb: 35 } }],
      },
      {
        id: 'dhampir-vampiric-bite',
        nameRu: 'Вампирский укус',
        nameEn: 'Vampiric Bite',
        descriptionRu:
          'Природная оружие: 1d4 колющего. Число раз = бонусу мастерства за длинный отдых усиленный укус даёт временные хиты или бонус к следующей атаке/проверке.',
      },
    ],
  },
  {
    id: 'hexblood',
    nameRu: 'Хексблад',
    nameEn: 'Hexblood',
    source: 'vrgr',
    kind: 'race',
    abilityScore: { kind: 'flexibleMotm' },
    size: 'medium',
    sizeNotesRu: 'Средний или Маленький на выбор',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'], choose: 1 },
    traits: [
      {
        id: 'hexblood-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'hexblood-ancestral-legacy',
        nameRu: 'Наследие предков',
        descriptionRu: 'Как у дампира: два навыка или наследие прежней расы.',
        effects: [{ type: 'skillChoice', count: 2 }],
      },
      {
        id: 'hexblood-fey-nature',
        nameRu: 'Фейская природа',
        descriptionRu: 'Тип существа — фея; преимущество на спасброски от очарования.',
        effects: [{ type: 'savingThrowAdvantage', against: 'очарование' }],
      },
      {
        id: 'hexblood-hex-magic',
        nameRu: 'Магия хекса',
        nameEn: 'Hex Magic',
        descriptionRu:
          '«Маскировка» и «Порча» — каждый 1/длинный отдых. Харизма, Интеллект или Мудрость на выбор.',
        effects: [
          {
            type: 'spell',
            spellRu: 'Маскировка',
            spellEn: 'Disguise Self',
            fromLevel: 1,
            uses: '1/длинный отдых',
          },
          {
            type: 'spell',
            spellRu: 'Порча',
            spellEn: 'Hex',
            fromLevel: 1,
            uses: '1/длинный отдых',
          },
        ],
      },
      {
        id: 'hexblood-token',
        nameRu: 'Токен ведьмы',
        nameEn: 'Magic Token',
        descriptionRu:
          'Действием создать токен: телепатия 10 миль с носителем или отдалённый шёпот (1/длинный отдых).',
      },
    ],
  },
  {
    id: 'reborn',
    nameRu: 'Реборн',
    nameEn: 'Reborn',
    source: 'vrgr',
    kind: 'race',
    abilityScore: { kind: 'flexibleMotm' },
    size: 'medium',
    sizeNotesRu: 'Средний или Маленький на выбор',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'], choose: 1 },
    traits: [
      {
        id: 'reborn-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'reborn-ancestral-legacy',
        nameRu: 'Наследие предков',
        descriptionRu: 'Два навыка или наследие прежней расы.',
        effects: [{ type: 'skillChoice', count: 2 }],
      },
      {
        id: 'reborn-deathless-nature',
        nameRu: 'Бессмертная природа',
        nameEn: 'Deathless Nature',
        descriptionRu:
          'Преимущество на спасброски от смерти; сопротивление яду; преимущество на спасброски от болезней; не нуждается в еде, питье, дыхании; 4 часа бездействия вместо сна.',
        effects: [
          { type: 'damageResistance', damageTypes: ['яд'] },
          { type: 'savingThrowAdvantage', against: 'смерть' },
        ],
      },
      {
        id: 'reborn-knowledge-from-a-past-life',
        nameRu: 'Знание из прошлой жизни',
        nameEn: 'Knowledge from a Past Life',
        descriptionRu:
          'Когда делаете проверку характеристики, можете бросить d6 и добавить к результату (число раз = бонусу мастерства / длинный отдых).',
      },
    ],
  },
];
