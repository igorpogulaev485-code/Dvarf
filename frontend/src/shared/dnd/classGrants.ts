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
  /** Specific weapons beyond simple/martial (RU labels). */
  weaponExtras: string[]
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

/** Synthetic pack id when the player fills PHB a/b/c equipment lines. */
export const PHB_LINES_PACKAGE_ID = 'phb_lines'

export type ClassEquipmentWeaponGroup =
  | 'simple'
  | 'martial'
  | 'simple_melee'
  | 'martial_melee'

export type ClassEquipmentLineOption = {
  id: string
  labelRu: string
  /** Fixed gear for this fork (also stacked with pickWeapon / pickFrom). */
  items?: StartingGearItem[]
  /** Player must pick a concrete weapon from this PHB group. */
  pickWeapon?: ClassEquipmentWeaponGroup
  /** How many weapons to pick when pickWeapon is set (default 1). */
  pickWeaponCount?: number
  /** Free name pick from a fixed list (instruments, …) — stored in weaponName. */
  pickFrom?: string[]
  /** Soft hint (e.g. «если владеете») — does not block the pick. */
  noteRu?: string
}

export type ClassEquipmentLine = {
  id: string
  labelRu: string
  options: ClassEquipmentLineOption[]
}

export type ClassEquipmentLinePick = {
  optionId: string
  /** Required when the chosen option has pickWeapon (count 1) or pickFrom. */
  weaponName?: string | null
  /** When pickWeaponCount > 1. */
  weaponNames?: Array<string | null> | null
}

export function weaponPickCount(option: ClassEquipmentLineOption): number {
  if (!option.pickWeapon) return 0
  return Math.max(1, option.pickWeaponCount ?? 1)
}

/** Resolved weapon / pickFrom names for a line option pick. */
export function resolvedPickNames(
  option: ClassEquipmentLineOption,
  pick: ClassEquipmentLinePick | null | undefined,
): string[] {
  if (option.pickFrom?.length) {
    const name = pick?.weaponName?.trim()
    return name ? [name] : []
  }
  const need = weaponPickCount(option)
  if (need <= 0) return []
  if (need === 1) {
    const name = pick?.weaponName?.trim()
    return name ? [name] : []
  }
  const names = pick?.weaponNames ?? []
  const out: string[] = []
  for (let i = 0; i < need; i += 1) {
    const name = names[i]?.trim()
    if (!name) return out
    out.push(name)
  }
  return out
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

/**
 * Gold-only fallback packages. PHB a/b/c forks live in CLASS_EQUIPMENT_LINES;
 * equipmentPackagesFor hides non-gold packs when lines exist.
 */
export const CLASS_STARTING_EQUIPMENT: Record<string, StartingEquipmentPackage[]> = {
  barbarian: [gear('gold', 'Золото', '2к4×10 зм вместо снаряжения (на старте: 50 зм)', [], 50)],
  bard: [gear('gold', 'Золото', '5к4×10 зм (на старте: 125 зм)', [], 125)],
  cleric: [gear('gold', 'Золото', '5к4×10 зм (на старте: 125 зм)', [], 125)],
  druid: [gear('gold', 'Золото', '2к4×10 зм (на старте: 50 зм)', [], 50)],
  fighter: [gear('gold', 'Золото', '5к4×10 зм (на старте: 125 зм)', [], 125)],
  monk: [gear('gold', 'Золото', '5к4 зм (на старте: 12 зм)', [], 12)],
  paladin: [gear('gold', 'Золото', '5к4×10 зм (на старте: 125 зм)', [], 125)],
  ranger: [gear('gold', 'Золото', '5к4×10 зм (на старте: 125 зм)', [], 125)],
  rogue: [gear('gold', 'Золото', '4к4×10 зм (на старте: 100 зм)', [], 100)],
  sorcerer: [gear('gold', 'Золото', '3к4×10 зм (на старте: 75 зм)', [], 75)],
  warlock: [gear('gold', 'Золото', '4к4×10 зм (на старте: 100 зм)', [], 100)],
  wizard: [gear('gold', 'Золото', '4к4×10 зм (на старте: 100 зм)', [], 100)],
  artificer: [gear('gold', 'Золото', '5к4×10 зм (на старте: 125 зм)', [], 125)],
}

const leather = () =>
  item('Кожаный доспех', { armor_kind: 'light', base_ac: 11, weight_lb: 10 })
const studded = () =>
  item('Клёпаный кожаный доспех', { armor_kind: 'light', base_ac: 12, weight_lb: 13 })
const scale = () =>
  item('Чешуйчатый доспех', { armor_kind: 'medium', base_ac: 14, weight_lb: 45 })
const chain = () => item('Кольчуга', { armor_kind: 'heavy', base_ac: 16, weight_lb: 55 })
const shield = (extra?: Partial<StartingGearItem>) =>
  item('Щит', { armor_kind: 'shield', base_ac: 2, weight_lb: 6, ...extra })

export function startingEquipmentFor(slug: string): StartingEquipmentPackage[] {
  return CLASS_STARTING_EQUIPMENT[slug] ?? []
}

/** Prefer packages attached to a resolved def (catalog), else local fallback. */
export function equipmentPackagesFor(def: ClassGrantDef): StartingEquipmentPackage[] {
  const raw =
    def.equipment && def.equipment.length > 0
      ? def.equipment
      : startingEquipmentFor(def.slug)
  // When PHB line forks exist, hide pre-baked A/B packs — keep gold (or empty) only.
  if ((CLASS_EQUIPMENT_LINES[def.slug] ?? []).length > 0) {
    return raw.filter((pack) => pack.id === 'gold' || pack.items.length === 0)
  }
  return raw
}

/** PHB line-by-line starting equipment for all core classes (+ artificer). */
export const CLASS_EQUIPMENT_LINES: Record<string, ClassEquipmentLine[]> = {
  barbarian: [
    {
      id: 'primary',
      labelRu: 'Основное оружие',
      options: [
        { id: 'greataxe', labelRu: 'Секира', items: [item('Секира')] },
        {
          id: 'any_martial_melee',
          labelRu: 'Любое воинское оружие ближнего боя',
          pickWeapon: 'martial_melee',
        },
      ],
    },
    {
      id: 'secondary',
      labelRu: 'Дополнительное оружие',
      options: [
        { id: 'handaxes', labelRu: 'Два ручных топора', items: [item('Ручной топор', { qty: 2 })] },
        { id: 'any_simple', labelRu: 'Любое простое оружие', pickWeapon: 'simple' },
      ],
    },
    {
      id: 'fixed',
      labelRu: 'Набор и метательные копья',
      options: [
        {
          id: 'pack_javelins',
          labelRu: 'Набор исследователя и 4 метательных копья',
          items: [item('Набор исследователя'), item('Метательное копьё', { qty: 4 })],
        },
      ],
    },
  ],
  bard: [
    {
      id: 'weapon',
      labelRu: 'Оружие',
      options: [
        { id: 'rapier', labelRu: 'Рапира', items: [item('Рапира')] },
        { id: 'longsword', labelRu: 'Длинный меч', items: [item('Длинный меч')] },
        { id: 'any_simple', labelRu: 'Любое простое оружие', pickWeapon: 'simple' },
      ],
    },
    {
      id: 'pack',
      labelRu: 'Набор',
      options: [
        { id: 'diplomat', labelRu: 'Набор дипломата', items: [item('Набор дипломата')] },
        { id: 'entertainer', labelRu: 'Набор артиста', items: [item('Набор артиста')] },
      ],
    },
    {
      id: 'instrument',
      labelRu: 'Музыкальный инструмент',
      options: [
        { id: 'lute', labelRu: 'Лютня', items: [item('Лютня')] },
        {
          id: 'any_instrument',
          labelRu: 'Любой другой инструмент',
          pickFrom: [...MUSICAL_INSTRUMENT_CHOICES],
        },
      ],
    },
    {
      id: 'fixed',
      labelRu: 'Доспех и кинжал',
      options: [
        {
          id: 'leather_dagger',
          labelRu: 'Кожаный доспех и кинжал',
          items: [leather(), item('Кинжал')],
        },
      ],
    },
  ],
  cleric: [
    {
      id: 'weapon',
      labelRu: 'Оружие ближнего боя',
      options: [
        { id: 'mace', labelRu: 'Булава', items: [item('Булава')] },
        {
          id: 'warhammer',
          labelRu: 'Боевой молот',
          items: [item('Боевой молот')],
          noteRu: 'если владеете (раса / домен)',
        },
      ],
    },
    {
      id: 'armor',
      labelRu: 'Доспех',
      options: [
        { id: 'scale', labelRu: 'Чешуйчатый доспех', items: [scale()] },
        { id: 'leather', labelRu: 'Кожаный доспех', items: [leather()] },
        {
          id: 'chain',
          labelRu: 'Кольчуга',
          items: [chain()],
          noteRu: 'надеть можно только с владением тяжёлыми (домен Бури…)',
        },
      ],
    },
    {
      id: 'ranged',
      labelRu: 'Дальний бой / простое оружие',
      options: [
        {
          id: 'crossbow',
          labelRu: 'Лёгкий арбалет и 20 болтов',
          items: [item('Лёгкий арбалет'), item('Болты арбалета', { qty: 20 })],
        },
        { id: 'any_simple', labelRu: 'Любое простое оружие', pickWeapon: 'simple' },
      ],
    },
    {
      id: 'pack',
      labelRu: 'Набор',
      options: [
        { id: 'priest', labelRu: 'Набор священника', items: [item('Набор жреца')] },
        {
          id: 'explorer',
          labelRu: 'Набор путешественника',
          items: [item('Набор исследователя')],
        },
      ],
    },
    {
      id: 'fixed',
      labelRu: 'Щит и священный символ',
      options: [
        {
          id: 'shield_symbol',
          labelRu: 'Щит и священный символ',
          items: [shield(), item('Священный символ')],
        },
      ],
    },
  ],
  druid: [
    {
      id: 'shield_or_weapon',
      labelRu: 'Щит или оружие',
      options: [
        {
          id: 'wooden_shield',
          labelRu: 'Деревянный щит',
          items: [shield({ notes: 'деревянный' })],
        },
        { id: 'any_simple', labelRu: 'Любое простое оружие', pickWeapon: 'simple' },
      ],
    },
    {
      id: 'melee',
      labelRu: 'Оружие ближнего боя',
      options: [
        { id: 'scimitar', labelRu: 'Ятаган', items: [item('Ятаган')] },
        {
          id: 'any_simple_melee',
          labelRu: 'Любое простое оружие ближнего боя',
          pickWeapon: 'simple_melee',
        },
      ],
    },
    {
      id: 'fixed',
      labelRu: 'Доспех, набор и фокус',
      options: [
        {
          id: 'leather_pack_focus',
          labelRu: 'Кожаный доспех, набор исследователя и фокус друида',
          items: [leather(), item('Набор исследователя'), item('Фокус друида')],
        },
      ],
    },
  ],
  fighter: [
    {
      id: 'armor',
      labelRu: 'Доспех',
      options: [
        { id: 'chain', labelRu: 'Кольчуга', items: [chain()] },
        {
          id: 'leather_bow',
          labelRu: 'Кожаный доспех, длинный лук и 20 стрел',
          items: [leather(), item('Длинный лук'), item('Стрелы', { qty: 20 })],
        },
      ],
    },
    {
      id: 'weapons',
      labelRu: 'Оружие ближнего боя',
      options: [
        {
          id: 'martial_shield',
          labelRu: 'Воинское оружие и щит',
          pickWeapon: 'martial',
          items: [shield()],
        },
        {
          id: 'two_martial',
          labelRu: 'Два воинских оружия',
          pickWeapon: 'martial',
          pickWeaponCount: 2,
        },
      ],
    },
    {
      id: 'ranged',
      labelRu: 'Дальний бой / топоры',
      options: [
        {
          id: 'crossbow',
          labelRu: 'Лёгкий арбалет и 20 болтов',
          items: [item('Лёгкий арбалет'), item('Болты арбалета', { qty: 20 })],
        },
        {
          id: 'handaxes',
          labelRu: 'Два ручных топора',
          items: [item('Ручной топор', { qty: 2 })],
        },
      ],
    },
    {
      id: 'pack',
      labelRu: 'Набор',
      options: [
        {
          id: 'dungeoneer',
          labelRu: 'Набор исследователя подземелий',
          items: [item('Набор исследователя подземелий')],
        },
        {
          id: 'explorer',
          labelRu: 'Набор исследователя',
          items: [item('Набор исследователя')],
        },
      ],
    },
  ],
  monk: [
    {
      id: 'weapon',
      labelRu: 'Оружие',
      options: [
        { id: 'shortsword', labelRu: 'Короткий меч', items: [item('Короткий меч')] },
        { id: 'any_simple', labelRu: 'Любое простое оружие', pickWeapon: 'simple' },
      ],
    },
    {
      id: 'pack',
      labelRu: 'Набор',
      options: [
        {
          id: 'dungeoneer',
          labelRu: 'Набор исследователя подземелий',
          items: [item('Набор исследователя подземелий')],
        },
        {
          id: 'explorer',
          labelRu: 'Набор исследователя',
          items: [item('Набор исследователя')],
        },
      ],
    },
    {
      id: 'fixed',
      labelRu: 'Дротики',
      options: [
        {
          id: 'darts',
          labelRu: '10 дротиков',
          items: [item('Дротик', { qty: 10 })],
        },
      ],
    },
  ],
  paladin: [
    {
      id: 'weapons',
      labelRu: 'Оружие',
      options: [
        {
          id: 'martial_shield',
          labelRu: 'Воинское оружие и щит',
          pickWeapon: 'martial',
          items: [shield()],
        },
        {
          id: 'two_martial',
          labelRu: 'Два воинских оружия',
          pickWeapon: 'martial',
          pickWeaponCount: 2,
        },
      ],
    },
    {
      id: 'thrown',
      labelRu: 'Метательное / простое оружие',
      options: [
        {
          id: 'javelins',
          labelRu: '5 метательных копий',
          items: [item('Метательное копьё', { qty: 5 })],
        },
        {
          id: 'any_simple_melee',
          labelRu: 'Любое простое оружие ближнего боя',
          pickWeapon: 'simple_melee',
        },
      ],
    },
    {
      id: 'pack',
      labelRu: 'Набор',
      options: [
        { id: 'priest', labelRu: 'Набор священника', items: [item('Набор жреца')] },
        {
          id: 'explorer',
          labelRu: 'Набор исследователя',
          items: [item('Набор исследователя')],
        },
      ],
    },
    {
      id: 'fixed',
      labelRu: 'Кольчуга и священный символ',
      options: [
        {
          id: 'chain_symbol',
          labelRu: 'Кольчуга и священный символ',
          items: [chain(), item('Священный символ')],
        },
      ],
    },
  ],
  ranger: [
    {
      id: 'armor',
      labelRu: 'Доспех',
      options: [
        { id: 'scale', labelRu: 'Чешуйчатый доспех', items: [scale()] },
        { id: 'leather', labelRu: 'Кожаный доспех', items: [leather()] },
      ],
    },
    {
      id: 'weapons',
      labelRu: 'Оружие ближнего боя',
      options: [
        {
          id: 'shortswords',
          labelRu: 'Два коротких меча',
          items: [item('Короткий меч', { qty: 2 })],
        },
        {
          id: 'two_simple_melee',
          labelRu: 'Два простых оружия ближнего боя',
          pickWeapon: 'simple_melee',
          pickWeaponCount: 2,
        },
      ],
    },
    {
      id: 'pack',
      labelRu: 'Набор',
      options: [
        {
          id: 'dungeoneer',
          labelRu: 'Набор исследователя подземелий',
          items: [item('Набор исследователя подземелий')],
        },
        {
          id: 'explorer',
          labelRu: 'Набор исследователя',
          items: [item('Набор исследователя')],
        },
      ],
    },
    {
      id: 'fixed',
      labelRu: 'Длинный лук',
      options: [
        {
          id: 'longbow',
          labelRu: 'Длинный лук и 20 стрел',
          items: [item('Длинный лук'), item('Стрелы', { qty: 20 })],
        },
      ],
    },
  ],
  rogue: [
    {
      id: 'primary',
      labelRu: 'Основное оружие',
      options: [
        { id: 'rapier', labelRu: 'Рапира', items: [item('Рапира')] },
        { id: 'shortsword', labelRu: 'Короткий меч', items: [item('Короткий меч')] },
      ],
    },
    {
      id: 'secondary',
      labelRu: 'Дальний бой / второй меч',
      options: [
        {
          id: 'shortbow',
          labelRu: 'Короткий лук и 20 стрел',
          items: [item('Короткий лук'), item('Стрелы', { qty: 20 })],
        },
        { id: 'shortsword', labelRu: 'Короткий меч', items: [item('Короткий меч')] },
      ],
    },
    {
      id: 'pack',
      labelRu: 'Набор',
      options: [
        { id: 'burglar', labelRu: 'Набор взломщика', items: [item('Набор взломщика')] },
        {
          id: 'dungeoneer',
          labelRu: 'Набор исследователя подземелий',
          items: [item('Набор исследователя подземелий')],
        },
        {
          id: 'explorer',
          labelRu: 'Набор исследователя',
          items: [item('Набор исследователя')],
        },
      ],
    },
    {
      id: 'fixed',
      labelRu: 'Доспех, кинжалы и инструменты',
      options: [
        {
          id: 'leather_daggers_tools',
          labelRu: 'Кожаный доспех, 2 кинжала и воровские инструменты',
          items: [leather(), item('Кинжал', { qty: 2 }), item('Воровские инструменты')],
        },
      ],
    },
  ],
  sorcerer: [
    {
      id: 'weapon',
      labelRu: 'Оружие',
      options: [
        {
          id: 'crossbow',
          labelRu: 'Лёгкий арбалет и 20 болтов',
          items: [item('Лёгкий арбалет'), item('Болты арбалета', { qty: 20 })],
        },
        { id: 'any_simple', labelRu: 'Любое простое оружие', pickWeapon: 'simple' },
      ],
    },
    {
      id: 'focus',
      labelRu: 'Фокус компонентов',
      options: [
        {
          id: 'pouch',
          labelRu: 'Сумка с компонентами',
          items: [item('Сумка с компонентами')],
        },
        { id: 'arcane', labelRu: 'Магический фокус', items: [item('Магический фокус')] },
      ],
    },
    {
      id: 'pack',
      labelRu: 'Набор',
      options: [
        {
          id: 'dungeoneer',
          labelRu: 'Набор исследователя подземелий',
          items: [item('Набор исследователя подземелий')],
        },
        {
          id: 'explorer',
          labelRu: 'Набор исследователя',
          items: [item('Набор исследователя')],
        },
      ],
    },
    {
      id: 'fixed',
      labelRu: 'Кинжалы',
      options: [
        {
          id: 'daggers',
          labelRu: 'Два кинжала',
          items: [item('Кинжал', { qty: 2 })],
        },
      ],
    },
  ],
  warlock: [
    {
      id: 'weapon',
      labelRu: 'Оружие',
      options: [
        {
          id: 'crossbow',
          labelRu: 'Лёгкий арбалет и 20 болтов',
          items: [item('Лёгкий арбалет'), item('Болты арбалета', { qty: 20 })],
        },
        { id: 'any_simple', labelRu: 'Любое простое оружие', pickWeapon: 'simple' },
      ],
    },
    {
      id: 'focus',
      labelRu: 'Фокус компонентов',
      options: [
        {
          id: 'pouch',
          labelRu: 'Сумка с компонентами',
          items: [item('Сумка с компонентами')],
        },
        { id: 'arcane', labelRu: 'Магический фокус', items: [item('Магический фокус')] },
      ],
    },
    {
      id: 'pack',
      labelRu: 'Набор',
      options: [
        { id: 'scholar', labelRu: 'Набор учёного', items: [item('Набор учёного')] },
        {
          id: 'dungeoneer',
          labelRu: 'Набор исследователя подземелий',
          items: [item('Набор исследователя подземелий')],
        },
      ],
    },
    {
      id: 'simple2',
      labelRu: 'Простое оружие (второе)',
      options: [
        {
          id: 'any_simple',
          labelRu: 'Любое простое оружие',
          pickWeapon: 'simple',
        },
      ],
    },
    {
      id: 'fixed',
      labelRu: 'Доспех и кинжалы',
      options: [
        {
          id: 'leather_daggers',
          labelRu: 'Кожаный доспех и два кинжала',
          items: [leather(), item('Кинжал', { qty: 2 })],
        },
      ],
    },
  ],
  wizard: [
    {
      id: 'weapon',
      labelRu: 'Оружие',
      options: [
        { id: 'quarterstaff', labelRu: 'Боевой посох', items: [item('Боевой посох')] },
        { id: 'dagger', labelRu: 'Кинжал', items: [item('Кинжал')] },
      ],
    },
    {
      id: 'focus',
      labelRu: 'Фокус компонентов',
      options: [
        {
          id: 'pouch',
          labelRu: 'Сумка с компонентами',
          items: [item('Сумка с компонентами')],
        },
        { id: 'arcane', labelRu: 'Магический фокус', items: [item('Магический фокус')] },
      ],
    },
    {
      id: 'pack',
      labelRu: 'Набор',
      options: [
        { id: 'scholar', labelRu: 'Набор учёного', items: [item('Набор учёного')] },
        {
          id: 'explorer',
          labelRu: 'Набор исследователя',
          items: [item('Набор исследователя')],
        },
      ],
    },
    {
      id: 'fixed',
      labelRu: 'Книга заклинаний',
      options: [
        {
          id: 'spellbook',
          labelRu: 'Книга заклинаний',
          items: [item('Книга заклинаний')],
        },
      ],
    },
  ],
  artificer: [
    {
      id: 'weapons',
      labelRu: 'Два простых оружия',
      options: [
        {
          id: 'two_simple',
          labelRu: 'Выбрать два простых оружия',
          pickWeapon: 'simple',
          pickWeaponCount: 2,
        },
      ],
    },
    {
      id: 'crossbow',
      labelRu: 'Арбалет',
      options: [
        {
          id: 'light_crossbow',
          labelRu: 'Лёгкий арбалет и 20 болтов',
          items: [item('Лёгкий арбалет'), item('Болты арбалета', { qty: 20 })],
        },
      ],
    },
    {
      id: 'armor',
      labelRu: 'Доспех',
      options: [
        { id: 'studded', labelRu: 'Клёпаный кожаный доспех', items: [studded()] },
        { id: 'scale', labelRu: 'Чешуйчатый доспех', items: [scale()] },
      ],
    },
    {
      id: 'fixed',
      labelRu: 'Инструменты и набор',
      options: [
        {
          id: 'tools_pack',
          labelRu: 'Воровские инструменты и набор исследователя',
          items: [item('Воровские инструменты'), item('Набор исследователя')],
        },
      ],
    },
  ],
}

export function equipmentLinesFor(def: ClassGrantDef): ClassEquipmentLine[] {
  return CLASS_EQUIPMENT_LINES[def.slug] ?? []
}

export function buildItemsFromEquipmentLines(input: {
  lines: ClassEquipmentLine[]
  picks: Record<string, ClassEquipmentLinePick>
}): StartingGearItem[] | null {
  const items: StartingGearItem[] = []
  for (const line of input.lines) {
    const pick = input.picks[line.id]
    if (!pick?.optionId) return null
    const option = line.options.find((row) => row.id === pick.optionId)
    if (!option) return null
    const need = weaponPickCount(option)
    if (option.pickFrom?.length || need > 0) {
      const names = resolvedPickNames(option, pick)
      const expected = option.pickFrom?.length ? 1 : need
      if (names.length < expected) return null
      for (const name of names) items.push(item(name))
    }
    for (const row of option.items ?? []) items.push({ ...row })
  }
  return items
}

/** All open equipment-line forks (setup dialog lists every blocker). */
export function equipmentLineBlockingReasons(input: {
  lines: ClassEquipmentLine[]
  picks: Record<string, ClassEquipmentLinePick>
}): string[] {
  const reasons: string[] = []
  for (const line of input.lines) {
    const pick = input.picks[line.id]
    if (!pick?.optionId) {
      reasons.push(`Выбери: ${line.labelRu}.`)
      continue
    }
    const option = line.options.find((row) => row.id === pick.optionId)
    if (!option) {
      reasons.push(`Неизвестный вариант в «${line.labelRu}».`)
      continue
    }
    if (option.pickFrom?.length) {
      const name = pick.weaponName?.trim()
      if (!name) {
        reasons.push(`Выбери предмет в «${line.labelRu}».`)
      } else if (!option.pickFrom.includes(name)) {
        reasons.push(`Неизвестный вариант в «${line.labelRu}».`)
      }
      continue
    }
    const need = weaponPickCount(option)
    if (need > 0) {
      const names = resolvedPickNames(option, pick)
      if (names.length < need) {
        reasons.push(
          need === 1
            ? `Выбери оружие в «${line.labelRu}».`
            : `Выбери оружие (${names.length}/${need}) в «${line.labelRu}».`,
        )
      }
    }
  }
  return reasons
}

export function validateEquipmentLinePicks(input: {
  lines: ClassEquipmentLine[]
  picks: Record<string, ClassEquipmentLinePick>
}): string | null {
  return equipmentLineBlockingReasons(input)[0] ?? null
}

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
    weaponExtras: partial.weaponExtras ?? [],
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
      weaponExtras: ['Ручной арбалет', 'Длинный меч', 'Рапира', 'Короткий меч'],
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
      weaponExtras: ['Ятаган'],
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
      weaponExtras: ['Короткий меч'],
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
      weaponExtras: ['Короткий меч'],
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
      weaponExtras: ['Ручной арбалет', 'Длинный меч', 'Рапира', 'Короткий меч'],
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
  weaponExtras: string[]
  /** HP set at character level 1 from max hit die + CON (start only). */
  level1Hp: number | null
  equipmentPackageId: string | null
  equipmentItemIds: string[]
  /** Attack cards created from starting weapons (revoke with the package). */
  equipmentAttackIds: string[]
  equipmentCoinsGp: number
}

/** Focus chosen for a generic «Магический фокус» / «фокус друида» package line. */
export type ClassEquipmentFocusPick = {
  name: string
  catalog_id: string | null
  cost_gp: number | null
  weight_lb: number | null
  focus_kind: 'arcane' | 'druidic' | 'holy' | 'any'
  custom: boolean
}

export type ClassGrantPicks = {
  skills: string[]
  tools: string[]
  /** Required for start mode when class has packages (gear pack or «Золото»). */
  equipmentPackageId: string | null
  /** When the package has a focus placeholder — catalog row or custom look. */
  equipmentFocusPick?: ClassEquipmentFocusPick | null
  /** PHB a/b/c line picks when equipmentPackageId === PHB_LINES_PACKAGE_ID. */
  equipmentLinePicks?: Record<string, ClassEquipmentLinePick>
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

function parseWeaponExtras(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return []
  const row = raw as Record<string, unknown>
  if (!Array.isArray(row.extras)) return []
  // Lazy import avoided: resolve tokens inline via shared map in FE characters.
  // Catalog uses EN tokens; resolveWeaponExtraList lives in characters/ — duplicate
  // minimal mapping here to keep classGrants free of feature imports.
  const TOKEN: Record<string, string> = {
    hand_crossbow: 'Ручной арбалет',
    longsword: 'Длинный меч',
    shortsword: 'Короткий меч',
    rapier: 'Рапира',
    scimitar: 'Ятаган',
    dagger: 'Кинжал',
    shortbow: 'Короткий лук',
    longbow: 'Длинный лук',
    light_crossbow: 'Лёгкий арбалет',
    quarterstaff: 'Боевой посох',
    spear: 'Копьё',
    javelin: 'Метательное копьё',
    mace: 'Булава',
    warhammer: 'Боевой молот',
    handaxe: 'Ручной топор',
    greataxe: 'Секира',
    club: 'Дубинка',
    dart: 'Дротик',
    trident: 'Трезубец',
    net: 'Сеть',
    battleaxe: 'Боевой топор',
    light_hammer: 'Лёгкий молот',
  }
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of row.extras) {
    if (typeof item !== 'string' || !item.trim()) continue
    const key = item.trim().toLowerCase().replace(/[\s-]+/g, '_')
    const name = TOKEN[key] ?? item.trim().replace(/\s+/g, ' ')
    const lower = name.toLowerCase()
    if (seen.has(lower)) continue
    seen.add(lower)
    out.push(name)
  }
  return out
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
    weaponExtras: parseWeaponExtras(source.weapons),
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
