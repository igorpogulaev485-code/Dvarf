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

/** Группы в UI: тип → племя → раса гуманоида. */
export const ENCOUNTER_THEMES = [
  // типы
  { id: 'undead', label: 'Нежить', group: 'type' },
  { id: 'fiend', label: 'Исчадие', group: 'type' },
  { id: 'beast', label: 'Звери', group: 'type' },
  { id: 'monstrosity', label: 'Монстры', group: 'type' },
  { id: 'dragon', label: 'Драконы', group: 'type' },
  { id: 'aberration', label: 'Аберрации', group: 'type' },
  { id: 'giant', label: 'Великаны', group: 'type' },
  { id: 'elemental', label: 'Элементали', group: 'type' },
  { id: 'fey', label: 'Феи', group: 'type' },
  { id: 'plant', label: 'Растения', group: 'type' },
  { id: 'construct', label: 'Конструкты', group: 'type' },
  { id: 'celestial', label: 'Небожители', group: 'type' },
  { id: 'ooze', label: 'Слизи', group: 'type' },
  // исчадия / племена
  { id: 'demon', label: 'Демоны', group: 'tribe' },
  { id: 'devil', label: 'Дьяволы', group: 'tribe' },
  { id: 'yugoloth', label: 'Юголоты', group: 'tribe' },
  { id: 'orc', label: 'Орки', group: 'tribe' },
  { id: 'goblinoid', label: 'Гоблиноиды', group: 'tribe' },
  { id: 'kobold', label: 'Кобольды', group: 'tribe' },
  { id: 'gnoll', label: 'Гноллы', group: 'tribe' },
  { id: 'lizardfolk', label: 'Людоящеры', group: 'tribe' },
  { id: 'sahuagin', label: 'Сахуагин', group: 'tribe' },
  { id: 'merfolk', label: 'Мерфолк', group: 'tribe' },
  { id: 'kuo_toa', label: 'Куо-тоа', group: 'tribe' },
  // расы гуманоидов (subtype бестиария)
  { id: 'human', label: 'Люди', group: 'race' },
  { id: 'elf', label: 'Эльфы', group: 'race' },
  { id: 'half_elf', label: 'Полуэльфы', group: 'race' },
  { id: 'dwarf', label: 'Дварфы', group: 'race' },
  { id: 'gnome', label: 'Гномы', group: 'race' },
  { id: 'tiefling', label: 'Тифлинги', group: 'race' },
  { id: 'gith', label: 'Гит', group: 'race' },
  { id: 'kenku', label: 'Кенку', group: 'race' },
  { id: 'tortle', label: 'Тортлы', group: 'race' },
] as const

export type EncounterThemeId = (typeof ENCOUNTER_THEMES)[number]['id']
