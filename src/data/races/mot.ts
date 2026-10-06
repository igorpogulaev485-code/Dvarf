import type { RaceEntry } from './types';

/** Mythic Odysseys of Theros (2020). */
export const MOT_RACES: RaceEntry[] = [
  {
    id: 'leonin',
    nameRu: 'Леонин',
    nameEn: 'Leonin',
    source: 'mot',
    kind: 'race',
    abilityScore: { kind: 'fixed', bonuses: { constitution: 2, strength: 1 } },
    size: 'medium',
    speed: { walk: 35 },
    languages: { fixed: ['Общий'], choose: 1 },
    traits: [
      {
        id: 'leonin-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'leonin-claws',
        nameRu: 'Когти',
        nameEn: 'Claws',
        descriptionRu: 'Природная оружие: 1d4 + модификатор Силы рубящего урона.',
      },
      {
        id: 'leonin-hunt-instinct',
        nameRu: 'Охотничий инстинкт',
        nameEn: "Hunter's Instincts",
        descriptionRu: 'Владение одним навыком из: Атлетика, Запугивание, Восприятие, Выживание.',
        effects: [
          {
            type: 'choice',
            id: 'leonin-skill',
            nameRu: 'Навык охотника',
            options: [
              { id: 'athletics', labelRu: 'Атлетика', effects: [{ type: 'skillProficiency', skills: ['athletics'] }] },
              { id: 'intimidation', labelRu: 'Запугивание', effects: [{ type: 'skillProficiency', skills: ['intimidation'] }] },
              { id: 'perception', labelRu: 'Восприятие', effects: [{ type: 'skillProficiency', skills: ['perception'] }] },
              { id: 'survival', labelRu: 'Выживание', effects: [{ type: 'skillProficiency', skills: ['survival'] }] },
            ],
          },
        ],
      },
      {
        id: 'leonin-roar',
        nameRu: 'Устрашающий рёв',
        nameEn: 'Daunting Roar',
        descriptionRu:
          'Бонусным действием существа по выбору в пределах 10 футов совершают спасбросок Мудрости или становятся испуганными до вашего следующего хода (1/короткий отдых).',
      },
    ],
  },
  {
    id: 'satyr',
    nameRu: 'Сатир',
    nameEn: 'Satyr',
    source: 'mot',
    kind: 'race',
    motmUpdate: true,
    abilityScore: { kind: 'fixed', bonuses: { charisma: 2, dexterity: 1 } },
    size: 'medium',
    speed: { walk: 35 },
    languages: { fixed: ['Общий', 'Сильван'] },
    traits: [
      {
        id: 'satyr-fey',
        nameRu: 'Фейское существо',
        nameEn: 'Fey',
        descriptionRu: 'Ваш тип существа — фея, а не гуманоид.',
      },
      {
        id: 'satyr-ram',
        nameRu: 'Таран',
        nameEn: 'Ram',
        descriptionRu: 'Природная оружие: 1d4 + модификатор Силы дробящего урона.',
      },
      {
        id: 'satyr-magic-resistance',
        nameRu: 'Сопротивление магии',
        descriptionRu: 'Преимущество на спасброски против заклинаний и прочих магических эффектов.',
        effects: [{ type: 'savingThrowAdvantage', against: 'заклинания и магические эффекты' }],
      },
      {
        id: 'satyr-mirthful-leaps',
        nameRu: 'Весёлые прыжки',
        nameEn: 'Mirthful Leaps',
        descriptionRu: 'При прыжке можете бросить 1d8 и добавить футы к дистанции прыжка.',
      },
      {
        id: 'satyr-reveler',
        nameRu: 'Гуляка',
        nameEn: 'Reveler',
        descriptionRu: 'Владение Выступлением и Убеждением, а также одним музыкальным инструментом.',
        effects: [
          { type: 'skillProficiency', skills: ['performance', 'persuasion'] },
        ],
      },
    ],
  },
];
