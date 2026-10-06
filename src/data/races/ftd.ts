import type { RaceEntry } from './types';

/**
 * Fizban's Treasury of Dragons (2021) — варианты дракорождённых.
 * ASI гибкие (+2/+1 или +1/+1/+1).
 */
export const FTD_RACES: RaceEntry[] = [
  {
    id: 'dragonborn-chromatic',
    nameRu: 'Хроматический дракорождённый',
    nameEn: 'Chromatic Dragonborn',
    source: 'ftd',
    kind: 'variant',
    parentId: 'dragonborn',
    abilityScore: { kind: 'flexibleMotm' },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'], choose: 1 },
    traits: [
      {
        id: 'chromatic-ancestry',
        nameRu: 'Хроматическое происхождение',
        descriptionRu: 'Выберите тип: чёрный, синий, зелёный, красный или белый — урон дыхания и сопротивление.',
        effects: [
          {
            type: 'choice',
            id: 'chromatic-type',
            nameRu: 'Тип хроматического дракона',
            options: [
              { id: 'black', labelRu: 'Чёрный (кислота)', effects: [{ type: 'damageResistance', damageTypes: ['кислота'] }] },
              { id: 'blue', labelRu: 'Синий (молния)', effects: [{ type: 'damageResistance', damageTypes: ['молния'] }] },
              { id: 'green', labelRu: 'Зелёный (яд)', effects: [{ type: 'damageResistance', damageTypes: ['яд'] }] },
              { id: 'red', labelRu: 'Красный (огонь)', effects: [{ type: 'damageResistance', damageTypes: ['огонь'] }] },
              { id: 'white', labelRu: 'Белый (холод)', effects: [{ type: 'damageResistance', damageTypes: ['холод'] }] },
            ],
          },
        ],
      },
      {
        id: 'chromatic-breath',
        nameRu: 'Оружие дыхания',
        descriptionRu:
          'Выдох 30-футовой линией (5 фт шириной), спасбросок Телосложения. Урон 1d10 → 2d10 (5) → 3d10 (11) → 4d10 (17). Число использований = бонусу мастерства / длинный отдых.',
      },
      {
        id: 'chromatic-warding',
        nameRu: 'Хроматическая защита',
        nameEn: 'Chromatic Warding',
        descriptionRu:
          'С 5 уровня: действием иммунитет к типу урона происхождения на 1 минуту (1/длинный отдых).',
      },
    ],
  },
  {
    id: 'dragonborn-metallic',
    nameRu: 'Металлический дракорождённый',
    nameEn: 'Metallic Dragonborn',
    source: 'ftd',
    kind: 'variant',
    parentId: 'dragonborn',
    abilityScore: { kind: 'flexibleMotm' },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'], choose: 1 },
    traits: [
      {
        id: 'metallic-ancestry',
        nameRu: 'Металлическое происхождение',
        descriptionRu: 'Латунный, бронзовый, медный, золотой или серебряный.',
        effects: [
          {
            type: 'choice',
            id: 'metallic-type',
            nameRu: 'Тип металлического дракона',
            options: [
              { id: 'brass', labelRu: 'Латунный (огонь)', effects: [{ type: 'damageResistance', damageTypes: ['огонь'] }] },
              { id: 'bronze', labelRu: 'Бронзовый (молния)', effects: [{ type: 'damageResistance', damageTypes: ['молния'] }] },
              { id: 'copper', labelRu: 'Медный (кислота)', effects: [{ type: 'damageResistance', damageTypes: ['кислота'] }] },
              { id: 'gold', labelRu: 'Золотой (огонь)', effects: [{ type: 'damageResistance', damageTypes: ['огонь'] }] },
              { id: 'silver', labelRu: 'Серебряный (холод)', effects: [{ type: 'damageResistance', damageTypes: ['холод'] }] },
            ],
          },
        ],
      },
      {
        id: 'metallic-breath',
        nameRu: 'Оружие дыхания',
        descriptionRu: 'Как у хроматического (линия 30×5, урон по происхождению).',
      },
      {
        id: 'metallic-breath-weapon-special',
        nameRu: 'Металлическое дыхание',
        nameEn: 'Metallic Breath Weapon',
        descriptionRu:
          'С 5 уровня альтернативное дыхание: отталкивающий конус или ослабляющий конус (1/длинный отдых).',
      },
    ],
  },
  {
    id: 'dragonborn-gem',
    nameRu: 'Самоцветный дракорождённый',
    nameEn: 'Gem Dragonborn',
    source: 'ftd',
    kind: 'variant',
    parentId: 'dragonborn',
    abilityScore: { kind: 'flexibleMotm' },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'], choose: 1 },
    traits: [
      {
        id: 'gem-ancestry',
        nameRu: 'Самоцветное происхождение',
        descriptionRu: 'Аметист, кристалл, изумруд, сапфир или топаз — тип силового/психического и т.п. урона.',
        effects: [
          {
            type: 'choice',
            id: 'gem-type',
            nameRu: 'Тип самоцветного дракона',
            options: [
              { id: 'amethyst', labelRu: 'Аметист (сила)', effects: [{ type: 'damageResistance', damageTypes: ['сила'] }] },
              { id: 'crystal', labelRu: 'Кристалл (излучение)', effects: [{ type: 'damageResistance', damageTypes: ['излучение'] }] },
              { id: 'emerald', labelRu: 'Изумруд (психический)', effects: [{ type: 'damageResistance', damageTypes: ['психический'] }] },
              { id: 'sapphire', labelRu: 'Сапфир (звук)', effects: [{ type: 'damageResistance', damageTypes: ['звук'] }] },
              { id: 'topaz', labelRu: 'Топаз (некротический)', effects: [{ type: 'damageResistance', damageTypes: ['некротический'] }] },
            ],
          },
        ],
      },
      {
        id: 'gem-breath',
        nameRu: 'Оружие дыхания',
        descriptionRu: 'Конус 15 футов, спасбросок Ловкости; шкала урона как у хроматического.',
      },
      {
        id: 'gem-telepathy',
        nameRu: 'Псионический разум',
        nameEn: 'Psionic Mind',
        descriptionRu: 'Телепатия 30 футов.',
      },
      {
        id: 'gem-flight',
        nameRu: 'Самоцветный полёт',
        nameEn: 'Gem Flight',
        descriptionRu:
          'С 5 уровня: бонусным действием спектральные крылья, полёт = ходьбе на 1 минуту (1/длинный отдых).',
      },
    ],
  },
];
