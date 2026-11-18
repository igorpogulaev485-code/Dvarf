/**
 * Internal e2e seeds for the 2024 create bard (`?e2eLeveling=1&e2eSeed=bard11moon`).
 * Book paths: Moon (FRHoF) + Spirits (RTW). PHB college aliases kept.
 */
import type { CatalogEntry } from '../../shared/api/catalog'
import { spellOnClassList } from './create2024FeatPicks'

const PREFERRED: Record<number, string[]> = {
  0: ['vicious-mockery', 'minor-illusion', 'mage-hand', 'prestidigitation', 'friends', 'dancing-lights'],
  1: [
    'healing-word',
    'faerie-fire',
    'dissonant-whispers',
    'tashas-hideous-laughter',
    'charm-person',
    'thunderwave',
    'detect-magic',
    'heroism',
  ],
  2: ['invisibility', 'suggestion', 'hold-person', 'shatter', 'enhance-ability', 'calm-emotions'],
  3: ['hypnotic-pattern', 'dispel-magic', 'major-image', 'fear', 'plant-growth'],
  4: ['greater-invisibility', 'dimension-door', 'polymorph', 'freedom-of-movement'],
  5: ['animate-objects', 'mass-cure-wounds', 'synaptic-static', 'legend-lore'],
  6: ['true-seeing', 'mass-suggestion', 'otto-s-irresistible-dance', 'eyebite'],
  7: ['forcecage', 'teleport', 'regenerate', 'plane-shift'],
  8: ['dominate-monster', 'power-word-stun', 'feeblemind'],
  9: ['foresight', 'power-word-heal', 'true-polymorph'],
}

export type BardSeedSpells = {
  cantripIds: string[]
  spellbookSpellIds: string[]
  preparedSpellIds: string[]
}

export type BardSeedSpec = {
  level: number
  subclassSlug: string | null
}

const SUBCLASS_SUFFIX: Record<string, string> = {
  '': 'lore',
  lore: 'lore',
  valor: 'valor',
  glamour: 'glamour',
  dance: 'dance',
  moon: 'moon',
  collegeofthemoon: 'moon',
  luna: 'moon',
  spirits: 'spirits',
  spirit: 'spirits',
  collegeofthespirits: 'spirits',
}

function resolveSubclassSlug(suffix: string): string {
  const key = (suffix || 'lore').replace(/[^a-z]/g, '')
  const base = SUBCLASS_SUFFIX[key] ?? key
  if (base === 'lore') return 'bard__lore'
  if (base === 'valor') return 'bard__valor'
  if (base === 'glamour') return 'bard__glamour'
  if (base === 'dance') return 'bard__dance'
  if (base === 'moon') return 'bard__college-of-the-moon'
  if (base === 'spirits') return 'bard__college-of-the-spirits'
  return `bard__${base}`
}

/** `bard5`, `bard3moon`, `bard11spirits`, `bard14moon` … */
export function parseBardSeed(raw: string): BardSeedSpec | null {
  const match = /^bard(\d{1,2})([a-z]*)$/i.exec(raw.trim())
  if (!match) return null
  const level = Math.min(20, Math.max(1, Number(match[1])))
  if (level < 3) return { level, subclassSlug: null }
  const suffix = match[2]?.toLowerCase() ?? ''
  return { level, subclassSlug: resolveSubclassSlug(suffix) }
}

export function bardAsiChoicesForLevel(level: number): Array<{
  classSlug: string
  classLevel: number
  kind: 'asi_plus2'
  abilities: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
}> {
  const gates = [4, 8, 12, 16, 19].filter((g) => g <= level)
  // Base CHA 15 → at most two +2 (→19); rest CON/DEX so create stays ≤20.
  const bumps: Array<Partial<Record<'cha' | 'con' | 'dex', number>>> = [
    { cha: 2 },
    { con: 2 },
    { cha: 2 },
    { con: 2 },
    { dex: 2 },
  ]
  return gates.map((classLevel, index) => ({
    classSlug: 'bard',
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

function levelRow(bardClass: CatalogEntry, level: number): LevelRow | null {
  const levels = (bardClass.data as { levels?: LevelRow[] } | undefined)?.levels
  if (!Array.isArray(levels)) return null
  return levels.find((row) => row?.level === level) ?? null
}

function spellLevelOf(entry: CatalogEntry): number {
  return Number((entry.data as { level?: number } | undefined)?.level ?? -1)
}

function maxCircle(row: LevelRow | null): number {
  const keys = Object.keys(row?.spellcasting?.slots ?? {}).map(Number)
  return keys.length ? Math.max(...keys) : Math.min(9, Math.ceil((row?.level ?? 1) / 2))
}

function poolForCircle(spells: readonly CatalogEntry[], circle: number): string[] {
  const available = spells
    .filter(
      (s) =>
        spellLevelOf(s) === circle &&
        spellOnClassList(s, 'bard') &&
        (s.source === 'srd-5.2' || s.source === 'ph24'),
    )
    .map((s) => s.slug)
  const preferred = (PREFERRED[circle] ?? []).filter((slug) => available.includes(slug))
  const rest = available.filter((slug) => !preferred.includes(slug)).sort()
  return [...preferred, ...rest]
}

export function buildBardSeedSpells(
  spells: CatalogEntry[],
  classEntry: CatalogEntry,
  level: number,
): BardSeedSpells {
  const row = levelRow(classEntry, level)
  const cantripNeed = Number(row?.spellcasting?.cantrips ?? (level >= 10 ? 4 : level >= 4 ? 3 : 2))
  const preparedNeed = Number(row?.spellcasting?.prepared_spells ?? Math.max(4, level + 2))
  const top = maxCircle(row)
  const cantripIds = poolForCircle(spells, 0).slice(0, cantripNeed)
  const taken = new Set<string>(cantripIds)
  const prepared: string[] = []
  for (let circle = 1; circle <= top; circle += 1) {
    for (const slug of poolForCircle(spells, circle)) {
      if (prepared.length >= preparedNeed) break
      if (taken.has(slug)) continue
      taken.add(slug)
      prepared.push(slug)
    }
    if (prepared.length >= preparedNeed) break
  }
  return {
    cantripIds,
    spellbookSpellIds: [],
    // Prepared budget is leveled spells only (cantrips live in cantripIds).
    preparedSpellIds: prepared,
  }
}

export function buildBardClassOptionPicks(
  level: number,
  subclassSlug: string | null | undefined,
  classSkills: string[] = ['performance', 'persuasion', 'deception'],
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const sub = String(subclassSlug || '').toLowerCase()
  if (sub === 'bard__college-of-the-moon' && level >= 3) {
    out.primal_lore_skill = 'nature'
    out.primal_lore_cantrip = 'druidcraft'
  }
  if (sub === 'bard__lore' && level >= 3) {
    out.lore_skills = ['arcana', 'history', 'religion']
  }
  if (sub === 'bard__lore' && level >= 6) {
    out.magical_discoveries = ['guidance', 'fireball']
  }
  const expertiseNeed = level >= 9 ? 4 : level >= 2 ? 2 : 0
  if (expertiseNeed > 0) {
    // Expertise only in skills the character actually has (class + soldier bg + moon nature).
    const pool: string[] = []
    const proficient = [
      ...classSkills,
      'athletics',
      'intimidation',
      ...(sub === 'bard__college-of-the-moon' && level >= 3 ? (['nature'] as const) : []),
    ]
    for (const skill of proficient) {
      if (!pool.includes(skill)) pool.push(skill)
    }
    out.expertise = pool.slice(0, expertiseNeed)
  }
  return out
}
