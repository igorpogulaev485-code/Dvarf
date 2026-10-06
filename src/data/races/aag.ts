import type { RaceEntry } from './types';

/** Spelljammer: Astral Adventurer's Guide (2022). */
export const AAG_RACES: RaceEntry[] = [
  {
    id: 'elf-astral',
    nameRu: 'Астральный эльф',
    nameEn: 'Astral Elf',
    source: 'aag',
    kind: 'subrace',
    parentId: 'elf',
    abilityScore: { kind: 'flexibleMotm' },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'astral-elf-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов (как у эльфа).',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'astral-fire',
        nameRu: 'Астральный огонь',
        nameEn: 'Astral Fire',
        descriptionRu: 'Заговор на выбор: «Танцующие огни», «Свет» или «Священное пламя».',
        effects: [
          {
            type: 'choice',
            id: 'astral-fire-cantrip',
            nameRu: 'Астральный огонь',
            options: [
              { id: 'dancing-lights', labelRu: 'Пляшущие огни', effects: [{ type: 'cantrip', spellRu: 'Пляшущие огни' }] },
              { id: 'light', labelRu: 'Свет', effects: [{ type: 'cantrip', spellRu: 'Свет' }] },
              { id: 'sacred-flame', labelRu: 'Священное пламя', effects: [{ type: 'cantrip', spellRu: 'Священное пламя' }] },
            ],
          },
        ],
      },
      {
        id: 'astral-trance',
        nameRu: 'Звёздный транс',
        nameEn: 'Starlight Step / Trance',
        descriptionRu:
          'Как транс эльфа + владение одним навыком / оружием / инструментом из астральных знаний. Бонусным действием телепорт на 30 футов (число раз = бонусу мастерства / длинный отдых).',
      },
    ],
  },
  {
    id: 'autognome',
    nameRu: 'Автогном',
    nameEn: 'Autognome',
    source: 'aag',
    kind: 'race',
    abilityScore: { kind: 'flexibleMotm' },
    size: 'small',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'], choose: 1 },
    traits: [
      {
        id: 'autognome-armored-casing',
        nameRu: 'Бронированный корпус',
        nameEn: 'Armored Casing',
        descriptionRu: 'КД = 13 + модификатор Ловкости (без доспеха).',
        effects: [{ type: 'naturalArmor', formula: '13+DEX' }],
      },
      {
        id: 'autognome-built-for-success',
        nameRu: 'Создан для успеха',
        nameEn: 'Built for Success',
        descriptionRu:
          'Можете добавить 1d4 к атаке, проверке или спасброску (число раз = бонусу мастерства / длинный отдых).',
      },
      {
        id: 'autognome-healing-machine',
        nameRu: 'Машина исцеления',
        nameEn: 'Healing Machine',
        descriptionRu:
          'Заклинания лечения и набор ремонтника работают на вас; Mending восстанавливает 1d6 хитов.',
      },
      {
        id: 'autognome-mechanical-nature',
        nameRu: 'Механическая природа',
        descriptionRu:
          'Тип — конструкт и гуманоид; преимущество vs яд; сопротивление яду; иммунитет к болезням; не нуждается в еде/питье/дыхании; иммунитет к истощению от недосыпа; 6 часов бездействия вместо сна.',
        effects: [
          { type: 'savingThrowAdvantage', against: 'яд' },
          { type: 'damageResistance', damageTypes: ['яд'] },
        ],
      },
      {
        id: 'autognome-specialized-design',
        nameRu: 'Специализированный дизайн',
        descriptionRu: 'Два навыка на выбор и владение инструментами ремонтника.',
        effects: [
          { type: 'skillChoice', count: 2 },
          { type: 'toolProficiency', tools: ['инструменты ремонтника'] },
        ],
      },
    ],
  },
  {
    id: 'giff',
    nameRu: 'Гифф',
    nameEn: 'Giff',
    source: 'aag',
    kind: 'race',
    abilityScore: { kind: 'flexibleMotm' },
    size: 'medium',
    speed: { walk: 30, swim: 30 },
    languages: { fixed: ['Общий'], choose: 1 },
    traits: [
      {
        id: 'giff-astronaut',
        nameRu: 'Астронавт-артиллерист',
        nameEn: 'Astral Spark',
        descriptionRu:
          'При попадании оружием можете добавить силового урона = бонусу мастерства (число раз = бонусу мастерства / длинный отдых).',
      },
      {
        id: 'giff-firearms',
        nameRu: 'Знание огнестрела',
        nameEn: 'Firearms Mastery',
        descriptionRu: 'Владение огнестрельным оружием; игнор свойства loading; не лежа при стрельбе в упор.',
        effects: [{ type: 'weaponProficiency', weapons: ['огнестрельное оружие'] }],
      },
      {
        id: 'giff-hippo-build',
        nameRu: 'Гиппопотамье телосложение',
        nameEn: 'Hippo Build',
        descriptionRu: 'Преимущество на проверки Силы; мощное телосложение.',
        effects: [{ type: 'powerfulBuild' }],
      },
    ],
  },
  {
    id: 'hadozee',
    nameRu: 'Хадози',
    nameEn: 'Hadozee',
    source: 'aag',
    kind: 'race',
    abilityScore: { kind: 'flexibleMotm' },
    size: 'medium',
    sizeNotesRu: 'Средний или Маленький на выбор',
    speed: { walk: 30, climb: 30 },
    languages: { fixed: ['Общий'], choose: 1 },
    traits: [
      {
        id: 'hadozee-dexterous-feet',
        nameRu: 'Ловкие ступни',
        nameEn: 'Dexterous Feet',
        descriptionRu: 'Бонусным действием взаимодействовать с предметом ногой.',
      },
      {
        id: 'hadozee-glide',
        nameRu: 'Планирование',
        nameEn: 'Glide',
        descriptionRu:
          'При падении реакцией раскрыть перепонки: уменьшаете падение, планируете горизонтально.',
      },
      {
        id: 'hadozee-climber',
        nameRu: 'Лазание',
        descriptionRu: 'Скорость лазания равна скорости ходьбы.',
        effects: [{ type: 'speedOverride', speed: { walk: 30, climb: 30 } }],
      },
    ],
  },
  {
    id: 'plasmoid',
    nameRu: 'Плазмоид',
    nameEn: 'Plasmoid',
    source: 'aag',
    kind: 'race',
    abilityScore: { kind: 'flexibleMotm' },
    size: 'medium',
    sizeNotesRu: 'Средний или Маленький на выбор',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'], choose: 1 },
    traits: [
      {
        id: 'plasmoid-amorphous',
        nameRu: 'Аморфность',
        nameEn: 'Amorphous',
        descriptionRu:
          'Можете протискиваться через щель шириной 1 дюйм; преимущество на спасброски от захвата.',
      },
      {
        id: 'plasmoid-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'plasmoid-hold-breath',
        nameRu: 'Задержка дыхания',
        descriptionRu: 'Можете задерживать дыхание на 1 час.',
      },
      {
        id: 'plasmoid-natural-resilience',
        nameRu: 'Природная устойчивость',
        descriptionRu: 'Сопротивление кислоте и яду; преимущество на спасброски от яда.',
        effects: [
          { type: 'damageResistance', damageTypes: ['кислота', 'яд'] },
          { type: 'savingThrowAdvantage', against: 'яд' },
        ],
      },
      {
        id: 'plasmoid-shape-self',
        nameRu: 'Изменение формы',
        nameEn: 'Shape Self',
        descriptionRu:
          'Бонусным действием: псевдоподия (как свободная рука) или режим «без костей» для узких пространств.',
      },
    ],
  },
  {
    id: 'thri-kreen',
    nameRu: 'Три-крин',
    nameEn: 'Thri-kreen',
    source: 'aag',
    kind: 'race',
    abilityScore: { kind: 'flexibleMotm' },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'] },
    traits: [
      {
        id: 'thri-kreen-secondary-arms',
        nameRu: 'Вторичные руки',
        nameEn: 'Secondary Arms',
        descriptionRu:
          'Две доп. руки могут манипулировать предметами и использовать лёгкое оружие; не дают доп. атак сами по себе.',
      },
      {
        id: 'thri-kreen-carapace',
        nameRu: 'Панцирь',
        nameEn: 'Chameleon Carapace',
        descriptionRu:
          'КД = 13 + модификатор Ловкости без доспеха. Можете менять цвет панциря: преимущество на Скрытность.',
        effects: [{ type: 'naturalArmor', formula: '13+DEX' }],
      },
      {
        id: 'thri-kreen-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'thri-kreen-sleepless',
        nameRu: 'Бессонница',
        nameEn: 'Sleepless',
        descriptionRu: 'Не спите; остаётесь в сознании на длинном отдыхе; иммунитет к магическому усыплению.',
      },
      {
        id: 'thri-kreen-telepathy',
        nameRu: 'Телепатия',
        descriptionRu: 'Телепатия 120 футов с существом, понимающим язык.',
      },
    ],
  },
];
