/**
 * Internal e2e seeds for the 2024 create cleric (`?e2eLeveling=1&e2eSeed=cleric11arcana`).
 * Book paths: Arcana (AU) + Knowledge (FRHoF) + Grave (RTW). PHB domain aliases kept.
 */
import type { CatalogEntry } from '../../shared/api/catalog'
import { spellOnClassList } from './create2024FeatPicks'

const PREFERRED: Record<number, string[]> = {
  0: ['guidance', 'sacred-flame', 'thaumaturgy', 'toll-the-dead', 'light', 'spare-the-dying'],
  1: [
    'bless',
    'cure-wounds',
    'guiding-bolt',
    'healing-word',
    'shield-of-faith',
    'command',
    'detect-magic',
    'bane',
  ],
  2: ['aid', 'spiritual-weapon', 'hold-person', 'lesser-restoration', 'prayer-of-healing'],
  3: ['spirit-guardians', 'revivify', 'dispel-magic', 'mass-healing-word', 'beacon-of-hope'],
  4: ['death-ward', 'divination', 'freedom-of-movement', 'guardian-of-faith'],
  5: ['greater-restoration', 'mass-cure-wounds', 'raise-dead', 'scrying', 'holy-weapon'],
  6: ['heal', 'heroes-feast', 'true-seeing', 'word-of-recall'],
  7: ['divine-word', 'regenerate', 'resurrection', 'plane-shift'],
  8: ['holy-aura', 'sunburst', 'antimagic-field'],
  9: ['mass-heal', 'true-resurrection', 'gate'],
}

export type ClericSeedSpells = {
  cantripIds: string[]
  spellbookSpellIds: string[]
  preparedSpellIds: string[]
}

export type ClericSeedSpec = {
  level: number
  subclassSlug: string | null
}

const SUBCLASS_SUFFIX: Record<string, string> = {
  '': 'life',
  life: 'life',
  light: 'light',
  trickery: 'trickery',
  war: 'war',
  arcana: 'arcana',
  knowledge: 'knowledge',
  grave: 'grave',
  magiya: 'arcana',
  znaniya: 'knowledge',
  upokoeniya: 'grave',
}

function resolveSubclassSlug(suffix: string): string {
  const key = (suffix || 'life').replace(/[^a-z]/g, '')
  const base = SUBCLASS_SUFFIX[key] ?? key
  if (base === 'life') return 'cleric__life-domain'
  if (base === 'light') return 'cleric__light-domain'
  if (base === 'trickery') return 'cleric__trickery-domain'
  if (base === 'war') return 'cleric__war-domain'
  if (base === 'arcana') return 'cleric__arcana-domain'
  if (base === 'knowledge') return 'cleric__knowledge-domain'
  if (base === 'grave') return 'cleric__grave-domain'
  return `cleric__${base}`
}

/** `cleric5`, `cleric3arcana`, `cleric11knowledge`, `cleric17grave` … */
export function parseClericSeed(raw: string): ClericSeedSpec | null {
  const match = /^cleric(\d{1,2})([a-z]*)$/i.exec(raw.trim())
  if (!match) return null
  const level = Math.min(20, Math.max(1, Number(match[1])))
  if (level < 3) return { level, subclassSlug: null }
  const suffix = match[2]?.toLowerCase() ?? ''
  return { level, subclassSlug: resolveSubclassSlug(suffix) }
}

export function clericAsiChoicesForLevel(level: number): Array<{
  classSlug: string
  classLevel: number
  kind: 'asi_plus2'
  abilities: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
}> {
  const gates = [4, 8, 12, 16, 19].filter((g) => g <= level)
  const bumps: Array<Partial<Record<'wis' | 'con', number>>> = [
    { wis: 2 },
    { con: 2 },
    { wis: 2 },
    { con: 2 },
    { wis: 2 },
  ]
  return gates.map((classLevel, index) => ({
    classSlug: 'cleric',
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

function levelRow(clericClass: CatalogEntry, level: number): LevelRow | null {
  const levels = (clericClass.data as { levels?: LevelRow[] } | undefined)?.levels
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
        spellOnClassList(s, 'cleric') &&
        (s.source === 'srd-5.2' || s.source === 'ph24'),
    )
    .map((s) => s.slug)
  const preferred = (PREFERRED[circle] ?? []).filter((slug) => available.includes(slug))
  const rest = available.filter((slug) => !preferred.includes(slug)).sort()
  return [...preferred, ...rest]
}

export function buildClericSeedSpells(
  spells: CatalogEntry[],
  classEntry: CatalogEntry,
  level: number,
): ClericSeedSpells {
  const row = levelRow(classEntry, level)
  const cantripNeed = Number(row?.spellcasting?.cantrips ?? (level >= 10 ? 5 : level >= 4 ? 4 : 3))
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
    preparedSpellIds: [...cantripIds, ...prepared],
  }
}

export function buildClericClassOptionPicks(
  level: number,
  subclassSlug: string | null | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    // Protector avoids the +1 cantrip budget (thaumaturge) so seed cantrips stay stable.
    divine_order: 'protector',
  }
  if (level >= 7) out.blessed_strikes = 'potent_spellcasting'
  const sub = String(subclassSlug || '').toLowerCase()
  if (sub === 'cleric__arcana-domain' && level >= 3) {
    out.student_of_arcana_skill = 'arcana'
    out.student_of_arcana_cantrips = ['mage-hand', 'prestidigitation']
  }
  if (sub === 'cleric__arcana-domain' && level >= 17) {
    out.magical_mastery_6 = 'disintegrate'
    out.magical_mastery_7 = 'teleport'
    out.magical_mastery_8 = 'mind-blank'
    out.magical_mastery_9 = 'foresight'
  }
  if (sub === 'cleric__knowledge-domain' && level >= 3) {
    out.blessings_of_knowledge_tool = 'calligraphers-supplies'
    out.blessings_of_knowledge_skills = ['history', 'arcana']
  }
  if (sub === 'cleric__knowledge-domain' && level >= 6) {
    out.unfettered_mind_save = 'int'
  }
  return out
}
