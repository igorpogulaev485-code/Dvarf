import type { RaceEntry } from './types';

/** Eberron: Rising from the Last War (2019). */
export const ERLW_RACES: RaceEntry[] = [
  {
    id: 'changeling',
    nameRu: 'Чейнджлинг',
    nameEn: 'Changeling',
    source: 'erlw',
    kind: 'race',
    motmUpdate: true,
    abilityScore: {
      kind: 'fixedPlusChoose',
      bonuses: { charisma: 2 },
      choosePlusOne: 1,
    },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'], choose: 2 },
    traits: [
      {
        id: 'changeling-shapechanger',
        nameRu: 'Изменение облика',
        nameEn: 'Shapechanger',
        descriptionRu:
          'Действием изменить внешность и голос. Размер и телосложение — гуманоидные, Средний или Маленький. Снаряжение не меняется. Возврат к истинному облику при смерти.',
      },
      {
        id: 'changeling-changeling-instincts',
        nameRu: 'Инстинкты чейнджлинга',
        nameEn: 'Changeling Instincts',
        descriptionRu: 'Владение двумя навыками из: Обман, Проницательность, Запугивание, Выступление, Убеждение.',
        effects: [
          {
            type: 'choice',
            id: 'changeling-skills',
            nameRu: 'Два навыка',
            options: [
              { id: 'deception', labelRu: 'Обман', effects: [{ type: 'skillProficiency', skills: ['deception'] }] },
              { id: 'insight', labelRu: 'Проницательность', effects: [{ type: 'skillProficiency', skills: ['insight'] }] },
              { id: 'intimidation', labelRu: 'Запугивание', effects: [{ type: 'skillProficiency', skills: ['intimidation'] }] },
              { id: 'performance', labelRu: 'Выступление', effects: [{ type: 'skillProficiency', skills: ['performance'] }] },
              { id: 'persuasion', labelRu: 'Убеждение', effects: [{ type: 'skillProficiency', skills: ['persuasion'] }] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kalashtar',
    nameRu: 'Калаштар',
    nameEn: 'Kalashtar',
    source: 'erlw',
    kind: 'race',
    abilityScore: {
      kind: 'custom',
      bonuses: { wisdom: 2, charisma: 1 },
      notesRu: '+2 Мудрость, +1 Харизма',
    },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Кири'], choose: 1 },
    traits: [
      {
        id: 'kalashtar-dual-mind',
        nameRu: 'Двойной разум',
        nameEn: 'Dual Mind',
        descriptionRu: 'Преимущество на все спасброски Мудрости.',
        effects: [{ type: 'savingThrowAdvantage', against: 'Мудрость (все)' }],
      },
      {
        id: 'kalashtar-mental-discipline',
        nameRu: 'Ментальная дисциплина',
        nameEn: 'Mental Discipline',
        descriptionRu: 'Сопротивление психическому урону.',
        effects: [{ type: 'damageResistance', damageTypes: ['психический'] }],
      },
      {
        id: 'kalashtar-mind-link',
        nameRu: 'Психическая связь',
        nameEn: 'Mind Link',
        descriptionRu:
          'Телепатически общаться с существом в пределах числа миль = уровня. Цель должна понимать хотя бы один язык.',
      },
      {
        id: 'kalashtar-severed-from-dreams',
        nameRu: 'Отрезанность от снов',
        nameEn: 'Severed from Dreams',
        descriptionRu: 'Иммунитет к эффектам снов / Dal Quor; магия не может вас усыпить через сны.',
      },
    ],
  },
  {
    id: 'shifter',
    nameRu: 'Шифтер',
    nameEn: 'Shifter',
    source: 'erlw',
    kind: 'race',
    motmUpdate: true,
    abilityScore: {
      kind: 'custom',
      bonuses: { dexterity: 1 },
      notesRu: '+1 Ловкость; подраса даёт +2 к одной / +1 к другой',
    },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'] },
    subraceIds: [
      'shifter-beasthide',
      'shifter-longtooth',
      'shifter-swiftstride',
      'shifter-wildhunt',
    ],
    traits: [
      {
        id: 'shifter-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'shifter-shifting',
        nameRu: 'Сдвиг',
        nameEn: 'Shifting',
        descriptionRu:
          'Бонусным действием принять облик сдвига на 1 минуту (1/короткий отдых): временные хиты = уровня; подраса даёт доп. эффект.',
      },
    ],
  },
  {
    id: 'shifter-beasthide',
    nameRu: 'Шифтер — звериная шкура',
    nameEn: 'Beasthide Shifter',
    source: 'erlw',
    kind: 'subrace',
    parentId: 'shifter',
    abilityScore: { kind: 'fixed', bonuses: { constitution: 2 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'shifter-beasthide-trait',
        nameRu: 'Владение Атлетикой',
        descriptionRu: 'Владение «Атлетикой». При сдвиге: +1 КД и доп. временные хиты = 1d6 + модификатор Телосложения.',
        effects: [{ type: 'skillProficiency', skills: ['athletics'] }],
      },
    ],
  },
  {
    id: 'shifter-longtooth',
    nameRu: 'Шифтер — длинный клык',
    nameEn: 'Longtooth Shifter',
    source: 'erlw',
    kind: 'subrace',
    parentId: 'shifter',
    abilityScore: { kind: 'fixed', bonuses: { strength: 2 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'shifter-longtooth-trait',
        nameRu: 'Длинный клык',
        descriptionRu:
          'При сдвиге бонусным действием укус: 1d6 + модификатор Силы колющего урона.',
      },
    ],
  },
  {
    id: 'shifter-swiftstride',
    nameRu: 'Шифтер — быстрый шаг',
    nameEn: 'Swiftstride Shifter',
    source: 'erlw',
    kind: 'subrace',
    parentId: 'shifter',
    abilityScore: { kind: 'fixed', bonuses: { dexterity: 1, charisma: 1 } },
    size: 'medium',
    speed: { walk: 35 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'shifter-swiftstride-trait',
        nameRu: 'Быстрый шаг',
        descriptionRu:
          'Скорость +5 футов. При сдвиге: скорость +5; реакцией отойти на 10 футов, когда враг входит в досягаемость, без провокации.',
        effects: [{ type: 'speedOverride', speed: { walk: 35 } }],
      },
    ],
  },
  {
    id: 'shifter-wildhunt',
    nameRu: 'Шифтер — дикий охотник',
    nameEn: 'Wildhunt Shifter',
    source: 'erlw',
    kind: 'subrace',
    parentId: 'shifter',
    abilityScore: { kind: 'fixed', bonuses: { wisdom: 2 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'shifter-wildhunt-trait',
        nameRu: 'Дикий охотник',
        descriptionRu:
          'Владение «Выживанием». При сдвиге: преимущество на Мудрость; существа в пределах 30 футов не имеют преимущества на атаки по вам от невидимости/скрытности.',
        effects: [{ type: 'skillProficiency', skills: ['survival'] }],
      },
    ],
  },
  {
    id: 'warforged',
    nameRu: 'Варфордж',
    nameEn: 'Warforged',
    source: 'erlw',
    kind: 'race',
    motmUpdate: true,
    abilityScore: {
      kind: 'fixedPlusChoose',
      bonuses: { constitution: 2 },
      choosePlusOne: 1,
    },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'], choose: 1 },
    traits: [
      {
        id: 'warforged-constructed-resilience',
        nameRu: 'Устойчивость конструкта',
        nameEn: 'Constructed Resilience',
        descriptionRu:
          'Преимущество на спасброски от яда; сопротивление яду; иммунитет к болезням; не нуждается в еде, питье, дыхании; вместо сна — 6 часов бездействия (остаётесь в сознании).',
        effects: [
          { type: 'savingThrowAdvantage', against: 'яд' },
          { type: 'damageResistance', damageTypes: ['яд'] },
        ],
      },
      {
        id: 'warforged-sentry-rest',
        nameRu: 'Отдых часового',
        nameEn: "Sentry's Rest",
        descriptionRu: 'Длинный отдых: 6 часов бездействия; остаётесь в сознании.',
      },
      {
        id: 'warforged-integrated-protection',
        nameRu: 'Интегрированная защита',
        nameEn: 'Integrated Protection',
        descriptionRu: '+1 КД. Доспех встраивается в тело (надеть/снять — час).',
        effects: [{ type: 'acBonus', amount: 1 }],
      },
      {
        id: 'warforged-specialized-design',
        nameRu: 'Специализированный дизайн',
        nameEn: 'Specialized Design',
        descriptionRu: 'Владение одним навыком и одним инструментом.',
        effects: [{ type: 'skillChoice', count: 1 }],
      },
    ],
  },
];
