import type { RaceEntry } from './types';

/** Своя раса: название на листе, механика — вручную. */
export const HOMEBREW_RACES: RaceEntry[] = [
  {
    id: 'homebrew',
    nameRu: 'Хомбрю',
    nameEn: 'Homebrew',
    source: 'homebrew',
    kind: 'race',
    summaryRu:
      'Своя раса. В попапе укажите название для листа; характеристики, черты и владения заполните вручную.',
    abilityScore: {
      kind: 'custom',
      bonuses: {},
      notesRu: 'Без автоматических бонусов — всё вручную на листе',
    },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'homebrew-manual',
        nameRu: 'Своя раса',
        descriptionRu:
          'Название задаётся в попапе. Повышения характеристик, скорость, черты и владения укажите на листе сами.',
      },
    ],
  },
];
