/**
 * Race-aware character name generation for create-pipeline.
 * Spec lives on catalog race `data.naming` and/or curated PHB tables.
 */

import type { CharacterGender } from './characterGender'
import {
  PHB_RACE_NAMING,
  RACE_NAMING_PARENT,
  GLOBAL_FANTASY_FALLBACK,
} from './raceNamingTables'
import { MPMM_RACE_NAMING, MPMM_NAMING_PARENT } from './raceNamingTables.mpmm'
import {
  SETTING_RACE_NAMING,
  SETTING_NAMING_PARENT,
} from './raceNamingTables.setting'

export type NamingGenderKey = 'any' | 'male' | 'female'

export type NamingPool = {
  any?: string[]
  male?: string[]
  female?: string[]
}

export type NamingPattern = {
  id: string
  /** Placeholders: {given} {clan} {family} {virtue} {prefix}{stem}{suffix} etc. */
  template: string
  weight?: number
  /** When set, pattern only applies for this naming mode (e.g. tiefling virtue). */
  mode?: string
}

export type NamingMode = {
  id: string
  labelRu: string
  weight?: number
}

export type NamingSpec = {
  modes?: NamingMode[]
  patterns: NamingPattern[]
  pools: Record<string, NamingPool | string[]>
}

export type GenerateRaceNameInput = {
  gender: CharacterGender
  /** Prefer catalog `data.naming` when present. */
  naming?: unknown
  /** Race / subrace slug for curated tables. */
  slug?: string | null
  /** Parent race slug when subrace has no own naming. */
  parentSlug?: string | null
  /** Force a mode id (tiefling); otherwise weighted random among modes. */
  modeId?: string | null
  /** Inject RNG for tests. */
  random?: () => number
}

export type GenerateRaceNameResult = {
  name: string
  modeId: string | null
  patternId: string
}

const MAX_NAME_LEN = 120

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizePool(value: unknown): NamingPool {
  if (Array.isArray(value)) {
    return { any: asStringList(value) }
  }
  const row = asRecord(value)
  return {
    any: asStringList(row.any),
    male: asStringList(row.male),
    female: asStringList(row.female),
  }
}

export function parseNamingSpec(raw: unknown): NamingSpec | null {
  const data = asRecord(raw)
  const patternsRaw = Array.isArray(data.patterns) ? data.patterns : null
  if (!patternsRaw || patternsRaw.length === 0) return null

  const patterns: NamingPattern[] = []
  for (const item of patternsRaw) {
    const row = asRecord(item)
    if (typeof row.template !== 'string' || !row.template.trim()) continue
    patterns.push({
      id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : `p${patterns.length}`,
      template: row.template.trim(),
      weight: typeof row.weight === 'number' && row.weight > 0 ? row.weight : 1,
      mode: typeof row.mode === 'string' && row.mode.trim() ? row.mode.trim() : undefined,
    })
  }
  if (patterns.length === 0) return null

  const poolsRaw = asRecord(data.pools)
  const pools: NamingSpec['pools'] = {}
  for (const [key, value] of Object.entries(poolsRaw)) {
    pools[key] = normalizePool(value)
  }

  const modesRaw = Array.isArray(data.modes) ? data.modes : []
  const modes: NamingMode[] = []
  for (const item of modesRaw) {
    const row = asRecord(item)
    if (typeof row.id !== 'string' || !row.id.trim()) continue
    if (typeof row.labelRu !== 'string' || !row.labelRu.trim()) continue
    modes.push({
      id: row.id.trim(),
      labelRu: row.labelRu.trim(),
      weight: typeof row.weight === 'number' && row.weight > 0 ? row.weight : 1,
    })
  }

  return { modes: modes.length > 0 ? modes : undefined, patterns, pools }
}

const ALL_NAMING: Record<string, NamingSpec> = {
  ...PHB_RACE_NAMING,
  ...MPMM_RACE_NAMING,
  ...SETTING_RACE_NAMING,
}

const ALL_PARENT: Record<string, string> = {
  ...RACE_NAMING_PARENT,
  ...MPMM_NAMING_PARENT,
  ...SETTING_NAMING_PARENT,
}

function namingForSlug(slug: string | null | undefined): NamingSpec | null {
  const key = slug?.trim() || null
  if (!key) return null
  if (ALL_NAMING[key]) return ALL_NAMING[key]
  const mapped = ALL_PARENT[key]
  if (mapped && ALL_NAMING[mapped]) return ALL_NAMING[mapped]
  return null
}

/** Resolve naming for a race: catalog data → curated slug → parent → global fallback. */
export function resolveNamingSpec(input: {
  naming?: unknown
  slug?: string | null
  parentSlug?: string | null
}): NamingSpec {
  const fromData = parseNamingSpec(input.naming)
  if (fromData) return fromData

  return (
    namingForSlug(input.slug) ??
    namingForSlug(input.parentSlug) ??
    GLOBAL_FANTASY_FALLBACK
  )
}

function pickWeighted<T extends { weight?: number }>(
  items: T[],
  random: () => number,
): T | null {
  if (items.length === 0) return null
  const total = items.reduce((sum, item) => sum + (item.weight && item.weight > 0 ? item.weight : 1), 0)
  let cursor = random() * total
  for (const item of items) {
    cursor -= item.weight && item.weight > 0 ? item.weight : 1
    if (cursor <= 0) return item
  }
  return items[items.length - 1] ?? null
}

function pickOne(list: string[], random: () => number): string | null {
  if (list.length === 0) return null
  const index = Math.floor(random() * list.length) % list.length
  return list[index] ?? null
}

/**
 * Pool pick rules (product): only male | female.
 * - male → male, fallback any
 * - female → female, fallback any
 */
export function pickFromPool(
  pool: NamingPool | string[] | undefined,
  gender: CharacterGender,
  random: () => number,
): string | null {
  const normalized = Array.isArray(pool) ? normalizePool(pool) : pool ?? {}
  const male = normalized.male ?? []
  const female = normalized.female ?? []
  const any = normalized.any ?? []

  if (gender === 'male') {
    return pickOne(male, random) ?? pickOne(any, random)
  }
  return pickOne(female, random) ?? pickOne(any, random)
}

function placeholdersIn(template: string): string[] {
  const found = new Set<string>()
  for (const match of template.matchAll(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g)) {
    found.add(match[1])
  }
  return [...found]
}

function fillTemplate(
  template: string,
  pools: NamingSpec['pools'],
  gender: CharacterGender,
  random: () => number,
): string | null {
  let result = template
  for (const key of placeholdersIn(template)) {
    const value = pickFromPool(pools[key], gender, random)
    if (!value) return null
    result = result.split(`{${key}}`).join(value)
  }
  return result.replace(/\s+/g, ' ').trim()
}

export function generateRaceName(input: GenerateRaceNameInput): GenerateRaceNameResult | null {
  const random = input.random ?? Math.random
  const spec = resolveNamingSpec({
    naming: input.naming,
    slug: input.slug,
    parentSlug: input.parentSlug,
  })

  let modeId: string | null = null
  if (spec.modes && spec.modes.length > 0) {
    if (input.modeId && spec.modes.some((mode) => mode.id === input.modeId)) {
      modeId = input.modeId
    } else {
      modeId = pickWeighted(spec.modes, random)?.id ?? spec.modes[0]?.id ?? null
    }
  }

  const patterns =
    modeId != null
      ? spec.patterns.filter((pattern) => !pattern.mode || pattern.mode === modeId)
      : spec.patterns.filter((pattern) => !pattern.mode)

  const usable = patterns.length > 0 ? patterns : spec.patterns
  const pattern = pickWeighted(usable, random)
  if (!pattern) return null

  const filled = fillTemplate(pattern.template, spec.pools, input.gender, random)
  if (!filled) return null

  const name = filled.slice(0, MAX_NAME_LEN)
  return { name, modeId, patternId: pattern.id }
}

/** Convenience: list mode chips for UI. */
export function namingModesFor(input: {
  naming?: unknown
  slug?: string | null
  parentSlug?: string | null
}): NamingMode[] {
  return resolveNamingSpec(input).modes ?? []
}

/** Subrace slug → preferred naming mode (genasi element, gith fork, …). */
const SLUG_MODE_HINT: Record<string, string> = {
  genasi_air: 'air',
  genasi_earth: 'earth',
  genasi_fire: 'fire',
  genasi_water: 'water',
  githyanki: 'yanki',
  githzerai: 'zerai',
}

export function preferredNamingModeId(slug: string | null | undefined): string | null {
  const key = slug?.trim() || null
  if (!key) return null
  return SLUG_MODE_HINT[key] ?? null
}
