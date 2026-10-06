import type { RaceEntry } from './types';

/** Volo's Guide to Monsters (2016). */
export const VOLO_RACES: RaceEntry[] = [
  {
    id: 'aasimar',
    nameRu: 'Аасимар',
    nameEn: 'Aasimar',
    source: 'volo',
    kind: 'race',
    motmUpdate: true,
    abilityScore: {
      kind: 'custom',
      bonuses: { charisma: 2 },
      notesRu: '+2 Харизма; подраса даёт +1 к одной характеристике',
    },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Небесный'] },
    subraceIds: ['aasimar-protector', 'aasimar-scourge', 'aasimar-fallen'],
    traits: [
      {
        id: 'aasimar-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'aasimar-celestial-resistance',
        nameRu: 'Небесное сопротивление',
        nameEn: 'Celestial Resistance',
        descriptionRu: 'Сопротивление некротическому и излучающему урону.',
        effects: [
          { type: 'damageResistance', damageTypes: ['некротический', 'излучение'] },
        ],
      },
      {
        id: 'aasimar-healing-hands',
        nameRu: 'Целительные руки',
        nameEn: 'Healing Hands',
        descriptionRu:
          'Действием коснитесь существа и восстановите хиты, равные вашему уровню (1/длинный отдых).',
      },
      {
        id: 'aasimar-light-bearer',
        nameRu: 'Носитель света',
        nameEn: 'Light Bearer',
        descriptionRu: 'Заговор «Свет». Харизма — базовая характеристика.',
        effects: [{ type: 'cantrip', spellRu: 'Свет', spellEn: 'Light', ability: 'charisma' }],
      },
    ],
  },
  {
    id: 'aasimar-protector',
    nameRu: 'Аасимар-защитник',
    nameEn: 'Protector Aasimar',
    source: 'volo',
    kind: 'subrace',
    parentId: 'aasimar',
    abilityScore: { kind: 'fixed', bonuses: { wisdom: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'aasimar-protector-radiant-soul',
        nameRu: 'Сияющая душа',
        nameEn: 'Radiant Soul',
        descriptionRu:
          'С 3 уровня действием: полёт на скорость ходьбы и доп. излучающий урон = уровню на одну атаку/заклинание за ход (1 минута, 1/длинный отдых).',
      },
    ],
  },
  {
    id: 'aasimar-scourge',
    nameRu: 'Аасимар-каратель',
    nameEn: 'Scourge Aasimar',
    source: 'volo',
    kind: 'subrace',
    parentId: 'aasimar',
    abilityScore: { kind: 'fixed', bonuses: { constitution: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'aasimar-scourge-radiant-consumption',
        nameRu: 'Сияющее поглощение',
        nameEn: 'Radiant Consumption',
        descriptionRu:
          'С 3 уровня действием: свет и урон излучением себе и врагам рядом; доп. излучающий урон = уровню на одну атаку/заклинание (1 минута, 1/длинный отдых).',
      },
    ],
  },
  {
    id: 'aasimar-fallen',
    nameRu: 'Падший аасимар',
    nameEn: 'Fallen Aasimar',
    source: 'volo',
    kind: 'subrace',
    parentId: 'aasimar',
    abilityScore: { kind: 'fixed', bonuses: { strength: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'aasimar-fallen-necrotic-shroud',
        nameRu: 'Некротическая пелена',
        nameEn: 'Necrotic Shroud',
        descriptionRu:
          'С 3 уровня действием: испуг ближайших существ; доп. некротический урон = уровню на одну атаку/заклинание (1 минута, 1/длинный отдых).',
      },
    ],
  },
  {
    id: 'bugbear',
    nameRu: 'Багбир',
    nameEn: 'Bugbear',
    source: 'volo',
    kind: 'race',
    motmUpdate: true,
    abilityScore: { kind: 'fixed', bonuses: { strength: 2, dexterity: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Гоблинский'] },
    traits: [
      {
        id: 'bugbear-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'bugbear-long-limbed',
        nameRu: 'Длинные руки',
        nameEn: 'Long-Limbed',
        descriptionRu: 'При рукопашной атаке в свой ход досягаемость +5 футов.',
      },
      {
        id: 'bugbear-powerful-build',
        nameRu: 'Мощное телосложение',
        descriptionRu: 'Считаетесь на размер больше для переноса веса.',
        effects: [{ type: 'powerfulBuild' }],
      },
      {
        id: 'bugbear-sneaky',
        nameRu: 'Хитрый',
        nameEn: 'Sneaky',
        descriptionRu: 'Владение навыком «Скрытность».',
        effects: [{ type: 'skillProficiency', skills: ['stealth'] }],
      },
      {
        id: 'bugbear-surprise-attack',
        nameRu: 'Внезапная атака',
        nameEn: 'Surprise Attack',
        descriptionRu:
          'Если атакуете существо, захваченное врасплох, и попадаете в первый раунд боя — доп. 2d6 урона.',
      },
    ],
  },
  {
    id: 'firbolg',
    nameRu: 'Фирболг',
    nameEn: 'Firbolg',
    source: 'volo',
    kind: 'race',
    motmUpdate: true,
    abilityScore: { kind: 'fixed', bonuses: { wisdom: 2, strength: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Эльфийский', 'Великаний'] },
    traits: [
      {
        id: 'firbolg-magic',
        nameRu: 'Магия фирболгов',
        nameEn: 'Firbolg Magic',
        descriptionRu:
          'Можете сотворить «Обнаружение магии» и «Маскировку» 1/короткий отдых. Мудрость — базовая характеристика.',
        effects: [
          {
            type: 'spell',
            spellRu: 'Обнаружение магии',
            spellEn: 'Detect Magic',
            fromLevel: 1,
            uses: '1/короткий отдых',
            ability: 'wisdom',
          },
          {
            type: 'spell',
            spellRu: 'Маскировка',
            spellEn: 'Disguise Self',
            fromLevel: 1,
            uses: '1/короткий отдых',
            ability: 'wisdom',
          },
        ],
      },
      {
        id: 'firbolg-hidden-step',
        nameRu: 'Скрытный шаг',
        nameEn: 'Hidden Step',
        descriptionRu:
          'Бонусным действием стать невидимым до начала следующего хода или до атаки/заклинания/урона (1/короткий отдых).',
      },
      {
        id: 'firbolg-powerful-build',
        nameRu: 'Мощное телосложение',
        descriptionRu: 'Считаетесь на размер больше для переноса веса.',
        effects: [{ type: 'powerfulBuild' }],
      },
      {
        id: 'firbolg-speech-of-beast-and-leaf',
        nameRu: 'Речь зверя и листа',
        nameEn: 'Speech of Beast and Leaf',
        descriptionRu:
          'Можете общаться с зверями и растениями; преимущество на проверки Харизмы для влияния на них.',
      },
    ],
  },
  {
    id: 'goblin',
    nameRu: 'Гоблин',
    nameEn: 'Goblin',
    source: 'volo',
    kind: 'race',
    motmUpdate: true,
    abilityScore: { kind: 'fixed', bonuses: { dexterity: 2, constitution: 1 } },
    size: 'small',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Гоблинский'] },
    traits: [
      {
        id: 'goblin-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'goblin-fury-of-the-small',
        nameRu: 'Ярость маленького',
        nameEn: 'Fury of the Small',
        descriptionRu:
          'При нанесении урона существу большего размера добавляете урон, равный уровню (1/короткий отдых).',
      },
      {
        id: 'goblin-nimble-escape',
        nameRu: 'Проворный побег',
        nameEn: 'Nimble Escape',
        descriptionRu: 'Бонусным действием можете совершить действие «Отход» или «Засада».',
      },
    ],
  },
  {
    id: 'hobgoblin',
    nameRu: 'Хобгоблин',
    nameEn: 'Hobgoblin',
    source: 'volo',
    kind: 'race',
    motmUpdate: true,
    abilityScore: { kind: 'fixed', bonuses: { constitution: 2, intelligence: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Гоблинский'] },
    traits: [
      {
        id: 'hobgoblin-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'hobgoblin-martial-training',
        nameRu: 'Воинская подготовка',
        nameEn: 'Martial Training',
        descriptionRu: 'Владение двумя боевыми оружиями на выбор и лёгкими доспехами.',
        effects: [
          { type: 'armorProficiency', armors: ['лёгкие доспехи'] },
          {
            type: 'choice',
            id: 'hobgoblin-weapons',
            nameRu: 'Два боевых оружия',
            options: [],
          },
        ],
      },
      {
        id: 'hobgoblin-saving-face',
        nameRu: 'Сохранение лица',
        nameEn: 'Saving Face',
        descriptionRu:
          'Если промахиваетесь атакой или проваливаете проверку/спасбросок, можете добавить число союзников в пределах 30 футов (не больше бонуса мастерства) к броску (1/короткий отдых).',
      },
    ],
  },
  {
    id: 'kenku',
    nameRu: 'Кенку',
    nameEn: 'Kenku',
    source: 'volo',
    kind: 'race',
    motmUpdate: true,
    abilityScore: { kind: 'fixed', bonuses: { dexterity: 2, wisdom: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Аурановый'] },
    traits: [
      {
        id: 'kenku-expert-forgery',
        nameRu: 'Экспертная подделка',
        nameEn: 'Expert Forgery',
        descriptionRu:
          'Преимущество на проверки для создания подделок и копирования чужого почерка.',
      },
      {
        id: 'kenku-mimicry',
        nameRu: 'Подражание',
        nameEn: 'Mimicry',
        descriptionRu:
          'Можете имитировать любые звуки, которые слышали, включая голоса. Слушатели могут распознать обман проверкой Мудрости (Проницательность) против вашей Харизмы (Обман).',
      },
      {
        id: 'kenku-trained',
        nameRu: 'Обучение кенку',
        nameEn: 'Kenku Training',
        descriptionRu: 'Владение двумя навыками на выбор из: Акробатика, Обман, Скрытность, Ловкость рук.',
        effects: [
          {
            type: 'choice',
            id: 'kenku-skills',
            nameRu: 'Два навыка кенку',
            options: [
              { id: 'acrobatics', labelRu: 'Акробатика', effects: [{ type: 'skillProficiency', skills: ['acrobatics'] }] },
              { id: 'deception', labelRu: 'Обман', effects: [{ type: 'skillProficiency', skills: ['deception'] }] },
              { id: 'stealth', labelRu: 'Скрытность', effects: [{ type: 'skillProficiency', skills: ['stealth'] }] },
              { id: 'sleightOfHand', labelRu: 'Ловкость рук', effects: [{ type: 'skillProficiency', skills: ['sleightOfHand'] }] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kobold',
    nameRu: 'Кобольд',
    nameEn: 'Kobold',
    source: 'volo',
    kind: 'race',
    motmUpdate: true,
    abilityScore: {
      kind: 'custom',
      bonuses: { dexterity: 2, strength: -2 },
      notesRu: '+2 Ловкость, −2 Сила (Volo; в MotM штрафа нет)',
    },
    size: 'small',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Драконий'] },
    traits: [
      {
        id: 'kobold-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'kobold-grovel',
        nameRu: 'Пресмыкание, трусость и мольба',
        nameEn: 'Grovel, Cower, and Beg',
        descriptionRu:
          'Действием отвлечь врагов в пределах 10 футов: союзники получают преимущество на атаки по ним до вашего следующего хода (1/короткий отдых).',
      },
      {
        id: 'kobold-pack-tactics',
        nameRu: 'Стайная тактика',
        nameEn: 'Pack Tactics',
        descriptionRu:
          'Преимущество на бросок атаки, если в пределах 5 футов от цели есть дееспособный союзник.',
      },
      {
        id: 'kobold-sunlight-sensitivity',
        nameRu: 'Чувствительность к солнечному свету',
        descriptionRu:
          'Помеха на атаки и Восприятие (зрение) при прямом солнечном свете.',
      },
    ],
  },
  {
    id: 'lizardfolk',
    nameRu: 'Ящеролюд',
    nameEn: 'Lizardfolk',
    source: 'volo',
    kind: 'race',
    motmUpdate: true,
    abilityScore: { kind: 'fixed', bonuses: { constitution: 2, wisdom: 1 } },
    size: 'medium',
    speed: { walk: 30, swim: 30 },
    languages: { fixed: ['Общий', 'Драконий'] },
    traits: [
      {
        id: 'lizardfolk-bite',
        nameRu: 'Укус',
        nameEn: 'Bite',
        descriptionRu: 'Природная оружие: 1d6 + модификатор Силы колющего урона.',
        effects: [
          {
            type: 'naturalWeapon',
            nameRu: 'Укус',
            damageRu: '1к6 + СИЛ колющий',
            ability: 'strength',
          },
        ],
      },
      {
        id: 'lizardfolk-crocodile-cunning',
        nameRu: 'Голодный боец',
        nameEn: "Hungry Jaws",
        descriptionRu:
          'Бонусным действием укус; при попадании получаете временные хиты = модификатору Телосложения (1/короткий отдых).',
      },
      {
        id: 'lizardfolk-natural-armor',
        nameRu: 'Естественная броня',
        nameEn: 'Natural Armor',
        descriptionRu: 'КД = 13 + модификатор Ловкости (без доспеха).',
        effects: [{ type: 'naturalArmor', formula: '13+DEX' }],
      },
      {
        id: 'lizardfolk-hunter',
        nameRu: 'Охотник',
        nameEn: "Hunter's Lore",
        descriptionRu: 'Владение двумя навыками из: Уход за животными, Природа, Восприятие, Скрытность, Выживание.',
        effects: [
          {
            type: 'choice',
            id: 'lizardfolk-skills',
            nameRu: 'Два навыка охотника',
            options: [
              { id: 'animalHandling', labelRu: 'Уход за животными', effects: [{ type: 'skillProficiency', skills: ['animalHandling'] }] },
              { id: 'nature', labelRu: 'Природа', effects: [{ type: 'skillProficiency', skills: ['nature'] }] },
              { id: 'perception', labelRu: 'Восприятие', effects: [{ type: 'skillProficiency', skills: ['perception'] }] },
              { id: 'stealth', labelRu: 'Скрытность', effects: [{ type: 'skillProficiency', skills: ['stealth'] }] },
              { id: 'survival', labelRu: 'Выживание', effects: [{ type: 'skillProficiency', skills: ['survival'] }] },
            ],
          },
        ],
      },
      {
        id: 'lizardfolk-crafty',
        nameRu: 'Ремесло ящеролюда',
        nameEn: "Cunning Artisan",
        descriptionRu:
          'За 1 час из трупа можете сделать щит, дубинку, дротик или метательное копьё.',
      },
    ],
  },
  {
    id: 'orc',
    nameRu: 'Орк',
    nameEn: 'Orc',
    source: 'volo',
    kind: 'race',
    motmUpdate: true,
    abilityScore: {
      kind: 'custom',
      bonuses: { strength: 2, constitution: 1, intelligence: -2 },
      notesRu: '+2 Сила, +1 Телосложение, −2 Интеллект (Volo; в MotM штрафа нет)',
    },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Орочий'] },
    traits: [
      {
        id: 'orc-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'orc-aggressive',
        nameRu: 'Агрессивный',
        nameEn: 'Aggressive',
        descriptionRu: 'Бонусным действием «Рывок» к враждебному существу, которое видите.',
      },
      {
        id: 'orc-powerful-build',
        nameRu: 'Мощное телосложение',
        descriptionRu: 'Считаетесь на размер больше для переноса веса.',
        effects: [{ type: 'powerfulBuild' }],
      },
      {
        id: 'orc-primal-intuition',
        nameRu: 'Первобытная интуиция',
        nameEn: 'Primal Intuition',
        descriptionRu: 'Владение двумя навыками из: Уход за животными, Проницательность, Запугивание, Медицина, Восприятие, Выживание.',
        effects: [
          {
            type: 'choice',
            id: 'orc-skills',
            nameRu: 'Два навыка',
            options: [
              { id: 'animalHandling', labelRu: 'Уход за животными', effects: [{ type: 'skillProficiency', skills: ['animalHandling'] }] },
              { id: 'insight', labelRu: 'Проницательность', effects: [{ type: 'skillProficiency', skills: ['insight'] }] },
              { id: 'intimidation', labelRu: 'Запугивание', effects: [{ type: 'skillProficiency', skills: ['intimidation'] }] },
              { id: 'medicine', labelRu: 'Медицина', effects: [{ type: 'skillProficiency', skills: ['medicine'] }] },
              { id: 'perception', labelRu: 'Восприятие', effects: [{ type: 'skillProficiency', skills: ['perception'] }] },
              { id: 'survival', labelRu: 'Выживание', effects: [{ type: 'skillProficiency', skills: ['survival'] }] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'tabaxi',
    nameRu: 'Табакси',
    nameEn: 'Tabaxi',
    source: 'volo',
    kind: 'race',
    motmUpdate: true,
    abilityScore: { kind: 'fixed', bonuses: { dexterity: 2, charisma: 1 } },
    size: 'medium',
    speed: { walk: 30, climb: 20 },
    languages: { fixed: ['Общий'], choose: 1 },
    traits: [
      {
        id: 'tabaxi-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'tabaxi-feline-agility',
        nameRu: 'Кошачья ловкость',
        nameEn: 'Feline Agility',
        descriptionRu:
          'В свой ход можете удвоить скорость до конца хода; затем нужно переместиться на 0 футов в один из ходов, чтобы использовать снова.',
      },
      {
        id: 'tabaxi-cat-claws',
        nameRu: 'Кошачьи когти',
        nameEn: "Cat's Claws",
        descriptionRu:
          'Скорость лазания 20 футов. Безоружная атака когтями: 1d4 + модификатор Силы рубящего урона.',
        effects: [
          { type: 'speedOverride', speed: { walk: 30, climb: 20 } },
          {
            type: 'naturalWeapon',
            nameRu: 'Когти',
            damageRu: '1к4 + СИЛ рубящий',
            ability: 'strength',
          },
        ],
      },
      {
        id: 'tabaxi-cat-talent',
        nameRu: 'Кошачий талант',
        nameEn: "Cat's Talent",
        descriptionRu: 'Владение «Восприятием» и «Скрытностью».',
        effects: [{ type: 'skillProficiency', skills: ['perception', 'stealth'] }],
      },
    ],
  },
  {
    id: 'triton',
    nameRu: 'Тритон',
    nameEn: 'Triton',
    source: 'volo',
    kind: 'race',
    motmUpdate: true,
    abilityScore: {
      kind: 'fixed',
      bonuses: { strength: 1, constitution: 1, charisma: 1 },
    },
    size: 'medium',
    speed: { walk: 30, swim: 30 },
    languages: { fixed: ['Общий', 'Изначальный'] },
    traits: [
      {
        id: 'triton-amphibious',
        nameRu: 'Амфибия',
        descriptionRu: 'Дышите воздухом и водой.',
      },
      {
        id: 'triton-control',
        nameRu: 'Контроль воздуха и воды',
        nameEn: 'Control Air and Water',
        descriptionRu:
          '«Туманное облако» (1 ур.), с 3 ур. — «Порыв ветра», с 5 ур. — «Стена воды». Каждый 1/длинный отдых. Харизма.',
        effects: [
          {
            type: 'spell',
            spellRu: 'Туманное облако',
            spellEn: 'Fog Cloud',
            fromLevel: 1,
            uses: '1/длинный отдых',
            ability: 'charisma',
          },
          {
            type: 'spell',
            spellRu: 'Порыв ветра',
            spellEn: 'Gust of Wind',
            fromLevel: 3,
            uses: '1/длинный отдых',
            ability: 'charisma',
          },
          {
            type: 'spell',
            spellRu: 'Стена воды',
            spellEn: 'Wall of Water',
            fromLevel: 5,
            uses: '1/длинный отдых',
            ability: 'charisma',
          },
        ],
      },
      {
        id: 'triton-emissary',
        nameRu: 'Посланник моря',
        nameEn: 'Emissary of the Sea',
        descriptionRu:
          'Можете общаться простыми идеями с любым зверем или элементалем, у которого есть скорость плавания.',
      },
      {
        id: 'triton-guardians',
        nameRu: 'Стражи глубин',
        nameEn: 'Guardians of the Depths',
        descriptionRu: 'Сопротивление урону холодом.',
        effects: [{ type: 'damageResistance', damageTypes: ['холод'] }],
      },
    ],
  },
  {
    id: 'yuan-ti-pureblood',
    nameRu: 'Юань-ти (чистокровный)',
    nameEn: 'Yuan-ti Pureblood',
    source: 'volo',
    kind: 'race',
    motmUpdate: true,
    abilityScore: { kind: 'fixed', bonuses: { charisma: 2, intelligence: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Бездны', 'Драконий'] },
    traits: [
      {
        id: 'yuan-ti-darkvision',
        nameRu: 'Тёмное зрение',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'yuan-ti-innate-spellcasting',
        nameRu: 'Врождённая магия',
        nameEn: 'Innate Spellcasting',
        descriptionRu:
          'Заговор «Ядовитые брызги». «Дружба с животными» только на змей (неограниченно). С 3 ур. — «Внушение» 1/длинный отдых. Харизма.',
        effects: [
          {
            type: 'cantrip',
            spellRu: 'Ядовитые брызги',
            spellEn: 'Poison Spray',
            ability: 'charisma',
          },
          {
            type: 'spell',
            spellRu: 'Внушение',
            spellEn: 'Suggestion',
            fromLevel: 3,
            uses: '1/длинный отдых',
            ability: 'charisma',
          },
        ],
      },
      {
        id: 'yuan-ti-magic-resistance',
        nameRu: 'Сопротивление магии',
        nameEn: 'Magic Resistance',
        descriptionRu: 'Преимущество на спасброски против заклинаний и прочих магических эффектов.',
        effects: [{ type: 'savingThrowAdvantage', against: 'заклинания и магические эффекты' }],
      },
      {
        id: 'yuan-ti-poison-immunity',
        nameRu: 'Ядовитая стойкость',
        nameEn: 'Poison Immunity',
        descriptionRu: 'Иммунитет к урону ядом и состоянию «Отравленный».',
        effects: [
          { type: 'damageImmunity', damageTypes: ['яд'] },
          { type: 'conditionImmunity', conditions: ['отравленный'] },
        ],
      },
    ],
  },
];
