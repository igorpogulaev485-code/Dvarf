import type { RaceEntry } from './types';

/** Основные расы Player's Handbook (2014). */
export const PHB_RACES: RaceEntry[] = [
  // ─── Дварф ─────────────────────────────────────────────
  {
    id: 'dwarf',
    nameRu: 'Дварф',
    nameEn: 'Dwarf',
    source: 'phb',
    kind: 'race',
    abilityScore: { kind: 'fixed', bonuses: { constitution: 2 } },
    age: { matureAround: 50, lifespanAround: 350 },
    size: 'medium',
    sizeNotesRu: 'Рост 1.2–1.5 м, вес ~150 фунтов',
    speed: {
      walk: 25,
      notesRu: 'Скорость не снижается от тяжёлых доспехов',
    },
    languages: { fixed: ['Общий', 'Дварфийский'] },
    subraceIds: ['dwarf-hill', 'dwarf-mountain'],
    traits: [
      {
        id: 'dwarf-darkvision',
        nameRu: 'Тёмное зрение',
        nameEn: 'Darkvision',
        descriptionRu: 'В пределах 60 футов вы видите в тусклом свете как в ярком, а в темноте — как в тусклом.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'dwarf-resilience',
        nameRu: 'Дварфская устойчивость',
        nameEn: 'Dwarven Resilience',
        descriptionRu:
          'Преимущество на спасброски от яда; сопротивление урону ядом.',
        effects: [
          { type: 'savingThrowAdvantage', against: 'яд' },
          { type: 'damageResistance', damageTypes: ['яд'] },
        ],
      },
      {
        id: 'dwarf-combat-training',
        nameRu: 'Дварфская боевая подготовка',
        nameEn: 'Dwarven Combat Training',
        descriptionRu:
          'Владение боевым топором, ручным топором, лёгким и боевым молотом.',
        effects: [
          {
            type: 'weaponProficiency',
            weapons: ['боевой топор', 'ручной топор', 'лёгкий молот', 'боевой молот'],
          },
        ],
      },
      {
        id: 'dwarf-tool-proficiency',
        nameRu: 'Владение инструментами',
        nameEn: 'Tool Proficiency',
        descriptionRu:
          'Владение ремесленными инструментами на выбор: кузнеца, пивовара или каменщика.',
        effects: [
          {
            type: 'toolChoice',
            options: ['инструменты кузнеца', 'инструменты пивовара', 'инструменты каменщика'],
            count: 1,
          },
        ],
      },
      {
        id: 'dwarf-stonecunning',
        nameRu: 'Знание камня',
        nameEn: 'Stonecunning',
        descriptionRu:
          'При проверке Интеллекта (История), связанной с происхождением каменной кладки, вы считаетесь владеющим навыком История и добавляете удвоенный бонус мастерства.',
      },
    ],
  },
  {
    id: 'dwarf-hill',
    nameRu: 'Холмовой дварф',
    nameEn: 'Hill Dwarf',
    source: 'phb',
    kind: 'subrace',
    parentId: 'dwarf',
    abilityScore: { kind: 'fixed', bonuses: { wisdom: 1 } },
    size: 'medium',
    speed: { walk: 25 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'dwarf-hill-toughness',
        nameRu: 'Дварфская выносливость',
        nameEn: 'Dwarven Toughness',
        descriptionRu:
          'Максимум хитов увеличивается на 1, и на 1 за каждый последующий уровень.',
        effects: [{ type: 'hpMaxPerLevel', amount: 1 }],
      },
    ],
  },
  {
    id: 'dwarf-mountain',
    nameRu: 'Горный дварф',
    nameEn: 'Mountain Dwarf',
    source: 'phb',
    kind: 'subrace',
    parentId: 'dwarf',
    abilityScore: { kind: 'fixed', bonuses: { strength: 2 } },
    size: 'medium',
    speed: { walk: 25 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'dwarf-mountain-armor',
        nameRu: 'Владение доспехами дварфов',
        nameEn: 'Dwarven Armor Training',
        descriptionRu: 'Владение лёгкими и средними доспехами.',
        effects: [{ type: 'armorProficiency', armors: ['лёгкие доспехи', 'средние доспехи'] }],
      },
    ],
  },

  // ─── Эльф ──────────────────────────────────────────────
  {
    id: 'elf',
    nameRu: 'Эльф',
    nameEn: 'Elf',
    source: 'phb',
    kind: 'race',
    abilityScore: { kind: 'fixed', bonuses: { dexterity: 2 } },
    age: { matureAround: 100, lifespanAround: 750 },
    size: 'medium',
    sizeNotesRu: 'Рост 1.5–1.8 м',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Эльфийский'] },
    subraceIds: ['elf-high', 'elf-wood', 'elf-drow'],
    traits: [
      {
        id: 'elf-darkvision',
        nameRu: 'Тёмное зрение',
        nameEn: 'Darkvision',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'elf-keen-senses',
        nameRu: 'Обострённые чувства',
        nameEn: 'Keen Senses',
        descriptionRu: 'Владение навыком «Восприятие».',
        effects: [{ type: 'skillProficiency', skills: ['perception'] }],
      },
      {
        id: 'elf-fey-ancestry',
        nameRu: 'Фейское происхождение',
        nameEn: 'Fey Ancestry',
        descriptionRu:
          'Преимущество на спасброски от очарования; магия не может вас усыпить.',
        effects: [{ type: 'savingThrowAdvantage', against: 'очарование' }],
      },
      {
        id: 'elf-trance',
        nameRu: 'Транс',
        nameEn: 'Trance',
        descriptionRu: '4 часа медитации вместо сна дают эффект длинного отдыха.',
      },
    ],
  },
  {
    id: 'elf-high',
    nameRu: 'Высший эльф',
    nameEn: 'High Elf',
    source: 'phb',
    kind: 'subrace',
    parentId: 'elf',
    abilityScore: { kind: 'fixed', bonuses: { intelligence: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: [], choose: 1 },
    traits: [
      {
        id: 'elf-high-cantrip',
        nameRu: 'Заговор',
        nameEn: 'Cantrip',
        descriptionRu:
          'Один заговор из списка волшебника. Интеллект — базовая характеристика.',
        effects: [
          {
            type: 'choice',
            id: 'high-elf-cantrip',
            nameRu: 'Заговор волшебника',
            options: [],
          },
          { type: 'language', choose: 1 },
        ],
      },
      {
        id: 'elf-high-weapon-training',
        nameRu: 'Владение эльфийским оружием',
        nameEn: 'Elf Weapon Training',
        descriptionRu: 'Владение длинным мечом, коротким мечом, коротким и длинным луком.',
        effects: [
          {
            type: 'weaponProficiency',
            weapons: ['длинный меч', 'короткий меч', 'короткий лук', 'длинный лук'],
          },
        ],
      },
    ],
  },
  {
    id: 'elf-wood',
    nameRu: 'Лесной эльф',
    nameEn: 'Wood Elf',
    source: 'phb',
    kind: 'subrace',
    parentId: 'elf',
    abilityScore: { kind: 'fixed', bonuses: { wisdom: 1 } },
    size: 'medium',
    speed: { walk: 35 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'elf-wood-fleet',
        nameRu: 'Быстрые ноги',
        nameEn: 'Fleet of Foot',
        descriptionRu: 'Скорость ходьбы 35 футов.',
        effects: [{ type: 'speedOverride', speed: { walk: 35 } }],
      },
      {
        id: 'elf-wood-mask',
        nameRu: 'Маскировка в природе',
        nameEn: 'Mask of the Wild',
        descriptionRu:
          'Можете пытаться скрыться, даже если вас слегка заслоняют листва, сильный дождь, снег, туман или другие природные явления.',
      },
      {
        id: 'elf-wood-weapon-training',
        nameRu: 'Владение эльфийским оружием',
        nameEn: 'Elf Weapon Training',
        descriptionRu: 'Владение длинным мечом, коротким мечом, коротким и длинным луком.',
        effects: [
          {
            type: 'weaponProficiency',
            weapons: ['длинный меч', 'короткий меч', 'короткий лук', 'длинный лук'],
          },
        ],
      },
    ],
  },
  {
    id: 'elf-drow',
    nameRu: 'Дроу (тёмный эльф)',
    nameEn: 'Dark Elf (Drow)',
    source: 'phb',
    kind: 'subrace',
    parentId: 'elf',
    abilityScore: { kind: 'fixed', bonuses: { charisma: 1 } },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'elf-drow-superior-darkvision',
        nameRu: 'Превосходное тёмное зрение',
        nameEn: 'Superior Darkvision',
        descriptionRu: 'Тёмное зрение 120 футов.',
        effects: [{ type: 'darkvision', feet: 120 }],
      },
      {
        id: 'elf-drow-sunlight-sensitivity',
        nameRu: 'Чувствительность к солнечному свету',
        nameEn: 'Sunlight Sensitivity',
        descriptionRu:
          'Помеха на броски атаки и проверки Мудрости (Восприятие), основанные на зрении, при прямом солнечном свете.',
      },
      {
        id: 'elf-drow-magic',
        nameRu: 'Магия дроу',
        nameEn: 'Drow Magic',
        descriptionRu:
          'Заговор «Пляшущие огни». На 3 уровне — «Огонь фей», на 5 уровне — «Тьма» (каждый 1/длинный отдых). Харизма — базовая характеристика.',
        effects: [
          { type: 'cantrip', spellRu: 'Пляшущие огни', spellEn: 'Dancing Lights', ability: 'charisma' },
          {
            type: 'spell',
            spellRu: 'Огонь фей',
            spellEn: 'Faerie Fire',
            fromLevel: 3,
            uses: '1/длинный отдых',
            ability: 'charisma',
          },
          {
            type: 'spell',
            spellRu: 'Тьма',
            spellEn: 'Darkness',
            fromLevel: 5,
            uses: '1/длинный отдых',
            ability: 'charisma',
          },
        ],
      },
      {
        id: 'elf-drow-weapon-training',
        nameRu: 'Владение оружием дроу',
        nameEn: 'Drow Weapon Training',
        descriptionRu: 'Владение рапирой, коротким мечом и ручным арбалетом.',
        effects: [
          {
            type: 'weaponProficiency',
            weapons: ['рапира', 'короткий меч', 'ручной арбалет'],
          },
        ],
      },
    ],
  },

  // ─── Полурослик ────────────────────────────────────────
  {
    id: 'halfling',
    nameRu: 'Полурослик',
    nameEn: 'Halfling',
    source: 'phb',
    kind: 'race',
    abilityScore: { kind: 'fixed', bonuses: { dexterity: 2 } },
    age: { matureAround: 20, lifespanAround: 150 },
    size: 'small',
    sizeNotesRu: 'Рост ~0.9 м, вес ~40 фунтов',
    speed: { walk: 25 },
    languages: { fixed: ['Общий', 'Полуросличий'] },
    subraceIds: ['halfling-lightfoot', 'halfling-stout'],
    traits: [
      {
        id: 'halfling-lucky',
        nameRu: 'Везучий',
        nameEn: 'Lucky',
        descriptionRu:
          'При выпадении 1 на d20 для атаки, проверки характеристики или спасброска можете перебросить кость; использовать нужно новый результат.',
      },
      {
        id: 'halfling-brave',
        nameRu: 'Отважный',
        nameEn: 'Brave',
        descriptionRu: 'Преимущество на спасброски от состояния «Испуганный».',
        effects: [{ type: 'savingThrowAdvantage', against: 'испуганный' }],
      },
      {
        id: 'halfling-nimbleness',
        nameRu: 'Проворство полурослика',
        nameEn: 'Halfling Nimbleness',
        descriptionRu: 'Можете проходить через пространство существ, размер которых больше вашего.',
      },
    ],
  },
  {
    id: 'halfling-lightfoot',
    nameRu: 'Легконогий полурослик',
    nameEn: 'Lightfoot Halfling',
    source: 'phb',
    kind: 'subrace',
    parentId: 'halfling',
    abilityScore: { kind: 'fixed', bonuses: { charisma: 1 } },
    size: 'small',
    speed: { walk: 25 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'halfling-naturally-stealthy',
        nameRu: 'Естественная скрытность',
        nameEn: 'Naturally Stealthy',
        descriptionRu:
          'Можете скрываться, даже если вас заслоняет только существо на размер больше вас.',
      },
    ],
  },
  {
    id: 'halfling-stout',
    nameRu: 'Коренастый полурослик',
    nameEn: 'Stout Halfling',
    source: 'phb',
    kind: 'subrace',
    parentId: 'halfling',
    abilityScore: { kind: 'fixed', bonuses: { constitution: 1 } },
    size: 'small',
    speed: { walk: 25 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'halfling-stout-resilience',
        nameRu: 'Устойчивость коренастых',
        nameEn: 'Stout Resilience',
        descriptionRu: 'Преимущество на спасброски от яда; сопротивление урону ядом.',
        effects: [
          { type: 'savingThrowAdvantage', against: 'яд' },
          { type: 'damageResistance', damageTypes: ['яд'] },
        ],
      },
    ],
  },

  // ─── Человек ───────────────────────────────────────────
  {
    id: 'human',
    nameRu: 'Человек',
    nameEn: 'Human',
    source: 'phb',
    kind: 'race',
    abilityScore: { kind: 'allPlusOne' },
    age: { matureAround: 18, lifespanAround: 100, notesRu: 'Живут менее века' },
    size: 'medium',
    sizeNotesRu: 'Рост 1.5–1.8 м',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'], choose: 1 },
    subraceIds: ['human-variant'],
    traits: [],
  },
  {
    id: 'human-variant',
    nameRu: 'Человек (вариант)',
    nameEn: 'Variant Human',
    source: 'phb',
    kind: 'variant',
    parentId: 'human',
    summaryRu: 'Вместо +1 ко всем: +1 к двум характеристикам, навык и черта.',
    abilityScore: { kind: 'chooseTwoPlusOne' },
    size: 'medium',
    speed: { walk: 30 },
    languages: { fixed: ['Общий'], choose: 1 },
    traits: [
      {
        id: 'human-variant-skills',
        nameRu: 'Навыки',
        nameEn: 'Skills',
        descriptionRu: 'Владение одним навыком на выбор.',
        effects: [{ type: 'skillChoice', count: 1 }],
      },
      {
        id: 'human-variant-feat',
        nameRu: 'Черта',
        nameEn: 'Feat',
        descriptionRu: 'Одна черта на выбор.',
        effects: [{ type: 'feat' }],
      },
    ],
  },

  // ─── Дракорождённый ────────────────────────────────────
  {
    id: 'dragonborn',
    nameRu: 'Дракорождённый',
    nameEn: 'Dragonborn',
    source: 'phb',
    kind: 'race',
    abilityScore: { kind: 'fixed', bonuses: { strength: 2, charisma: 1 } },
    age: { matureAround: 15, lifespanAround: 80 },
    size: 'medium',
    sizeNotesRu: 'Рост 1.8–2.1 м',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Драконий'] },
    traits: [
      {
        id: 'dragonborn-ancestry',
        nameRu: 'Драконье происхождение',
        nameEn: 'Draconic Ancestry',
        descriptionRu:
          'Выберите тип дракона: он определяет тип урона оружия дыхания и сопротивление.',
        effects: [
          {
            type: 'choice',
            id: 'draconic-ancestry',
            nameRu: 'Тип дракона',
            options: [
              {
                id: 'black',
                labelRu: 'Чёрный (кислота, линия 30×5)',
                effects: [{ type: 'damageResistance', damageTypes: ['кислота'] }],
              },
              {
                id: 'blue',
                labelRu: 'Синий (молния, линия 30×5)',
                effects: [{ type: 'damageResistance', damageTypes: ['молния'] }],
              },
              {
                id: 'brass',
                labelRu: 'Латунный (огонь, линия 30×5)',
                effects: [{ type: 'damageResistance', damageTypes: ['огонь'] }],
              },
              {
                id: 'bronze',
                labelRu: 'Бронзовый (молния, линия 30×5)',
                effects: [{ type: 'damageResistance', damageTypes: ['молния'] }],
              },
              {
                id: 'copper',
                labelRu: 'Медный (кислота, линия 30×5)',
                effects: [{ type: 'damageResistance', damageTypes: ['кислота'] }],
              },
              {
                id: 'gold',
                labelRu: 'Золотой (огонь, конус 15)',
                effects: [{ type: 'damageResistance', damageTypes: ['огонь'] }],
              },
              {
                id: 'green',
                labelRu: 'Зелёный (яд, конус 15)',
                effects: [{ type: 'damageResistance', damageTypes: ['яд'] }],
              },
              {
                id: 'red',
                labelRu: 'Красный (огонь, конус 15)',
                effects: [{ type: 'damageResistance', damageTypes: ['огонь'] }],
              },
              {
                id: 'silver',
                labelRu: 'Серебряный (холод, конус 15)',
                effects: [{ type: 'damageResistance', damageTypes: ['холод'] }],
              },
              {
                id: 'white',
                labelRu: 'Белый (холод, конус 15)',
                effects: [{ type: 'damageResistance', damageTypes: ['холод'] }],
              },
            ],
          },
        ],
      },
      {
        id: 'dragonborn-breath',
        nameRu: 'Оружие дыхания',
        nameEn: 'Breath Weapon',
        descriptionRu:
          'Действием выдыхаете энергию (конус 15 фт или линия 30×5 фт). Спасбросок Ловкости (Сл = 8 + бонус мастерства + модификатор Телосложения). Урон 2d6 (половина при успехе); +1d6 на 5, 11 и 17 уровнях. 1/короткий отдых.',
      },
      {
        id: 'dragonborn-resistance',
        nameRu: 'Сопротивление урону',
        nameEn: 'Damage Resistance',
        descriptionRu: 'Сопротивление типу урона вашего драконьего происхождения.',
      },
    ],
  },

  // ─── Гном ──────────────────────────────────────────────
  {
    id: 'gnome',
    nameRu: 'Гном',
    nameEn: 'Gnome',
    source: 'phb',
    kind: 'race',
    abilityScore: { kind: 'fixed', bonuses: { intelligence: 2 } },
    age: {
      matureAround: 40,
      lifespanAround: 400,
      notesRu: 'Живут около 350–425 лет',
    },
    size: 'small',
    sizeNotesRu: 'Рост 0.9–1.2 м',
    speed: { walk: 25 },
    languages: { fixed: ['Общий', 'Гномий'] },
    subraceIds: ['gnome-forest', 'gnome-rock'],
    traits: [
      {
        id: 'gnome-darkvision',
        nameRu: 'Тёмное зрение',
        nameEn: 'Darkvision',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'gnome-cunning',
        nameRu: 'Гномья хитрость',
        nameEn: 'Gnome Cunning',
        descriptionRu:
          'Преимущество на все спасброски Интеллекта, Мудрости и Харизмы против магии.',
        effects: [{ type: 'savingThrowAdvantage', against: 'магия (Инт/Мдр/Хар)' }],
      },
    ],
  },
  {
    id: 'gnome-forest',
    nameRu: 'Лесной гном',
    nameEn: 'Forest Gnome',
    source: 'phb',
    kind: 'subrace',
    parentId: 'gnome',
    abilityScore: { kind: 'fixed', bonuses: { dexterity: 1 } },
    size: 'small',
    speed: { walk: 25 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'gnome-forest-illusion',
        nameRu: 'Природная иллюзия',
        nameEn: 'Natural Illusionist',
        descriptionRu: 'Заговор «Малая иллюзия». Интеллект — базовая характеристика.',
        effects: [
          {
            type: 'cantrip',
            spellRu: 'Малая иллюзия',
            spellEn: 'Minor Illusion',
            ability: 'intelligence',
          },
        ],
      },
      {
        id: 'gnome-speak-animals',
        nameRu: 'Разговор с маленькими зверями',
        nameEn: 'Speak with Small Beasts',
        descriptionRu:
          'Можете общаться простыми идеями с Маленькими и меньшими зверями через звуки и жесты.',
      },
    ],
  },
  {
    id: 'gnome-rock',
    nameRu: 'Скальный гном',
    nameEn: 'Rock Gnome',
    source: 'phb',
    kind: 'subrace',
    parentId: 'gnome',
    abilityScore: { kind: 'fixed', bonuses: { constitution: 1 } },
    size: 'small',
    speed: { walk: 25 },
    languages: { fixed: [] },
    traits: [
      {
        id: 'gnome-artificer-lore',
        nameRu: 'Ремесленные знания',
        nameEn: "Artificer's Lore",
        descriptionRu:
          'При проверке Интеллекта (История), связанной с магическими, алхимическими или технологическими предметами, добавляйте удвоенный бонус мастерства.',
      },
      {
        id: 'gnome-tinker',
        nameRu: 'Конструктор',
        nameEn: 'Tinker',
        descriptionRu:
          'Владение инструментами ремонтника. Можете создавать крошечные механические устройства (зажигалка, музыкальная шкатулка, заводная игрушка).',
        effects: [{ type: 'toolProficiency', tools: ['инструменты ремонтника'] }],
      },
    ],
  },

  // ─── Полуэльф ──────────────────────────────────────────
  {
    id: 'half-elf',
    nameRu: 'Полуэльф',
    nameEn: 'Half-Elf',
    source: 'phb',
    kind: 'race',
    abilityScore: {
      kind: 'custom',
      bonuses: { charisma: 2 },
      notesRu: '+2 Харизма, +1 к двум другим характеристикам на выбор',
    },
    age: { matureAround: 20, lifespanAround: 180 },
    size: 'medium',
    sizeNotesRu: 'Рост 1.5–1.8 м',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Эльфийский'], choose: 1 },
    traits: [
      {
        id: 'half-elf-darkvision',
        nameRu: 'Тёмное зрение',
        nameEn: 'Darkvision',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'half-elf-fey-ancestry',
        nameRu: 'Фейское происхождение',
        nameEn: 'Fey Ancestry',
        descriptionRu:
          'Преимущество на спасброски от очарования; магия не может вас усыпить.',
        effects: [{ type: 'savingThrowAdvantage', against: 'очарование' }],
      },
      {
        id: 'half-elf-skill-versatility',
        nameRu: 'Универсальность навыков',
        nameEn: 'Skill Versatility',
        descriptionRu: 'Владение двумя навыками на выбор.',
        effects: [{ type: 'skillChoice', count: 2 }],
      },
    ],
  },

  // ─── Полуорк ───────────────────────────────────────────
  {
    id: 'half-orc',
    nameRu: 'Полуорк',
    nameEn: 'Half-Orc',
    source: 'phb',
    kind: 'race',
    abilityScore: { kind: 'fixed', bonuses: { strength: 2, constitution: 1 } },
    age: { matureAround: 14, lifespanAround: 75 },
    size: 'medium',
    sizeNotesRu: 'Рост 1.8–2.1 м',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Орочий'] },
    traits: [
      {
        id: 'half-orc-darkvision',
        nameRu: 'Тёмное зрение',
        nameEn: 'Darkvision',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'half-orc-menacing',
        nameRu: 'Запугивание',
        nameEn: 'Menacing',
        descriptionRu: 'Владение навыком «Запугивание».',
        effects: [{ type: 'skillProficiency', skills: ['intimidation'] }],
      },
      {
        id: 'half-orc-relentless',
        nameRu: 'Неутомимая выносливость',
        nameEn: 'Relentless Endurance',
        descriptionRu:
          'При падении до 0 хитов, но не смерти на месте, можете вместо этого остаться с 1 хитом (1/длинный отдых).',
      },
      {
        id: 'half-orc-savage',
        nameRu: 'Свирепые атаки',
        nameEn: 'Savage Attacks',
        descriptionRu:
          'При критическом попадании рукопашным оружием бросаете одну из костей урона оружия ещё раз и добавляете к урону.',
      },
    ],
  },

  // ─── Тифлинг ───────────────────────────────────────────
  {
    id: 'tiefling',
    nameRu: 'Тифлинг',
    nameEn: 'Tiefling',
    source: 'phb',
    kind: 'race',
    abilityScore: { kind: 'fixed', bonuses: { intelligence: 1, charisma: 2 } },
    age: { matureAround: 18, lifespanAround: 100 },
    size: 'medium',
    sizeNotesRu: 'Рост 1.5–1.8 м',
    speed: { walk: 30 },
    languages: { fixed: ['Общий', 'Инфернальный'] },
    traits: [
      {
        id: 'tiefling-darkvision',
        nameRu: 'Тёмное зрение',
        nameEn: 'Darkvision',
        descriptionRu: 'Тёмное зрение 60 футов.',
        effects: [{ type: 'darkvision', feet: 60 }],
      },
      {
        id: 'tiefling-hellish-resistance',
        nameRu: 'Адское сопротивление',
        nameEn: 'Hellish Resistance',
        descriptionRu: 'Сопротивление урону огнём.',
        effects: [{ type: 'damageResistance', damageTypes: ['огонь'] }],
      },
      {
        id: 'tiefling-infernal-legacy',
        nameRu: 'Адское наследие',
        nameEn: 'Infernal Legacy',
        descriptionRu:
          'Заговор «Чудотворство». На 3 уровне — «Адское возмездие», на 5 уровне — «Тьма» (каждый 1/длинный отдых). Харизма — базовая характеристика.',
        effects: [
          { type: 'cantrip', spellRu: 'Чудотворство', spellEn: 'Thaumaturgy', ability: 'charisma' },
          {
            type: 'spell',
            spellRu: 'Адское возмездие',
            spellEn: 'Hellish Rebuke',
            fromLevel: 3,
            uses: '1/длинный отдых',
            ability: 'charisma',
          },
          {
            type: 'spell',
            spellRu: 'Тьма',
            spellEn: 'Darkness',
            fromLevel: 5,
            uses: '1/длинный отдых',
            ability: 'charisma',
          },
        ],
      },
    ],
  },
];
