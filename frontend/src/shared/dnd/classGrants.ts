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
    gear('b', 'Вариант B', 'Любое воинское оружие ближнего боя + простой щит + набор исследователя + 4 копья', [
      item('Длинный меч'),
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
    gear('a', 'Вариант A', 'Кольчуга + длинный меч + щит + лёгкий арбалет + набор исследователя', [
      item('Кольчуга', { armor_kind: 'heavy', base_ac: 16, weight_lb: 55 }),
      item('Длинный меч'),
      item('Щит', { armor_kind: 'shield', base_ac: 2, weight_lb: 6 }),
      item('Лёгкий арбалет'),
      item('Болты арбалета', { qty: 20 }),
      item('Набор исследователя'),
    ]),
    gear('b', 'Вариант B', 'Кожаный + длинный лук + два боевых меча + набор исследователя', [
      item('Кожаный доспех', { armor_kind: 'light', base_ac: 11, weight_lb: 10 }),
      item('Длинный лук'),
      item('Стрелы', { qty: 20 }),
      item('Длинный меч', { qty: 2 }),
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
}

export function startingEquipmentFor(slug: string): StartingEquipmentPackage[] {
  return CLASS_STARTING_EQUIPMENT[slug] ?? []
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
    const pack = startingEquipmentFor(input.def.slug).find(
      (row) => row.id === input.picks.equipmentPackageId,
    )
    if (pack) bits.push(`снаряжение: ${pack.labelRu}`)
  }
  bits.push(`кость ${input.def.hitDie}`)
  return bits.join(' · ')
}
