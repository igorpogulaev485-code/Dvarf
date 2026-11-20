/**
 * Internal e2e seeds for the 2024 create paladin (`?e2eLeveling=1&e2eSeed=paladin11genies`).
 * Book path: Noble Genies (FRHoF). PHB oath aliases kept.
 */
import type { CatalogEntry } from '../../shared/api/catalog'
import { spellOnClassList } from './create2024FeatPicks'

const PREFERRED: Record<number, string[]> = {
  0: [],
  1: [
    'bless',
    'command',
    'cure-wounds',
    'detect-evil-and-good',
    'divine-favor',
    'heroism',
    'protection-from-evil-and-good',
    'shield-of-faith',
  ],
  2: ['aid', 'find-steed', 'lesser-restoration', 'magic-weapon', 'zone-of-truth'],
  3: ['aura-of-vitality', 'crusaders-mantle', 'dispel-magic', 'revivify'],
  4: ['aura-of-life', 'banishment', 'death-ward', 'locate-creature'],
  5: ['banishing-smite', 'destructive-wave', 'raise-dead'],
}

export type PaladinSeedSpells = {
  cantripIds: string[]
  spellbookSpellIds: string[]
  preparedSpellIds: string[]
}

export type PaladinSeedSpec = {
  level: number
  subclassSlug: string | null
}

const SUBCLASS_SUFFIX: Record<string, string> = {
  '': 'devotion',
  devotion: 'devotion',
  glory: 'glory',
  ancients: 'ancients',
  vengeance: 'vengeance',
  genies: 'genies',
  noblegenies: 'genies',
  oathofthenoblegenies: 'genies',
}

function resolveSubclassSlug(suffix: string): string {
  const key = (suffix || 'devotion').replace(/[^a-z]/g, '')
  const base = SUBCLASS_SUFFIX[key] ?? key
  if (base === 'devotion') return 'paladin__oath-of-devotion'
  if (base === 'glory') return 'paladin__oath-of-glory'
  if (base === 'ancients') return 'paladin__oath-of-the-ancients'
  if (base === 'vengeance') return 'paladin__oath-of-vengeance'
  if (base === 'genies') return 'paladin__oath-of-the-noble-genies'
  return `paladin__${base}`
}

/** `paladin5`, `paladin3genies`, `paladin11genies`, `paladin20genies` … */
export function parsePaladinSeed(raw: string): PaladinSeedSpec | null {
  const match = /^paladin(\d{1,2})([a-z]*)$/i.exec(raw.trim())
  if (!match) return null
  const level = Math.min(20, Math.max(1, Number(match[1])))
  if (level < 3) return { level, subclassSlug: null }
  const suffix = match[2]?.toLowerCase() ?? ''
  return { level, subclassSlug: resolveSubclassSlug(suffix) }
}

export function paladinAsiChoicesForLevel(level: number): Array<{
  classSlug: string
  classLevel: number
  kind: 'asi_plus2'
  abilities: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
}> {
  const gates = [4, 8, 12, 16, 19].filter((g) => g <= level)
  // Base CHA 15 → at most two +2 (→19); rest STR/CON so create stays ≤20.
  const bumps: Array<Partial<Record<'cha' | 'str' | 'con', number>>> = [
    { cha: 2 },
    { str: 2 },
    { cha: 2 },
    { con: 2 },
    { str: 2 },
  ]
  return gates.map((classLevel, index) => ({
    classSlug: 'paladin',
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

function levelRow(paladinClass: CatalogEntry, level: number): LevelRow | null {
  const levels = (paladinClass.data as { levels?: LevelRow[] } | undefined)?.levels
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
        spellOnClassList(s, 'paladin') &&
        (s.source === 'srd-5.2' || s.source === 'ph24'),
    )
    .map((s) => s.slug)
  const preferred = (PREFERRED[circle] ?? []).filter((slug) => available.includes(slug))
  const rest = available.filter((slug) => !preferred.includes(slug)).sort()
  return [...preferred, ...rest]
}

export function buildPaladinSeedSpells(
  spells: CatalogEntry[],
  classEntry: CatalogEntry,
  level: number,
): PaladinSeedSpells {
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

export function buildPaladinClassOptionPicks(
  level: number,
  subclassSlug: string | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (subclassSlug === 'paladin__oath-of-the-noble-genies' && level >= 3) {
    out.genies_splendor_skill = 'persuasion'
  }
  if (subclassSlug === 'paladin__oath-of-the-noble-genies' && level >= 7) {
    out.elemental_shielding_type = 'fire'
  }
  return out
}
