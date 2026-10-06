import type { RaceEntry } from './types';

/** Guildmasters' Guide to Ravnica (2018). */
export const GGR_RACES: RaceEntry[] = [
  {
    id: 'centaur',
    nameRu: 'Кентавр',
    nameEn: 'Centaur',
    source: 'ggr',
    kind: 'race',
    motmUpdate: true,
    abilityScore: { kind: 'fixed', bonuses: { strength: 2, wisdom: 1 } },
    size: 'medium',
    speed: { walk: 40 },
    languages: { fixed: ['Общий', 'Сильван'] },
    traits: [
      {
        id: 'centaur-charge',
        nameRu: 'Заряженная атака',
        nameEn: 'Charge',
        descriptionRu:
          'Если перемещаетесь минимум на 30 футов по прямой к цели и сразу бьёте копытами — доп. 1d6 дробящего урона (1/ход).',
      },
      {
        id: 'centaur-hooves',
        nameRu: 'Копыта',
        nameEn: 'Hooves',
        descriptionRu: 'Природная оружие: 1d4 + модификатор Силы дробящего урона.',
      },
      {
        id: 'centaur-equine-build',
        nameRu: 'Лошадиное телосложение',
        nameEn: 'Equine Build',
        descriptionRu:
          'Считаетесь на размер больше для переноса. Лазание стоит дополнительно 4 фута за каждый фут (вместо 1).',
        effects: [{ type: 'powerfulBuild' }],
      },
      {
        id: 'centaur-survivor',
        nameRu: 'Выживальщик',
        nameEn: 'Survivor',
        descriptionRu: 'Владение одним навыком из: Уход за животными, Медицина, Природа, Выживание.',
        effects: [
          {
            type: 'choice',
            id: 'centaur-skill',
            nameRu: 'Навык выживальщика',
            options: [
              { id: 'animalHandling', labelRu: 'Уход за животными', effects: [{ type: 'skillProficiency', skills: ['animalHandling'] }] },
              { id: 'medicine', labelRu: 'Медицина', effects: [{ type: 'skillProficiency', skills: ['medicine'] }] },
              { id: 'nature', labelRu: 'Природа', effects: [{ type: 'skillProficiency', skills: ['nature'] }] },
              { id: 'survival', labelRu: 'Выживание', effects: [{ type: 'skillProficiency', skills: ['survival'] }] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'loxodon',
    nameRu: 'Локсодон',
    nameEn: 'Loxodon',
    source: 'ggr',
    kind: 'race',
    abilityScore: { kind: 'fixed', bonuses: { constitution: 2, wisdom: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'] },
    traits: [
      {
        id: 'loxodon-powerful-build',
        nameRu: 'Мощное телосложение',
        descriptionRu: 'Считаетесь на размер больше для переноса веса.',
        effects: [{ type: 'powerfulBuild' }],
      },
      {
        id: 'loxodon-natural-armor',
        nameRu: 'Естественная броня',
        descriptionRu: 'КД = 12 + модификатор Телосложения (без доспеха). Щит можно использовать.',
        effects: [{ type: 'naturalArmor', formula: '12+CON' }],
      },
      {
        id: 'loxodon-trunk',
        nameRu: 'Хобот',
        nameEn: 'Trunk',
        descriptionRu:
          'Можете поднимать предметы хоботом, использовать его для взаимодействий; не держит оружие/щит и не даёт доп. атак.',
      },
      {
        id: 'loxodon-keen-smell',
        nameRu: 'Острое обоняние',
        nameEn: 'Keen Smell',
        descriptionRu:
          'Преимущество на проверки Мудрости (Восприятие / Выживание / Проницательность), полагающиеся на запах.',
      },
    ],
  },
  {
    id: 'minotaur',
    nameRu: 'Минотавр',
    nameEn: 'Minotaur',
    source: 'ggr',
    kind: 'race',
    motmUpdate: true,
    abilityScore: { kind: 'fixed', bonuses: { strength: 2, constitution: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Минотаврий'] },
    traits: [
      {
        id: 'minotaur-horns',
        nameRu: 'Рога',
        nameEn: 'Horns',
        descriptionRu: 'Природная оружие: 1d6 + модификатор Силы колющего урона.',
      },
      {
        id: 'minotaur-goring-rush',
        nameRu: 'Бодающий рывок',
        nameEn: 'Goring Rush',
        descriptionRu:
          'При действии «Рывок» можете бонусным действием атаковать рогами.',
      },
      {
        id: 'minotaur-hammering-horns',
        nameRu: 'Сокрушающие рога',
        nameEn: 'Hammering Horns',
        descriptionRu:
          'После рукопашной атаки бонусным действием можете толкнуть цель на 5–10 футов (спасбросок Силы).',
      },
      {
        id: 'minotaur-labyrinthine-recall',
        nameRu: 'Лабиринтная память',
        nameEn: 'Labyrinthine Recall',
        descriptionRu: 'Преимущество на проверки для навигации и избежания потери пути.',
      },
    ],
  },
  {
    id: 'simic-hybrid',
    nameRu: 'Симик-гибрид',
    nameEn: 'Simic Hybrid',
    source: 'ggr',
    kind: 'race',
    abilityScore: {
      kind: 'fixedPlusChoose',
      bonuses: { constitution: 2 },
      choosePlusOne: 1,
    },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Эльфийский'] },
    traits: [
      {
        id: 'simic-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'simic-animal-enhancement',
        nameRu: 'Животное улучшение',
        nameEn: 'Animal Enhancement',
        descriptionRu:
          'На 1 уровне выберите одно: жабры (дыхание под водой + плавание), карабканье (лазание = ходьба), или дополнительная рука. На 5 уровне — второе улучшение (в т.ч. панцирь КД=13+Ловк., кислотный плевок, или усиление прежнего).',
        effects: [
          {
            type: 'choice',
            id: 'simic-enhancement-1',
            nameRu: 'Улучшение 1 уровня',
            options: [
              {
                id: 'manta-glide',
                labelRu: 'Планер (планирование при падении)',
              },
              {
                id: 'nimble-climber',
                labelRu: 'Карабканье (скорость лазания = ходьбы)',
                effects: [{ type: 'speedOverride', speed: { walk: 30, climb: 30 } }],
              },
              {
                id: 'underwater-adaptation',
                labelRu: 'Жабры (дыхание под водой, плавание = ходьба)',
                effects: [{ type: 'speedOverride', speed: { walk: 30, swim: 30 } }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'vedalken',
    nameRu: 'Ведалкен',
    nameEn: 'Vedalken',
    source: 'ggr',
    kind: 'race',
    abilityScore: { kind: 'fixed', bonuses: { intelligence: 2, wisdom: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'], choose: 1 },
    traits: [
      {
        id: 'vedalken-vedalken-dispassion',
        nameRu: 'Ведалкенское бесстрастие',
        nameEn: 'Vedalken Dispassion',
        descriptionRu: 'Преимущество на все спасброски Интеллекта, Мудрости и Харизмы.',
        effects: [
          { type: 'savingThrowAdvantage', against: 'Инт/Мдр/Хар (все)' },
        ],
      },
      {
        id: 'vedalken-tireless-precision',
        nameRu: 'Неутомимая точность',
        nameEn: 'Tireless Precision',
        descriptionRu:
          'Владение одним навыком из: Магия, История, Расследование, Медицина, Выступление, Иллюзии рук, и одним инструментом. 1d4 к проверкам с этим навыком/инструментом.',
        effects: [
          {
            type: 'choice',
            id: 'vedalken-skill',
            nameRu: 'Навык точности',
            options: [
              { id: 'arcana', labelRu: 'Магия', effects: [{ type: 'skillProficiency', skills: ['arcana'] }] },
              { id: 'history', labelRu: 'История', effects: [{ type: 'skillProficiency', skills: ['history'] }] },
              { id: 'investigation', labelRu: 'Анализ', effects: [{ type: 'skillProficiency', skills: ['investigation'] }] },
              { id: 'medicine', labelRu: 'Медицина', effects: [{ type: 'skillProficiency', skills: ['medicine'] }] },
              { id: 'performance', labelRu: 'Выступление', effects: [{ type: 'skillProficiency', skills: ['performance'] }] },
              { id: 'sleightOfHand', labelRu: 'Ловкость рук', effects: [{ type: 'skillProficiency', skills: ['sleightOfHand'] }] },
            ],
          },
        ],
      },
    ],
  },
];
