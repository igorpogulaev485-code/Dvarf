import type { RaceEntry } from './types';

/** Explorer's Guide to Wildemount (2020). */
export const EGW_RACES: RaceEntry[] = [
  {
    id: 'elf-pallid',
    nameRu: 'Бледный эльф',
    nameEn: 'Pallid Elf',
    source: 'egw',
    kind: 'subrace',
    parentId: 'elf',
    abilityScore: { kind: 'fixed', bonuses: { wisdom: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'pallid-incisive-sense',
        nameRu: 'Проницательное чутьё',
        nameEn: 'Incisive Sense',
        descriptionRu: 'Преимущество на проверки Мудрости (Проницательность) и Интеллекта (Расследование).',
      },
      {
        id: 'pallid-blessing',
        nameRu: 'Благословение луны',
        nameEn: 'Blessing of the Moon Weaver',
        descriptionRu:
          'Заговор «Свет». С 3 ур. — «Усыпление» 1/длинный отдых. С 5 ур. — «Невидимость» 1/длинный отдых (на себе). Мудрость.',
        effects: [
          { type: 'cantrip', spellRu: 'Свет', spellEn: 'Light', ability: 'wisdom' },
          {
            type: 'spell',
            spellRu: 'Усыпление',
            spellEn: 'Sleep',
            fromLevel: 3,
            uses: '1/длинный отдых',
            ability: 'wisdom',
          },
          {
            type: 'spell',
            spellRu: 'Невидимость',
            spellEn: 'Invisibility',
            fromLevel: 5,
            uses: '1/длинный отдых',
            ability: 'wisdom',
          },
        ],
      },
    ],
  },
  {
    id: 'halfling-lotusden',
    nameRu: 'Лотосовый полурослик',
    nameEn: 'Lotusden Halfling',
    source: 'egw',
    kind: 'subrace',
    parentId: 'halfling',
    abilityScore: { kind: 'fixed', bonuses: { wisdom: 1 } },
    size: 'small',
    speed: { walk: 25 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'lotusden-child-of-the-wood',
        nameRu: 'Дитя леса',
        nameEn: 'Child of the Wood',
        descriptionRu:
          'Заговор «Дружба с животными» (Druidcraft в книге — уточнение: EGW даёт Druidcraft). С 3 ур. — «Опутывание», с 5 ур. — «Шипы» (Spike Growth). Каждый 1/длинный отдых. Мудрость.',
        effects: [
          {
            type: 'cantrip',
            spellRu: 'Искусство друида',
            spellEn: 'Druidcraft',
            ability: 'wisdom',
          },
          {
            type: 'spell',
            spellRu: 'Опутывание',
            spellEn: 'Entangle',
            fromLevel: 3,
            uses: '1/длинный отдых',
            ability: 'wisdom',
          },
          {
            type: 'spell',
            spellRu: 'Шипы',
            spellEn: 'Spike Growth',
            fromLevel: 5,
            uses: '1/длинный отдых',
            ability: 'wisdom',
          },
        ],
      },
      {
        id: 'lotusden-timberwalk',
        nameRu: 'Лесная поступь',
        nameEn: 'Timberwalk',
        descriptionRu:
          'Труднопроходимая местность из немагических растений не замедляет. Преимущество на Скрытность в такой местности.',
      },
    ],
  },
  {
    id: 'dragonborn-draconblood',
    nameRu: 'Драконокровный (Экзандрия)',
    nameEn: 'Draconblood Dragonborn',
    source: 'egw',
    kind: 'variant',
    parentId: 'dragonborn',
    abilityScore: { kind: 'fixed', bonuses: { intelligence: 2, charisma: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Драконий'] },
    traits: [
      {
        id: 'draconblood-forceful-presence',
        nameRu: 'Властное присутствие',
        nameEn: 'Forceful Presence',
        descriptionRu:
          'Вместо сопротивления урону: 1/короткий отдых преимущество на Обман или Запугивание.',
      },
      {
        id: 'draconblood-breath-note',
        nameRu: 'Оружие дыхания',
        descriptionRu: 'Как у дракорождённого PHB (тип по происхождению).',
      },
    ],
  },
  {
    id: 'dragonborn-ravenite',
    nameRu: 'Равенит (Экзандрия)',
    nameEn: 'Ravenite Dragonborn',
    source: 'egw',
    kind: 'variant',
    parentId: 'dragonborn',
    abilityScore: { kind: 'fixed', bonuses: { strength: 2, constitution: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Драконий'] },
    traits: [
      {
        id: 'ravenite-vengeful-assault',
        nameRu: 'Мстительный удар',
        nameEn: 'Vengeful Assault',
        descriptionRu:
          'Вместо сопротивления: когда вас ударили рукопашной атакой, реакцией атака оружием (1/короткий отдых).',
      },
      {
        id: 'ravenite-breath-note',
        nameRu: 'Оружие дыхания',
        descriptionRu: 'Как у дракорождённого PHB.',
      },
    ],
  },
];
