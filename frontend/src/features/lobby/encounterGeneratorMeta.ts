/** B8: темы и локации генератора — зеркало backend/app/dnd/encounter_themes.py + environment бестиария. */

export const ENCOUNTER_DIFFICULTIES = [
  { id: 'easy', label: 'Лёгкий' },
  { id: 'medium', label: 'Средний' },
  { id: 'hard', label: 'Сложный' },
  { id: 'deadly', label: 'Смертельный' },
] as const

export type EncounterDifficultyId = (typeof ENCOUNTER_DIFFICULTIES)[number]['id']

export const ENCOUNTER_ENVIRONMENTS = [
  'любая',
  'подземье',
  'лес',
  'город',
  'горы',
  'холмы',
  'болото',
  'равнина/луг',
  'пустыня',
  'побережье',
  'полярная тундра',
  'под водой',
  'тропики',
  'деревня',
  'подземелья',
  'руины',
] as const

export const ENCOUNTER_THEMES = [
  { id: 'undead', label: 'Нежить' },
  { id: 'fiend', label: 'Исчадие' },
  { id: 'demon', label: 'Демоны' },
  { id: 'devil', label: 'Дьяволы' },
  { id: 'yugoloth', label: 'Юголоты' },
  { id: 'orc', label: 'Орки' },
  { id: 'goblinoid', label: 'Гоблиноиды' },
  { id: 'kobold', label: 'Кобольды' },
  { id: 'gnoll', label: 'Гноллы' },
  { id: 'lizardfolk', label: 'Людоящеры' },
  { id: 'beast', label: 'Звери' },
  { id: 'monstrosity', label: 'Монстры' },
  { id: 'dragon', label: 'Драконы' },
  { id: 'aberration', label: 'Аберрации' },
  { id: 'giant', label: 'Великаны' },
  { id: 'elemental', label: 'Элементали' },
  { id: 'fey', label: 'Феи' },
  { id: 'plant', label: 'Растения' },
  { id: 'construct', label: 'Конструкты' },
  { id: 'celestial', label: 'Небожители' },
  { id: 'ooze', label: 'Слизи' },
  { id: 'sahuagin', label: 'Сахуагин' },
  { id: 'merfolk', label: 'Мерфолк' },
  { id: 'kuo_toa', label: 'Куо-тоа' },
] as const

export type EncounterThemeId = (typeof ENCOUNTER_THEMES)[number]['id']
