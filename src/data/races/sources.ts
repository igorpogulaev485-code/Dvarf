import type { RaceSourceId, RaceSourceMeta } from './types';

export const RACE_SOURCES: Record<RaceSourceId, RaceSourceMeta> = {
  phb: {
    id: 'phb',
    nameRu: 'Книга игрока',
    nameEn: "Player's Handbook",
    year: 2014,
  },
  eepc: {
    id: 'eepc',
    nameRu: 'Elemental Evil Player’s Companion',
    nameEn: "Elemental Evil Player's Companion",
    year: 2015,
  },
  scag: {
    id: 'scag',
    nameRu: 'Путеводитель приключенца по Побережью Мечей',
    nameEn: "Sword Coast Adventurer's Guide",
    year: 2015,
  },
  volo: {
    id: 'volo',
    nameRu: 'Воло: руководство по монстрам',
    nameEn: "Volo's Guide to Monsters",
    year: 2016,
  },
  mtof: {
    id: 'mtof',
    nameRu: 'Том врагов Морденкайнена',
    nameEn: "Mordenkainen's Tome of Foes",
    year: 2018,
  },
  ggr: {
    id: 'ggr',
    nameRu: 'Руководство гильдмастеров по Равнике',
    nameEn: "Guildmasters' Guide to Ravnica",
    year: 2018,
  },
  erlw: {
    id: 'erlw',
    nameRu: 'Эберрон: Восстание из Последней войны',
    nameEn: 'Eberron: Rising from the Last War',
    year: 2019,
  },
  egw: {
    id: 'egw',
    nameRu: 'Путеводитель исследователя по Уайлдмаунту',
    nameEn: "Explorer's Guide to Wildemount",
    year: 2020,
  },
  mot: {
    id: 'mot',
    nameRu: 'Мифические одиссеи Тероса',
    nameEn: 'Mythic Odysseys of Theros',
    year: 2020,
  },
  vrgr: {
    id: 'vrgr',
    nameRu: 'Ван Рихтен: руководство по Равенлофту',
    nameEn: "Van Richten's Guide to Ravenloft",
    year: 2021,
  },
  ftd: {
    id: 'ftd',
    nameRu: 'Сокровищница драконов Физбана',
    nameEn: "Fizban's Treasury of Dragons",
    year: 2021,
  },
  aag: {
    id: 'aag',
    nameRu: 'Spelljammer: Adventures in Space',
    nameEn: 'Spelljammer: Adventures in Space',
    year: 2022,
  },
  motm: {
    id: 'motm',
    nameRu: 'Морденкайнен представляет: Монстры мультивселенной',
    nameEn: 'Mordenkainen Presents: Monsters of the Multiverse',
    year: 2022,
  },
  ua: {
    id: 'ua',
    nameRu: 'Unearthed Arcana (тестовый материал)',
    nameEn: 'Unearthed Arcana',
    year: 0,
  },
};

/** Порядок отображения книг в справочнике. */
export const RACE_SOURCE_ORDER: RaceSourceId[] = [
  'phb',
  'eepc',
  'scag',
  'volo',
  'mtof',
  'ggr',
  'erlw',
  'egw',
  'mot',
  'vrgr',
  'ftd',
  'aag',
  'motm',
  'ua',
];
