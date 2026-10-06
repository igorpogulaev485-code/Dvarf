import type { RaceEntry } from './types';

/**
 * Mordenkainen Presents: Monsters of the Multiverse (2022).
 *
 * Книга перепечатала 30+ рас с унификацией:
 * — ASI всегда гибкие (+2/+1 или +1/+1/+1);
 * — часть черт переработана (без штрафов характеристик и т.п.).
 *
 * Здесь — мета-запись и указатель. Конкретные статы берутся из
 * оригинальных записей с флагом `motmUpdate: true`; при применении
 * к листу можно включить режим MotM (гибкий ASI).
 */
export const MOTM_RACES: RaceEntry[] = [
  {
    id: 'motm-framework',
    nameRu: 'Правила рас MotM',
    nameEn: 'MotM Race Framework',
    source: 'motm',
    kind: 'race',
    summaryRu:
      'Все перепечатанные расы используют гибкое повышение характеристик и обновлённые черты. См. список обновлённых рас в реестре (motmUpdate).',
    abilityScore: { kind: 'flexibleMotm' },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'] },
    traits: [
      {
        id: 'motm-asi',
        nameRu: 'Гибкое повышение характеристик',
        descriptionRu:
          'Выберите +2 к одной характеристике и +1 к другой, либо +1 к трём разным.',
      },
      {
        id: 'motm-languages',
        nameRu: 'Языки',
        descriptionRu: 'Общий и один дополнительный язык (типичный шаблон MotM).',
        effects: [{ type: 'language', fixed: ['Общий'], choose: 1 }],
      },
    ],
  },
];

/** id рас/подрас, для которых есть обновление MotM. */
export const MOTM_UPDATED_RACE_IDS = [
  'aarakocra',
  'gnome-deep',
  'genasi',
  'goliath',
  'dwarf-duergar',
  'aasimar',
  'bugbear',
  'firbolg',
  'goblin',
  'hobgoblin',
  'kenku',
  'kobold',
  'lizardfolk',
  'orc',
  'tabaxi',
  'triton',
  'yuan-ti-pureblood',
  'elf-eladrin',
  'githyanki',
  'githzerai',
  'elf-sea',
  'elf-shadar-kai',
  'centaur',
  'minotaur',
  'satyr',
  'changeling',
  'shifter',
  'warforged',
] as const;
