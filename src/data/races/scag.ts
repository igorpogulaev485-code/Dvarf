import type { RaceEntry } from './types';

/** Sword Coast Adventurer's Guide (2015). */
export const SCAG_RACES: RaceEntry[] = [
  {
    id: 'dwarf-duergar',
    nameRu: 'Дуэргар',
    nameEn: 'Duergar',
    source: 'scag',
    kind: 'subrace',
    parentId: 'dwarf',
    motmUpdate: true,
    abilityScore: { kind: 'fixed', bonuses: { strength: 1 } },
    size: 'medium',
    speed: { walk: 25 },
    languages: { fixed: ['Подземный'] },
    traits: [
      {
        id: 'duergar-superior-darkvision',
        nameRu: 'Превосходное тёмное зрение',
        nameEn: 'Superior Darkvision',
        descriptionRu: 'Тёмное зрение 120 футов.',
        effects: [{ type: 'darkvision', feet: 120 }],
      },
      {
        id: 'duergar-resilience',
        nameRu: 'Устойчивость дуэргаров',
        nameEn: 'Duergar Resilience',
        descriptionRu:
          'Преимущество на спасброски против иллюзий и от состояний «Очарованный» и «Парализованный».',
        effects: [
          { type: 'savingThrowAdvantage', against: 'иллюзии' },
          { type: 'savingThrowAdvantage', against: 'очарованный' },
          { type: 'savingThrowAdvantage', against: 'парализованный' },
        ],
      },
      {
        id: 'duergar-magic',
        nameRu: 'Магия дуэргаров',
        nameEn: 'Duergar Magic',
        descriptionRu:
          'На 3 уровне — «Увеличение/уменьшение» (только увеличение, на себе). На 5 уровне — «Невидимость» (на себе). Каждый 1/длинный отдых. Интеллект — базовая характеристика. Не действует при солнечном свете.',
        effects: [
          {
            type: 'spell',
            spellRu: 'Увеличение/уменьшение',
            spellEn: 'Enlarge/Reduce',
            fromLevel: 3,
            uses: '1/длинный отдых',
            ability: 'intelligence',
          },
          {
            type: 'spell',
            spellRu: 'Невидимость',
            spellEn: 'Invisibility',
            fromLevel: 5,
            uses: '1/длинный отдых',
            ability: 'intelligence',
          },
        ],
      },
      {
        id: 'duergar-sunlight-sensitivity',
        nameRu: 'Чувствительность к солнечному свету',
        nameEn: 'Sunlight Sensitivity',
        descriptionRu:
          'Помеха на атаки и проверки Восприятия (зрение) при прямом солнечном свете.',
      },
    ],
  },
  {
    id: 'tiefling-feral',
    nameRu: 'Дикий тифлинг',
    nameEn: 'Feral Tiefling',
    source: 'scag',
    kind: 'variant',
    parentId: 'tiefling',
    summaryRu: 'Вариант ASI: +2 Ловкость, +1 Интеллект вместо PHB.',
    abilityScore: { kind: 'fixed', bonuses: { dexterity: 2, intelligence: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Инфернальный'] },
    traits: [
      {
        id: 'tiefling-feral-note',
        nameRu: 'Вариант характеристик',
        descriptionRu:
          'Вместо +1 Интеллект / +2 Харизма: +2 Ловкость, +1 Интеллект. Остальные черты тифлинга сохраняются (или заменяются вариантом наследия ниже).',
      },
    ],
  },
  {
    id: 'tiefling-winged',
    nameRu: 'Тифлинг с крыльями',
    nameEn: 'Winged Tiefling',
    source: 'scag',
    kind: 'variant',
    parentId: 'tiefling',
    summaryRu: 'Полёт 30 футов вместо «Адского наследия».',
    abilityScore: { kind: 'fixed', bonuses: { intelligence: 1, charisma: 2 } },
    size: 'medium',
    speed: { walk: 30, fly: 30 },
    languages: { fixed: ['Общий', 'Инфернальный'] },
    traits: [
      {
        id: 'tiefling-winged-flight',
        nameRu: 'Крылья',
        nameEn: 'Winged',
        descriptionRu:
          'Вместо «Адского наследия»: скорость полёта 30 футов. Нельзя летать в средних или тяжёлых доспехах.',
        effects: [{ type: 'speedOverride', speed: { walk: 30, fly: 30 } }],
      },
    ],
  },
];
