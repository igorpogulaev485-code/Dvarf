/**
 * Internal e2e seeds for the 2024 create ranger (`?e2eLeveling=1&e2eSeed=ranger11winter`).
 * Book paths: Winter Walker (FRHoF) + Hollow Warden (RTW). PHB conclave aliases kept.
 */
import type { CatalogEntry } from '../../shared/api/catalog'
import { spellOnClassList } from './create2024FeatPicks'

const PREFERRED: Record<number, string[]> = {
  0: [],
  1: [
    'cure-wounds',
    'detect-magic',
    'goodberry',
    'alarm',
    'animal-friendship',
    'entangle',
    'fog-cloud',
    'jump',
    'longstrider',
    'speak-with-animals',
    'ensnaring-strike',
  ],
  2: [
    'lesser-restoration',
    'aid',
    'silence',
    'pass-without-trace',
    'locate-animals-or-plants',
    'spike-growth',
  ],
  3: ['lightning-arrow', 'conjure-animals', 'plant-growth', 'protection-from-energy'],
  4: ['freedom-of-movement', 'grasping-vine', 'locate-creature', 'stoneskin'],
  5: ['swift-quiver', 'commune-with-nature', 'tree-stride', 'steel-wind-strike'],
}

export type RangerSeedSpells = {
  cantripIds: string[]
  spellbookSpellIds: string[]
  preparedSpellIds: string[]
}

export type RangerSeedSpec = {
  level: number
  subclassSlug: string | null
}

const SUBCLASS_SUFFIX: Record<string, string> = {
  '': 'hunter',
  hunter: 'hunter',
  beastmaster: 'beastmaster',
  beast: 'beastmaster',
  fey: 'fey',
  feywanderer: 'fey',
  gloom: 'gloom',
  gloomstalker: 'gloom',
  winter: 'winter',
  winterwalker: 'winter',
  hollow: 'hollow',
  hollowwarden: 'hollow',
  warden: 'hollow',
}

function resolveSubclassSlug(suffix: string): string {
  const key = (suffix || 'hunter').replace(/[^a-z]/g, '')
  const base = SUBCLASS_SUFFIX[key] ?? key
  if (base === 'hunter') return 'ranger__hunter-ranger'
  if (base === 'beastmaster') return 'ranger__beastmaster'
  if (base === 'fey') return 'ranger__fey-wanderer'
  if (base === 'gloom') return 'ranger__gloom-stalker'
  if (base === 'winter') return 'ranger__winter-walker'
  if (base === 'hollow') return 'ranger__hollow-warden'
  return `ranger__${base}`
}

/** `ranger5`, `ranger3winter`, `ranger11hollow`, `ranger15winter` … */
export function parseRangerSeed(raw: string): RangerSeedSpec | null {
  const match = /^ranger(\d{1,2})([a-z]*)$/i.exec(raw.trim())
  if (!match) return null
  const level = Math.min(20, Math.max(1, Number(match[1])))
  if (level < 3) return { level, subclassSlug: null }
  const suffix = match[2]?.toLowerCase() ?? ''
  return { level, subclassSlug: resolveSubclassSlug(suffix) }
}

export function rangerAsiChoicesForLevel(level: number): Array<{
  classSlug: string
  classLevel: number
  kind: 'asi_plus2'
  abilities: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
}> {
  const gates = [4, 8, 12, 16, 19].filter((g) => g <= level)
  // Base WIS 15 → at most two +2 (→19); rest DEX/CON so create stays ≤20.
  const bumps: Array<Partial<Record<'wis' | 'dex' | 'con', number>>> = [
    { wis: 2 },
    { dex: 2 },
    { wis: 2 },
    { con: 2 },
    { dex: 2 },
  ]
  return gates.map((classLevel, index) => ({
    classSlug: 'ranger',
    classLevel,
    kind: 'asi_plus2' as const,
    abilities: bumps[index] ?? { con: 2 },
  }))
}

type LevelRow = {
  level?: number
  spellcasting?: {
    cantrips?: number
    prepared_spells?: number
    slots?: Record<string, number>
  } | null
}

function levelRow(rangerClass: CatalogEntry, level: number): LevelRow | null {
  const levels = (rangerClass.data as { levels?: LevelRow[] } | undefined)?.levels
  if (!Array.isArray(levels)) return null
  return levels.find((row) => row?.level === level) ?? null
}

function spellLevelOf(entry: CatalogEntry): number {
  return Number((entry.data as { level?: number } | undefined)?.level ?? -1)
}

function maxCircle(row: LevelRow | null): number {
  const keys = Object.keys(row?.spellcasting?.slots ?? {}).map(Number)
  return keys.length ? Math.max(...keys) : Math.min(5, Math.ceil((row?.level ?? 1) / 2))
}

function poolForCircle(spells: readonly CatalogEntry[], circle: number): string[] {
  const available = spells
    .filter(
      (s) =>
        spellLevelOf(s) === circle &&
        spellOnClassList(s, 'ranger') &&
        (s.source === 'srd-5.2' || s.source === 'ph24'),
    )
    .map((s) => s.slug)
  const preferred = (PREFERRED[circle] ?? []).filter((slug) => available.includes(slug))
  const rest = available.filter((slug) => !preferred.includes(slug)).sort()
  return [...preferred, ...rest]
}

export function buildRangerSeedSpells(
  spells: CatalogEntry[],
  classEntry: CatalogEntry,
  level: number,
): RangerSeedSpells {
  const row = levelRow(classEntry, level)
  const preparedNeed = Number(row?.spellcasting?.prepared_spells ?? Math.max(2, Math.ceil(level / 2) + 1))
  const top = maxCircle(row)
  const prepared: string[] = []
  const taken = new Set<string>()
  for (let circle = 1; circle <= top && prepared.length < preparedNeed; circle += 1) {
    for (const slug of poolForCircle(spells, circle)) {
      if (taken.has(slug)) continue
      prepared.push(slug)
      taken.add(slug)
      if (prepared.length >= preparedNeed) break
    }
  }
  return {
    cantripIds: [],
    spellbookSpellIds: [],
    preparedSpellIds: prepared.slice(0, preparedNeed),
  }
}

export function buildRangerClassOptionPicks(
  _level: number,
  _subclassSlug: string | null,
): Record<string, unknown> {
  // Book Winter Walker / Hollow Warden have no L3 create picks beyond PHB ranger quotas
  // (skills / mastery / fighting style / preparation are seeded via fighting + mastery fields).
  return {}
}
