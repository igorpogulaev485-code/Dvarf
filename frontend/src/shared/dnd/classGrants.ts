/** PHB 2014 class starting package + multiclass proficiency grants (no class features). */

import type { HitDie } from './hitDice'
import { CLASS_HIT_DIE, resolveClassSlug } from './multiclassRules'

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type ArmorProfKey = 'light' | 'medium' | 'heavy' | 'shields'
export type WeaponProfKey = 'simple' | 'martial'

export type SkillChoice = {
  count: number
  /** Skill keys from sheetTypes; 'any' = any skill (bard multiclass). */
  from: string[] | 'any'
}

export type ToolChoice = {
  count: number
  from: string[]
}

export type ClassProficiencyPackage = {
  saves: AbilityKey[]
  armor: ArmorProfKey[]
  weapons: WeaponProfKey[]
  skillChoices: SkillChoice | null
  toolsFixed: string[]
  toolChoices: ToolChoice | null
}

export type ClassGrantDef = {
  slug: string
  labelRu: string
  hitDie: HitDie
  start: ClassProficiencyPackage
  multiclass: ClassProficiencyPackage
  /** When set (e.g. from catalog.data), preferred over CLASS_STARTING_EQUIPMENT. */
  equipment?: StartingEquipmentPackage[]
}

export type StartingGearItem = {
  name: string
  qty?: number
  armor_kind?: 'none' | 'light' | 'medium' | 'heavy' | 'shield'
  base_ac?: number | null
  weight_lb?: number | null
  notes?: string
}

export type StartingEquipmentPackage = {
  id: string
  labelRu: string
  /** Short list shown under the radio. */
  summary: string
  items: StartingGearItem[]
  coinsGp?: number
}

function gear(
  id: string,
  labelRu: string,
  summary: string,
  items: StartingGearItem[],
  coinsGp?: number,
): StartingEquipmentPackage {
  return { id, labelRu, summary, items, coinsGp }
}

function item(
  name: string,
  extra?: Partial<StartingGearItem>,
): StartingGearItem {
  return { name, qty: 1, armor_kind: 'none', ...extra }
}

/** Simplified PHB 2014 starting equipment forks (RU labels). */
export const CLASS_STARTING_EQUIPMENT: Record<string, StartingEquipmentPackage[]> = {
  barbarian: [
    gear('a', 'Вариант A', 'Секира + 2 ручных топора + набор исследователя + 4 метательных копья', [
      item('Секира'),
      item('Ручной топор', { qty: 2 }),
      item('Набор исследователя'),
      item('Метательное копьё', { qty: 4 }),
    ]),
    gear('b', 'Вариант B · длинный меч', 'Воинское оружие (длинный меч) + щит + набор исследователя + 4 копья', [
      item('Длинный меч'),
      item('Щит', { armor_kind: 'shield', base_ac: 2, weight_lb: 6 }),
      item('Набор исследователя'),
      item('Метательное копьё', { qty: 4 }),
    ]),
    gear('b2', 'Вариант B · боевой топор', 'Воинское оружие (боевой топор) + щит + набор исследователя + 4 копья', [
      item('Боевой топор'),
      item('Щит', { armor_kind: 'shield', base_ac: 2, weight_lb: 6 }),
      item('Набор исследователя'),
      item('Метательное копьё', { qty: 4 }),
    ]),
    gear('gold', 'Золото', '2к4×10 зм вместо снаряжения (на старте: 50 зм)', [], 50),
  ],
  bard: [
    gear('a', 'Вариант A', 'Рапира + дипломатский набор + лютня + кожаный доспех + кинжал', [
      item('Рапира'),
      item('Набор дипломата'),
      item('Лютня'),
      item('Кожаный доспех', { armor_kind: 'light', base_ac: 11, weight_lb: 10 }),
      item('Кинжал'),
    ]),
    gear('b', 'Вариант B', 'Длинный меч + артистский набор + лютня + кожаный + кинжал', [
      item('Длинный меч'),
      item('Набор артиста'),
      item('Лютня'),
      item('Кожаный доспех', { armor_kind: 'light', base_ac: 11, weight_lb: 10 }),
      item('Кинжал'),
    ]),
    gear('gold', 'Золото', '5к4×10 зм (на старте: 125 зм)', [], 125),
  ],
  cleric: [
    gear('a', 'Вариант A', 'Булава + чешуйчатый + лёгкий арбалет + священный символ + набор жреца', [
      item('Булава'),
      item('Чешуйчатый доспех', { armor_kind: 'medium', base_ac: 14, weight_lb: 45 }),
      item('Лёгкий арбалет'),
      item('Болты арбалета', { qty: 20 }),
      item('Священный символ'),
      item('Набор жреца'),
    ]),
    gear('b', 'Вариант B', 'Боевой молот + кольчуга + щит + священный символ + набор жреца', [
      item('Боевой молот'),
      item('Кольчуга', { armor_kind: 'heavy', base_ac: 16, weight_lb: 55 }),
      item('Щит', { armor_kind: 'shield', base_ac: 2, weight_lb: 6 }),
      item('Священный символ'),
      item('Набор жреца'),
    ]),
    gear('gold', 'Золото', '5к4×10 зм (на старте: 125 зм)', [], 125),
  ],
  druid: [
    gear('a', 'Вариант A', 'Щит + ятаган + кожаный + набор исследователя + фокус друида', [
      item('Щит', { armor_kind: 'shield', base_ac: 2, weight_lb: 6 }),
      item('Ятаган'),
      item('Кожаный доспех', { armor_kind: 'light', base_ac: 11, weight_lb: 10 }),
      item('Набор исследователя'),
      item('Фокус друида'),
    ]),
    gear('b', 'Вариант B', 'Деревянный щит + простая дубинка + кожаный + набор травника + фокус', [
      item('Щит', { armor_kind: 'shield', base_ac: 2, weight_lb: 6, notes: 'деревянный' }),
      item('Дубинка'),
      item('Кожаный доспех', { armor_kind: 'light', base_ac: 11, weight_lb: 10 }),
      item('Набор травника'),
      item('Фокус друида'),
    ]),
    gear('gold', 'Золото', '2к4×10 зм (на старте: 50 зм)', [], 50),
  ],
  fighter: [
    gear('a', 'Вариант A · меч и щит', 'Кольчуга + длинный меч + щит + лёгкий арбалет + набор исследователя', [
      item('Кольчуга', { armor_kind: 'heavy', base_ac: 16, weight_lb: 55 }),
      item('Длинный меч'),
      item('Щит', { armor_kind: 'shield', base_ac: 2, weight_lb: 6 }),
      item('Лёгкий арбалет'),
      item('Болты арбалета', { qty: 20 }),
      item('Набор исследователя'),
    ]),
    gear('a2', 'Вариант A · два оружия', 'Кольчуга + два длинных меча + лёгкий арбалет + набор исследователя', [
      item('Кольчуга', { armor_kind: 'heavy', base_ac: 16, weight_lb: 55 }),
      item('Длинный меч', { qty: 2 }),
      item('Лёгкий арбалет'),
      item('Болты арбалета', { qty: 20 }),
      item('Набор исследователя'),
    ]),
    gear('b', 'Вариант B · лучник', 'Кожаный + длинный лук + два длинных меча + набор исследователя', [
      item('Кожаный доспех', { armor_kind: 'light', base_ac: 11, weight_lb: 10 }),
      item('Длинный лук'),
      item('Стрелы', { qty: 20 }),
      item('Длинный меч', { qty: 2 }),
      item('Набор исследователя'),
    ]),
    gear('b2', 'Вариант B · топоры', 'Кожаный + длинный лук + два ручных топора + набор исследователя', [
      item('Кожаный доспех', { armor_kind: 'light', base_ac: 11, weight_lb: 10 }),
      item('Длинный лук'),
      item('Стрелы', { qty: 20 }),
      item('Ручной топор', { qty: 2 }),
      item('Набор исследователя'),
    ]),
    gear('gold', 'Золото', '5к4×10 зм (на старте: 125 зм)', [], 125),
  ],
  monk: [
    gear('a', 'Вариант A', 'Короткий меч + набор исследователя + 10 дротиков', [
      item('Короткий меч'),
      item('Набор исследователя'),
      item('Дротик', { qty: 10 }),
    ]),
    gear('b', 'Вариант B', 'Простая дубинка + набор исследователя + 10 дротиков', [
      item('Дубинка'),
      item('Набор исследователя'),
      item('Дротик', { qty: 10 }),
    ]),
    gear('gold', 'Золото', '5к4 зм (на старте: 12 зм)', [], 12),
  ],
  paladin: [
    gear('a', 'Вариант A', 'Длинный меч + щит + 5 метательных копий + кольчуга + священный символ + набор жреца', [
      item('Длинный меч'),
      item('Щит', { armor_kind: 'shield', base_ac: 2, weight_lb: 6 }),
      item('Метательное копьё', { qty: 5 }),
      item('Кольчуга', { armor_kind: 'heavy', base_ac: 16, weight_lb: 55 }),
      item('Священный символ'),
      item('Набор жреца'),
    ]),
    gear('b', 'Вариант B', 'Боевой молот + щит + лёгкий арбалет + кольчуга + священный символ + набор исследователя', [
      item('Боевой молот'),
      item('Щит', { armor_kind: 'shield', base_ac: 2, weight_lb: 6 }),
      item('Лёгкий арбалет'),
      item('Болты арбалета', { qty: 20 }),
      item('Кольчуга', { armor_kind: 'heavy', base_ac: 16, weight_lb: 55 }),
      item('Священный символ'),
      item('Набор исследователя'),
    ]),
    gear('gold', 'Золото', '5к4×10 зм (на старте: 125 зм)', [], 125),
  ],
  ranger: [
    gear('a', 'Вариант A', 'Чешуйчатый + 2 коротких меча + длинный лук + набор исследователя', [
      item('Чешуйчатый доспех', { armor_kind: 'medium', base_ac: 14, weight_lb: 45 }),
      item('Короткий меч', { qty: 2 }),
      item('Длинный лук'),
      item('Стрелы', { qty: 20 }),
      item('Набор исследователя'),
    ]),
    gear('b', 'Вариант B', 'Кожаный + 2 коротких меча + длинный лук + набор исследователя', [
      item('Кожаный доспех', { armor_kind: 'light', base_ac: 11, weight_lb: 10 }),
      item('Короткий меч', { qty: 2 }),
      item('Длинный лук'),
      item('Стрелы', { qty: 20 }),
      item('Набор исследователя'),
    ]),
    gear('gold', 'Золото', '5к4×10 зм (на старте: 125 зм)', [], 125),
  ],
  rogue: [
    gear('a', 'Вариант A', 'Рапира + короткий лук + набор взломщика + кожаный + 2 кинжала + воровские инструменты', [
      item('Рапира'),
      item('Короткий лук'),
      item('Стрелы', { qty: 20 }),
      item('Набор взломщика'),
      item('Кожаный доспех', { armor_kind: 'light', base_ac: 11, weight_lb: 10 }),
      item('Кинжал', { qty: 2 }),
      item('Воровские инструменты'),
    ]),
    gear('b', 'Вариант B', 'Короткий меч + короткий лук + набор исследователя + кожаный + 2 кинжала + воровские инструменты', [
      item('Короткий меч'),
      item('Короткий лук'),
      item('Стрелы', { qty: 20 }),
      item('Набор исследователя'),
      item('Кожаный доспех', { armor_kind: 'light', base_ac: 11, weight_lb: 10 }),
      item('Кинжал', { qty: 2 }),
      item('Воровские инструменты'),
    ]),
    gear('gold', 'Золото', '4к4×10 зм (на старте: 100 зм)', [], 100),
  ],
  sorcerer: [
    gear('a', 'Вариант A', 'Лёгкий арбалет + компонентская сумка + набор исследователя + 2 кинжала', [
      item('Лёгкий арбалет'),
      item('Болты арбалета', { qty: 20 }),
      item('Сумка с компонентами'),
      item('Набор исследователя'),
      item('Кинжал', { qty: 2 }),
    ]),
    gear('b', 'Вариант B', 'Боевой посох + фокус заклинателя + набор исследователя + 2 кинжала', [
      item('Боевой посох'),
      item('Магический фокус'),
      item('Набор исследователя'),
      item('Кинжал', { qty: 2 }),
    ]),
    gear('gold', 'Золото', '3к4×10 зм (на старте: 75 зм)', [], 75),
  ],
  warlock: [
    gear('a', 'Вариант A', 'Лёгкий арбалет + компонентская сумка + кожаный + простое оружие + набор учёного + 2 кинжала', [
      item('Лёгкий арбалет'),
      item('Болты арбалета', { qty: 20 }),
      item('Сумка с компонентами'),
      item('Кожаный доспех', { armor_kind: 'light', base_ac: 11, weight_lb: 10 }),
      item('Боевой посох'),
      item('Набор учёного'),
      item('Кинжал', { qty: 2 }),
    ]),
    gear('b', 'Вариант B', 'Боевой посох + фокус + кожаный + набор исследователя + 2 кинжала', [
      item('Боевой посох'),
      item('Магический фокус'),
      item('Кожаный доспех', { armor_kind: 'light', base_ac: 11, weight_lb: 10 }),
      item('Набор исследователя'),
      item('Кинжал', { qty: 2 }),
    ]),
    gear('gold', 'Золото', '4к4×10 зм (на старте: 100 зм)', [], 100),
  ],
  wizard: [
    gear('a', 'Вариант A', 'Боевой посох + компонентская сумка + набор учёного + книга заклинаний', [
      item('Боевой посох'),
      item('Сумка с компонентами'),
      item('Набор учёного'),
      item('Книга заклинаний'),
    ]),
    gear('b', 'Вариант B', 'Кинжал + фокус + набор исследователя + книга заклинаний', [
      item('Кинжал'),
      item('Магический фокус'),
      item('Набор исследователя'),
      item('Книга заклинаний'),
    ]),
    gear('gold', 'Золото', '4к4×10 зм (на старте: 100 зм)', [], 100),
  ],
  artificer: [
    gear(
      'a',
      'Вариант A',
      '2 простых оружия + лёгкий арбалет + клёпаный кожаный + воровские + набор исследователя',
      [
        item('Боевой посох'),
        item('Кинжал'),
        item('Лёгкий арбалет'),
        item('Болты арбалета', { qty: 20 }),
        item('Клёпаный кожаный доспех', { armor_kind: 'light', base_ac: 12, weight_lb: 13 }),
        item('Воровские инструменты'),
        item('Набор исследователя'),
      ],
    ),
    gear(
      'b',
      'Вариант B',
      '2 простых оружия + лёгкий арбалет + чешуйчатый + воровские + набор исследователя',
      [
        item('Боевой посох'),
        item('Кинжал'),
        item('Лёгкий арбалет'),
        item('Болты арбалета', { qty: 20 }),
        item('Чешуйчатый доспех', { armor_kind: 'medium', base_ac: 14, weight_lb: 45 }),
        item('Воровские инструменты'),
        item('Набор исследователя'),
      ],
    ),
    gear('gold', 'Золото', '5к4×10 зм (на старте: 125 зм)', [], 125),
  ],
}

export function startingEquipmentFor(slug: string): StartingEquipmentPackage[] {
  return CLASS_STARTING_EQUIPMENT[slug] ?? []
}

/** Prefer packages attached to a resolved def (catalog), else local fallback. */
export function equipmentPackagesFor(def: ClassGrantDef): StartingEquipmentPackage[] {
  if (def.equipment && def.equipment.length > 0) return def.equipment
  return startingEquipmentFor(def.slug)
}

/** Common artisan tools (PHB) for monk tool choice. */
export const ARTISAN_TOOL_CHOICES = [
  'Инструменты пивовара',
  'Инструменты каллиграфа',
  'Инструменты плотника',
  'Инструменты картографа',
  'Инструменты сапожника',
  'Инструменты повара',
  'Инструменты стеклодува',
  'Инструменты ювелира',
  'Инструменты кожевника',
  'Инструменты каменщика',
  'Инструменты художника',
  'Инструменты гончара',
  'Инструменты кузнеца',
  'Инструменты жестянщика',
  'Инструменты ткача',
  'Инструменты резчика',
]

export const MUSICAL_INSTRUMENT_CHOICES = [
  'Волынка',
  'Барабан',
  'Цимбалы',
  'Флейта',
  'Лютня',
  'Лира',
  'Рожок',
  'Свирель',
  'Виола',
  'Шалмей',
]

const ALL_SKILL_KEYS = [
  'acrobatics',
  'animal_handling',
  'arcana',
  'athletics',
  'deception',
  'history',
  'insight',
  'intimidation',
  'investigation',
  'medicine',
  'nature',
  'perception',
  'performance',
  'persuasion',
  'religion',
  'sleight_of_hand',
  'stealth',
  'survival',
]

function pkg(
  partial: Partial<ClassProficiencyPackage> &
    Pick<ClassProficiencyPackage, 'saves' | 'armor' | 'weapons'>,
): ClassProficiencyPackage {
  return {
    saves: partial.saves,
    armor: partial.armor,
    weapons: partial.weapons,
    skillChoices: partial.skillChoices ?? null,
    toolsFixed: partial.toolsFixed ?? [],
    toolChoices: partial.toolChoices ?? null,
  }
}

/** Full PHB 2014 class grant tables (proficiencies / skills / tools / hit die only). */
export const CLASS_GRANT_DEFS: Record<string, ClassGrantDef> = {
  barbarian: {
    slug: 'barbarian',
    labelRu: 'Варвар',
    hitDie: 'd12',
    start: pkg({
      saves: ['str', 'con'],
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple', 'martial'],
      skillChoices: {
        count: 2,
        from: [
          'animal_handling',
          'athletics',
          'intimidation',
          'nature',
          'perception',
          'survival',
        ],
      },
    }),
    multiclass: pkg({
      saves: [],
      armor: ['shields'],
      weapons: ['simple', 'martial'],
    }),
  },
  bard: {
    slug: 'bard',
    labelRu: 'Бард',
    hitDie: 'd8',
    start: pkg({
      saves: ['dex', 'cha'],
      armor: ['light'],
      weapons: ['simple'],
      skillChoices: {
        count: 3,
        from: 'any',
      },
      toolChoices: { count: 3, from: MUSICAL_INSTRUMENT_CHOICES },
    }),
    multiclass: pkg({
      saves: [],
      armor: ['light'],
      weapons: [],
      skillChoices: { count: 1, from: 'any' },
      toolChoices: { count: 1, from: MUSICAL_INSTRUMENT_CHOICES },
    }),
  },
  cleric: {
    slug: 'cleric',
    labelRu: 'Жрец',
    hitDie: 'd8',
    start: pkg({
      saves: ['wis', 'cha'],
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple'],
      skillChoices: {
        count: 2,
        from: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
      },
    }),
    multiclass: pkg({
      saves: [],
      armor: ['light', 'medium', 'shields'],
      weapons: [],
    }),
  },
  druid: {
    slug: 'druid',
    labelRu: 'Друид',
    hitDie: 'd8',
    start: pkg({
      saves: ['int', 'wis'],
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple'],
      skillChoices: {
        count: 2,
        from: [
          'arcana',
          'animal_handling',
          'insight',
          'medicine',
          'nature',
          'perception',
          'religion',
          'survival',
        ],
      },
      toolsFixed: ['Набор травника'],
    }),
    multiclass: pkg({
      saves: [],
      armor: ['light', 'medium', 'shields'],
      weapons: [],
    }),
  },
  fighter: {
    slug: 'fighter',
    labelRu: 'Воин',
    hitDie: 'd10',
    start: pkg({
      saves: ['str', 'con'],
      armor: ['light', 'medium', 'heavy', 'shields'],
      weapons: ['simple', 'martial'],
      skillChoices: {
        count: 2,
        from: [
          'acrobatics',
          'animal_handling',
          'athletics',
          'history',
          'insight',
          'intimidation',
          'perception',
          'survival',
        ],
      },
    }),
    multiclass: pkg({
      saves: [],
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple', 'martial'],
    }),
  },
  monk: {
    slug: 'monk',
    labelRu: 'Монах',
    hitDie: 'd8',
    start: pkg({
      saves: ['str', 'dex'],
      armor: [],
      weapons: ['simple'],
      skillChoices: {
        count: 2,
        from: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
      },
      toolChoices: {
        count: 1,
        from: [...ARTISAN_TOOL_CHOICES, ...MUSICAL_INSTRUMENT_CHOICES],
      },
    }),
    multiclass: pkg({
      saves: [],
      armor: [],
      weapons: ['simple'],
    }),
  },
  paladin: {
    slug: 'paladin',
    labelRu: 'Паладин',
    hitDie: 'd10',
    start: pkg({
      saves: ['wis', 'cha'],
      armor: ['light', 'medium', 'heavy', 'shields'],
      weapons: ['simple', 'martial'],
      skillChoices: {
        count: 2,
        from: [
          'athletics',
          'insight',
          'intimidation',
          'medicine',
          'persuasion',
          'religion',
        ],
      },
    }),
    multiclass: pkg({
      saves: [],
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple', 'martial'],
    }),
  },
  ranger: {
    slug: 'ranger',
    labelRu: 'Следопыт',
    hitDie: 'd10',
    start: pkg({
      saves: ['str', 'dex'],
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple', 'martial'],
      skillChoices: {
        count: 3,
        from: [
          'animal_handling',
          'athletics',
          'insight',
          'investigation',
          'nature',
          'perception',
          'stealth',
          'survival',
        ],
      },
    }),
    multiclass: pkg({
      saves: [],
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple', 'martial'],
      skillChoices: {
        count: 1,
        from: [
          'animal_handling',
          'athletics',
          'insight',
          'investigation',
          'nature',
          'perception',
          'stealth',
          'survival',
        ],
      },
    }),
  },
  rogue: {
    slug: 'rogue',
    labelRu: 'Плут',
    hitDie: 'd8',
    start: pkg({
      saves: ['dex', 'int'],
      armor: ['light'],
      weapons: ['simple'],
      skillChoices: {
        count: 4,
        from: [
          'acrobatics',
          'athletics',
          'deception',
          'insight',
          'intimidation',
          'investigation',
          'perception',
          'performance',
          'persuasion',
          'sleight_of_hand',
          'stealth',
        ],
      },
      toolsFixed: ['Воровские инструменты'],
    }),
    multiclass: pkg({
      saves: [],
      armor: ['light'],
      weapons: [],
      skillChoices: {
        count: 1,
        from: [
          'acrobatics',
          'athletics',
          'deception',
          'insight',
          'intimidation',
          'investigation',
          'perception',
          'performance',
          'persuasion',
          'sleight_of_hand',
          'stealth',
        ],
      },
      toolsFixed: ['Воровские инструменты'],
    }),
  },
  sorcerer: {
    slug: 'sorcerer',
    labelRu: 'Чародей',
    hitDie: 'd6',
    start: pkg({
      saves: ['con', 'cha'],
      armor: [],
      weapons: ['simple'],
      skillChoices: {
        count: 2,
        from: [
          'arcana',
          'deception',
          'insight',
          'intimidation',
          'persuasion',
          'religion',
        ],
      },
    }),
    multiclass: pkg({
      saves: [],
      armor: [],
      weapons: [],
    }),
  },
  warlock: {
    slug: 'warlock',
    labelRu: 'Колдун',
    hitDie: 'd8',
    start: pkg({
      saves: ['wis', 'cha'],
      armor: ['light'],
      weapons: ['simple'],
      skillChoices: {
        count: 2,
        from: [
          'arcana',
          'deception',
          'history',
          'intimidation',
          'investigation',
          'nature',
          'religion',
        ],
      },
    }),
    multiclass: pkg({
      saves: [],
      armor: ['light'],
      weapons: ['simple'],
    }),
  },
  wizard: {
    slug: 'wizard',
    labelRu: 'Волшебник',
    hitDie: 'd6',
    start: pkg({
      saves: ['int', 'wis'],
      armor: [],
      weapons: ['simple'],
      skillChoices: {
        count: 2,
        from: [
          'arcana',
          'history',
          'insight',
          'investigation',
          'medicine',
          'religion',
        ],
      },
    }),
    multiclass: pkg({
      saves: [],
      armor: [],
      weapons: [],
    }),
  },
  artificer: {
    slug: 'artificer',
    labelRu: 'Изобретатель',
    hitDie: 'd8',
    start: pkg({
      saves: ['con', 'int'],
      armor: ['light', 'medium', 'shields'],
      weapons: ['simple'],
      skillChoices: {
        count: 2,
        from: [
          'arcana',
          'history',
          'investigation',
          'medicine',
          'nature',
          'perception',
          'sleight_of_hand',
        ],
      },
      toolsFixed: ['Воровские инструменты', 'Инструменты ремонтника'],
      toolChoices: { count: 1, from: [...ARTISAN_TOOL_CHOICES] },
    }),
    multiclass: pkg({
      saves: [],
      armor: ['light', 'medium', 'shields'],
      weapons: [],
      toolsFixed: ['Воровские инструменты', 'Инструменты ремонтника'],
    }),
  },
}

export type AppliedClassGrant = {
  classEntryId: string
  slug: string
  mode: 'start' | 'multiclass'
  saves: AbilityKey[]
  skills: string[]
  tools: string[]
  armorKeys: ArmorProfKey[]
  weaponKeys: WeaponProfKey[]
  /** HP set at character level 1 from max hit die + CON (start only). */
  level1Hp: number | null
  equipmentPackageId: string | null
  equipmentItemIds: string[]
  /** Attack cards created from starting weapons (revoke with the package). */
  equipmentAttackIds: string[]
  equipmentCoinsGp: number
}

export type ClassGrantPicks = {
  skills: string[]
  tools: string[]
  /** Required for start mode when class has packages; 'skip' = без снаряжения. */
  equipmentPackageId: string | null
}

export function classGrantDef(slug: string | null | undefined): ClassGrantDef | null {
  if (!slug) return null
  return CLASS_GRANT_DEFS[slug] ?? null
}

export function classGrantDefFromName(className: string): ClassGrantDef | null {
  return classGrantDef(resolveClassSlug(className))
}

function isAbilityKey(value: unknown): value is AbilityKey {
  return (
    value === 'str' ||
    value === 'dex' ||
    value === 'con' ||
    value === 'int' ||
    value === 'wis' ||
    value === 'cha'
  )
}

function isArmorProfKey(value: unknown): value is ArmorProfKey {
  return (
    value === 'light' ||
    value === 'medium' ||
    value === 'heavy' ||
    value === 'shields'
  )
}

function parseArmorList(raw: unknown): ArmorProfKey[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isArmorProfKey)
}

function parseWeaponKeys(raw: unknown): WeaponProfKey[] {
  if (!raw || typeof raw !== 'object') return []
  const row = raw as Record<string, unknown>
  const keys: WeaponProfKey[] = []
  if (row.simple === true) keys.push('simple')
  if (row.martial === true) keys.push('martial')
  return keys
}

function parseSkillChoice(raw: unknown): SkillChoice | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const count = typeof row.count === 'number' ? Math.max(0, Math.floor(row.count)) : 0
  if (count <= 0) return null
  if (row.from_any === true || row.from === 'any') {
    return { count, from: 'any' }
  }
  if (Array.isArray(row.from)) {
    const from = row.from.filter((item): item is string => typeof item === 'string')
    if (from.length === 0) return null
    return { count, from }
  }
  return null
}

function resolveToolFromToken(from: unknown): string[] | null {
  if (from === 'artisan_tools') return [...ARTISAN_TOOL_CHOICES]
  if (from === 'musical_instruments') return [...MUSICAL_INSTRUMENT_CHOICES]
  if (from === 'artisan_tools_or_musical') {
    return [...ARTISAN_TOOL_CHOICES, ...MUSICAL_INSTRUMENT_CHOICES]
  }
  if (Array.isArray(from)) {
    const list = from.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    return list.length > 0 ? list : null
  }
  return null
}

function parseToolChoice(raw: unknown): ToolChoice | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const count = typeof row.count === 'number' ? Math.max(0, Math.floor(row.count)) : 0
  if (count <= 0) return null
  const from = resolveToolFromToken(row.from)
  if (!from) return null
  return { count, from }
}

function parseStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
}

function parseSaves(raw: unknown): AbilityKey[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isAbilityKey)
}

function parseHitDie(raw: unknown): HitDie | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const asDie = `d${Math.floor(raw)}`
    return asDie === 'd6' || asDie === 'd8' || asDie === 'd10' || asDie === 'd12'
      ? asDie
      : null
  }
  if (typeof raw === 'string') {
    const normalized = raw.trim().toLowerCase()
    const withD = normalized.startsWith('d') ? normalized : `d${normalized}`
    return withD === 'd6' || withD === 'd8' || withD === 'd10' || withD === 'd12'
      ? withD
      : null
  }
  return null
}

function parseProficiencyPackage(
  data: Record<string, unknown>,
  mode: 'start' | 'multiclass',
): ClassProficiencyPackage {
  const source =
    mode === 'multiclass' &&
    data.multiclass_proficiencies &&
    typeof data.multiclass_proficiencies === 'object'
      ? (data.multiclass_proficiencies as Record<string, unknown>)
      : data

  const saves = mode === 'start' ? parseSaves(data.saving_throws) : []
  return pkg({
    saves,
    armor: parseArmorList(source.armor),
    weapons: parseWeaponKeys(source.weapons),
    skillChoices: parseSkillChoice(source.skill_choices),
    toolsFixed: parseStringList(source.tools_fixed),
    toolChoices: parseToolChoice(source.tool_choices),
  })
}

function parseArmorKind(
  raw: unknown,
): 'none' | 'light' | 'medium' | 'heavy' | 'shield' | undefined {
  if (
    raw === 'none' ||
    raw === 'light' ||
    raw === 'medium' ||
    raw === 'heavy' ||
    raw === 'shield'
  ) {
    return raw
  }
  return undefined
}

function parseStartingEquipment(raw: unknown): StartingEquipmentPackage[] {
  if (!Array.isArray(raw)) return []
  const result: StartingEquipmentPackage[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    const id = typeof row.id === 'string' ? row.id : null
    if (!id) continue
    const labelRu =
      (typeof row.label_ru === 'string' && row.label_ru) ||
      (typeof row.labelRu === 'string' && row.labelRu) ||
      id
    const summary =
      (typeof row.summary_ru === 'string' && row.summary_ru) ||
      (typeof row.summary === 'string' && row.summary) ||
      ''
    const itemsRaw = Array.isArray(row.items) ? row.items : []
    const items: StartingGearItem[] = []
    for (const spec of itemsRaw) {
      if (!spec || typeof spec !== 'object') continue
      const itemRow = spec as Record<string, unknown>
      if (typeof itemRow.name !== 'string' || !itemRow.name.trim()) continue
      items.push({
        name: itemRow.name,
        qty:
          typeof itemRow.qty === 'number' && Number.isFinite(itemRow.qty)
            ? Math.max(1, Math.floor(itemRow.qty))
            : 1,
        armor_kind: parseArmorKind(itemRow.armor_kind) ?? 'none',
        base_ac:
          typeof itemRow.base_ac === 'number' && Number.isFinite(itemRow.base_ac)
            ? itemRow.base_ac
            : null,
        weight_lb:
          typeof itemRow.weight_lb === 'number' && Number.isFinite(itemRow.weight_lb)
            ? itemRow.weight_lb
            : null,
        notes: typeof itemRow.notes === 'string' ? itemRow.notes : undefined,
      })
    }
    const coinsRaw = row.coins_gp ?? row.coinsGp
    const coinsGp =
      typeof coinsRaw === 'number' && Number.isFinite(coinsRaw)
        ? Math.max(0, Math.floor(coinsRaw))
        : undefined
    result.push(gear(id, labelRu, summary, items, coinsGp))
  }
  return result
}

/** True when catalog.data has rich class grant fields (not just hit_die). */
export function catalogHasClassGrantData(
  data: Record<string, unknown> | null | undefined,
): boolean {
  if (!data) return false
  return (
    Array.isArray(data.saving_throws) ||
    Array.isArray(data.armor) ||
    (data.weapons != null && typeof data.weapons === 'object') ||
    Array.isArray(data.starting_equipment) ||
    data.skill_choices != null ||
    data.multiclass_proficiencies != null
  )
}

/**
 * Build ClassGrantDef from catalog_entries.data (PHB/Tasha class rewrite).
 * Returns null if data lacks grant fields — caller should fall back to local defs.
 */
export function classGrantDefFromCatalog(input: {
  slug: string
  nameRu: string
  data: Record<string, unknown>
}): ClassGrantDef | null {
  if (!catalogHasClassGrantData(input.data)) return null
  const hitDie =
    parseHitDie(input.data.hit_die ?? input.data.hitDie) ??
    CLASS_HIT_DIE[input.slug] ??
    null
  if (!hitDie) return null

  const equipment = parseStartingEquipment(input.data.starting_equipment)
  return {
    slug: input.slug,
    labelRu: input.nameRu,
    hitDie,
    start: parseProficiencyPackage(input.data, 'start'),
    multiclass: parseProficiencyPackage(input.data, 'multiclass'),
    equipment: equipment.length > 0 ? equipment : undefined,
  }
}

/** Prefer catalog.data when rich; else local CLASS_GRANT_DEFS. */
export function resolveClassGrantDef(input: {
  className: string
  catalogSlug?: string | null
  catalogData?: Record<string, unknown> | null
  nameRu?: string | null
}): ClassGrantDef | null {
  const slug =
    (input.catalogSlug && input.catalogSlug.trim()) ||
    resolveClassSlug(input.className)
  const label =
    (input.nameRu && input.nameRu.trim()) ||
    input.className.trim() ||
    slug ||
    ''

  if (slug && input.catalogData && catalogHasClassGrantData(input.catalogData)) {
    const fromCatalog = classGrantDefFromCatalog({
      slug,
      nameRu: label || slug,
      data: input.catalogData,
    })
    if (fromCatalog) return fromCatalog
  }

  return classGrantDef(slug) ?? classGrantDefFromName(input.className)
}

export function packageForMode(
  def: ClassGrantDef,
  mode: 'start' | 'multiclass',
): ClassProficiencyPackage {
  return mode === 'start' ? def.start : def.multiclass
}

/** Start always opens setup (equipment forks); multiclass only if skill/tool picks. */
export function grantNeedsSetupDialog(
  def: ClassGrantDef,
  mode: 'start' | 'multiclass',
): boolean {
  if (mode === 'start') return true
  const pkg = packageForMode(def, mode)
  return grantNeedsPicks(pkg)
}

export function grantNeedsPicks(pkg: ClassProficiencyPackage): boolean {
  const skills = pkg.skillChoices?.count ?? 0
  const tools = pkg.toolChoices?.count ?? 0
  return skills > 0 || tools > 0
}

export function skillOptionsForPackage(pkg: ClassProficiencyPackage): string[] {
  if (!pkg.skillChoices) return []
  if (pkg.skillChoices.from === 'any') return [...ALL_SKILL_KEYS]
  return [...pkg.skillChoices.from]
}

export function hitDieForSlug(slug: string): HitDie | null {
  return CLASS_HIT_DIE[slug] ?? classGrantDef(slug)?.hitDie ?? null
}

export function formatClassGrantSummary(input: {
  def: ClassGrantDef
  mode: 'start' | 'multiclass'
  picks: ClassGrantPicks
}): string {
  const pkg = packageForMode(input.def, input.mode)
  const bits: string[] = []
  if (pkg.saves.length) bits.push(`сейвы ${pkg.saves.join('/').toUpperCase()}`)
  if (pkg.armor.length) bits.push(`доспехи ${pkg.armor.join(', ')}`)
  if (pkg.weapons.length) bits.push(`оружие ${pkg.weapons.join(', ')}`)
  if (input.picks.skills.length) bits.push(`навыки ×${input.picks.skills.length}`)
  const tools = [...pkg.toolsFixed, ...input.picks.tools]
  if (tools.length) bits.push(`инструменты: ${tools.join(', ')}`)
  if (input.mode === 'start' && input.picks.equipmentPackageId) {
    const pack = equipmentPackagesFor(input.def).find(
      (row) => row.id === input.picks.equipmentPackageId,
    )
    if (pack) bits.push(`снаряжение: ${pack.labelRu}`)
  }
  bits.push(`кость ${input.def.hitDie}`)
  return bits.join(' · ')
}
