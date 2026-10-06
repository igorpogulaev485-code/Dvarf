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
}

export type ClassGrantPicks = {
  skills: string[]
  tools: string[]
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
  bits.push(`кость ${input.def.hitDie}`)
  return bits.join(' · ')
}
