/**
 * Bestiary catalog `data` contract (D&D 2014).
 * Mirrors backend/app/schemas/bestiary_catalog.py — kind=bestiary JSONB.
 * On dnd.su ↔ ttg stat conflicts, product writes ttg values.
 */

export const BESTIARY_DATA_SCHEMA_VERSION = 1

export type BestiarySpeed = {
  walk?: number
  swim?: number
  fly?: number
  climb?: number
  burrow?: number
  notes?: string
}

export type BestiaryAbilities = {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export type BestiarySenses = {
  darkvision?: number
  blindsight?: number
  tremorsense?: number
  truesight?: number
  passive_perception?: number
}

export type BestiaryActionBlock = {
  name_ru: string
  name_en?: string
  text_ru: string
}

export type BestiaryCatalogData = {
  schema_version?: number
  size: string
  type: string
  type_ru: string
  subtype?: string | null
  alignment?: string
  ac: number
  ac_notes?: string
  hp_average: number
  hp_formula?: string
  /** Host-scaled (Wildfire Spirit): "+ пятикратный уровень друида" */
  hp_scaling_text?: string
  speed: BestiarySpeed
  /** Empty when CR is not fixed (class companions / spirits). */
  cr: string
  proficiency_bonus?: number | string
  abilities: BestiaryAbilities
  skills?: Record<string, number>
  senses?: BestiarySenses
  languages?: string[]
  damage_immunities?: string[]
  damage_resistances?: string[]
  damage_vulnerabilities?: string[]
  condition_immunities?: string[]
  traits?: BestiaryActionBlock[]
  actions?: BestiaryActionBlock[]
  bonus_actions?: BestiaryActionBlock[]
  reactions?: BestiaryActionBlock[]
  legendary_actions?: BestiaryActionBlock[]
  source_book: string
  tags?: string[]
  environment?: string[]
}

export type BestiaryCatalogEntry = {
  slug: string
  name_ru: string
  name_en: string
  source?: string
  external_ref?: Record<string, unknown>
  data: BestiaryCatalogData
}

const TYPE_RU_TO_EN: Record<string, string> = {
  зверь: 'beast',
  'стая крошечных зверей': 'swarm_of_tiny_beasts',
  рой: 'swarm',
  гуманоид: 'humanoid',
  монстр: 'monstrosity',
  нежить: 'undead',
  исчадие: 'fiend',
  конструкт: 'construct',
  аберрация: 'aberration',
  дракон: 'dragon',
  великан: 'giant',
  элементаль: 'elemental',
  фея: 'fey',
  растение: 'plant',
  небожитель: 'celestial',
  слизь: 'ooze',
}

export function bestiaryTypeToEn(typeRu: string): string {
  const key = typeRu.trim().toLowerCase()
  return TYPE_RU_TO_EN[key] ?? key.replace(/\s+/g, '_')
}

export function parseBestiaryData(raw: unknown): BestiaryCatalogData | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.type !== 'string' || typeof row.type_ru !== 'string') return null
  if (typeof row.ac !== 'number' || typeof row.hp_average !== 'number') return null
  if (typeof row.cr !== 'string' || typeof row.source_book !== 'string') return null
  if (!row.abilities || typeof row.abilities !== 'object') return null
  if (!row.speed || typeof row.speed !== 'object') return null
  if (typeof row.size !== 'string') return null
  return row as BestiaryCatalogData
}

/** Wild Shape movement tags derived from speed block. */
export function bestiarySpeedTags(speed: BestiarySpeed): string[] {
  const tags: string[] = []
  if (speed.swim && speed.swim > 0) tags.push('swim')
  if (speed.fly && speed.fly > 0) tags.push('fly')
  if (speed.climb && speed.climb > 0) tags.push('climb')
  if (speed.burrow && speed.burrow > 0) tags.push('burrow')
  return tags
}
