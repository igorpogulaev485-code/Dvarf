import type { RaceEntry } from './types';

/** Mordenkainen's Tome of Foes (2018). */
export const MTOF_RACES: RaceEntry[] = [
  {
    id: 'elf-eladrin',
    nameRu: 'Эладрин',
    nameEn: 'Eladrin',
    source: 'mtof',
    kind: 'subrace',
    parentId: 'elf',
    motmUpdate: true,
    abilityScore: {
      kind: 'custom',
      bonuses: { charisma: 1 },
      notesRu: '+1 Харизма (MToF). В DMG был вариант +1 Интеллект.',
    },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'eladrin-fey-step',
        nameRu: 'Фейский шаг',
        nameEn: 'Fey Step',
        descriptionRu:
          'Бонусным действием телепортация на 30 футов в видимое свободное пространство (1/короткий отдых). Сезон (осень/зима/весна/лето) меняет доп. эффект на 3+ уровне.',
      },
    ],
  },
  {
    id: 'githyanki',
    nameRu: 'Гитьянки',
    nameEn: 'Githyanki',
    source: 'mtof',
    kind: 'race',
    motmUpdate: true,
    abilityScore: { kind: 'fixed', bonuses: { strength: 2, intelligence: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Гить'] },
    traits: [
      {
        id: 'githyanki-decadent-mastery',
        nameRu: 'Астральные знания',
        nameEn: 'Decadent Mastery',
        descriptionRu: 'Владение одним навыком и одним инструментом; один дополнительный язык.',
        effects: [
          { type: 'skillChoice', count: 1 },
          { type: 'language', choose: 1 },
        ],
      },
      {
        id: 'githyanki-martial-prodigy',
        nameRu: 'Боевой вундеркинд',
        nameEn: 'Martial Prodigy',
        descriptionRu: 'Владение лёгкими и средними доспехами, короткими и длинными мечами.',
        effects: [
          { type: 'armorProficiency', armors: ['лёгкие доспехи', 'средние доспехи'] },
          { type: 'weaponProficiency', weapons: ['короткий меч', 'длинный меч'] },
        ],
      },
      {
        id: 'githyanki-psionics',
        nameRu: 'Гитьянки-псионика',
        nameEn: 'Githyanki Psionics',
        descriptionRu:
          'Заговор «Магическая рука» (невидимая). С 3 ур. — «Прыжок», с 5 ур. — «Туманный шаг» (1/длинный отдых). Интеллект.',
        effects: [
          {
            type: 'cantrip',
            spellRu: 'Магическая рука',
            spellEn: 'Mage Hand',
            ability: 'intelligence',
          },
          {
            type: 'spell',
            spellRu: 'Прыжок',
            spellEn: 'Jump',
            fromLevel: 3,
            uses: '1/длинный отдых',
            ability: 'intelligence',
          },
          {
            type: 'spell',
            spellRu: 'Туманный шаг',
            spellEn: 'Misty Step',
            fromLevel: 5,
            uses: '1/длинный отдых',
            ability: 'intelligence',
          },
        ],
      },
    ],
  },
  {
    id: 'githzerai',
    nameRu: 'Гитзерай',
    nameEn: 'Githzerai',
    source: 'mtof',
    kind: 'race',
    motmUpdate: true,
    abilityScore: { kind: 'fixed', bonuses: { wisdom: 2, intelligence: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Гить'] },
    traits: [
      {
        id: 'githzerai-mental-discipline',
        nameRu: 'Ментальная дисциплина',
        nameEn: 'Mental Discipline',
        descriptionRu: 'Преимущество на спасброски от очарования и испуга.',
        effects: [
          { type: 'savingThrowAdvantage', against: 'очарование' },
          { type: 'savingThrowAdvantage', against: 'испуг' },
        ],
      },
      {
        id: 'githzerai-psionics',
        nameRu: 'Гитзерай-псионика',
        nameEn: 'Githzerai Psionics',
        descriptionRu:
          'Заговор «Магическая рука» (невидимая). С 3 ур. — «Щит», с 5 ур. — «Обнаружение мыслей» (1/длинный отдых). Мудрость.',
        effects: [
          {
            type: 'cantrip',
            spellRu: 'Магическая рука',
            spellEn: 'Mage Hand',
            ability: 'wisdom',
          },
          {
            type: 'spell',
            spellRu: 'Щит',
            spellEn: 'Shield',
            fromLevel: 3,
            uses: '1/длинный отдых',
            ability: 'wisdom',
          },
          {
            type: 'spell',
            spellRu: 'Обнаружение мыслей',
            spellEn: 'Detect Thoughts',
            fromLevel: 5,
            uses: '1/длинный отдых',
            ability: 'wisdom',
          },
        ],
      },
    ],
  },
  {
    id: 'elf-sea',
    nameRu: 'Морской эльф',
    nameEn: 'Sea Elf',
    source: 'mtof',
    kind: 'subrace',
    parentId: 'elf',
    motmUpdate: true,
    abilityScore: { kind: 'fixed', bonuses: { constitution: 1 } },
    size: 'medium',
    speed: { walk: 30, swim: 30 },
    languages: { fixed: ['Водяной'] },
    traits: [
      {
        id: 'sea-elf-amphibious',
        nameRu: 'Дитя моря',
        nameEn: 'Child of the Sea',
        descriptionRu: 'Скорость плавания 30 футов; дыхание воздухом и водой.',
        effects: [{ type: 'speedOverride', speed: { walk: 30, swim: 30 } }],
      },
      {
        id: 'sea-elf-weapon-training',
        nameRu: 'Владение оружием морских эльфов',
        descriptionRu: 'Владение копьём, трезубцем, лёгким арбалетом и сетью.',
        effects: [
          {
            type: 'weaponProficiency',
            weapons: ['копье', 'трезубец', 'лёгкий арбалет', 'сеть'],
          },
        ],
      },
      {
        id: 'sea-elf-friend',
        nameRu: 'Друг морей',
        nameEn: 'Friend of the Sea',
        descriptionRu:
          'Можете общаться простыми идеями с любым зверем, у которого есть скорость плавания.',
      },
    ],
  },
  {
    id: 'elf-shadar-kai',
    nameRu: 'Шадар-кай',
    nameEn: 'Shadar-kai',
    source: 'mtof',
    kind: 'subrace',
    parentId: 'elf',
    motmUpdate: true,
    abilityScore: { kind: 'fixed', bonuses: { constitution: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'shadar-kai-necrotic-resistance',
        nameRu: 'Некротическое сопротивление',
        descriptionRu: 'Сопротивление некротическому урону.',
        effects: [{ type: 'damageResistance', damageTypes: ['некротический'] }],
      },
      {
        id: 'shadar-kai-blessing',
        nameRu: 'Благословение Королевы Воронов',
        nameEn: "Blessing of the Raven Queen",
        descriptionRu:
          'Бонусным действием телепортация на 30 футов (1/короткий отдых). С 3 уровня после телепортации — сопротивление всему урону до начала следующего хода.',
      },
    ],
  },
  {
    id: 'svirfneblin-mtof',
    nameRu: 'Свирфнеблин (MToF)',
    nameEn: 'Svirfneblin',
    source: 'mtof',
    kind: 'subrace',
    parentId: 'gnome',
    summaryRu: 'Перепечатка глубинного гнома с доп. чертой «Каменная стойкость» (feat в EEPC).',
    abilityScore: { kind: 'fixed', bonuses: { dexterity: 1 } },
    size: 'small',
    speed: { walk: 25 },
    languages: { fixed: ['Подземный'] },
    traits: [
      {
        id: 'svirfneblin-superior-darkvision',
        nameRu: 'Превосходное тёмное зрение',
        descriptionRu: 'Тёмное зрение 120 футов.',
        effects: [{ type: 'darkvision', feet: 120 }],
      },
      {
        id: 'svirfneblin-stone-camouflage',
        nameRu: 'Каменная маскировка',
        descriptionRu: 'Преимущество на Скрытность в каменистой местности.',
      },
      {
        id: 'svirfneblin-gnome-cunning-note',
        nameRu: 'Гномья хитрость',
        descriptionRu: 'Как у базового гнома.',
      },
    ],
  },
];
