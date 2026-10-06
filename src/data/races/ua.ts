import type { RaceEntry } from './types';

/**
 * Unearthed Arcana — тестовый материал WotC.
 * Не входит в официальные книги; опционально по согласованию со столом.
 */
export const UA_RACES: RaceEntry[] = [
  {
    id: 'ua-note',
    nameRu: 'Unearthed Arcana (заметка)',
    nameEn: 'Unearthed Arcana Note',
    source: 'ua',
    kind: 'race',
    unofficial: true,
    summaryRu:
      'Тестовые расы и варианты (часть позже стала официальной, напр. варфордж в Eberron). Не использовать в справочнике листа без явного разрешения мастера.',
    abilityScore: { kind: 'custom', bonuses: {}, notesRu: 'Зависит от конкретной UA' },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'] },
    traits: [
      {
        id: 'ua-disclaimer',
        nameRu: 'Статус материала',
        descriptionRu:
          'UA — playtest. Механики могут отличаться от финальных книг. В листе персонажа помечать как «опционально / UA».',
      },
    ],
  },
];
