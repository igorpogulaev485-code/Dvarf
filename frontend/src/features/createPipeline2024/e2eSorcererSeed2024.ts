/**
 * Internal e2e seeds for the 2024 create sorcerer (`?e2eLeveling=1&e2eSeed=sorcerer11draconic`).
 * Builds honest sorcerer spells from the loaded catalog: prepared count from the class table,
 * cantrips from the class table, metamagic count 0 / 2 / 4 / 6 by level.
 */
import type { CatalogEntry } from '../../shared/api/catalog'
import { metamagicKnownLimit2024 } from '../../shared/dnd/edition2024ClassOptions'
import { spellOnClassList } from './create2024FeatPicks'

const PREFERRED: Record<number, string[]> = {
  0: ['fire-bolt', 'mage-hand', 'prestidigitation', 'light', 'minor-illusion', 'ray-of-frost'],
  1: [
    'shield',
    'magic-missile',
    'mage-armor',
    'burning-hands',
    'chromatic-orb',
    'sleep',
    'feather-fall',
    'thunderwave',
    'detect-magic',
    'charm-person',
  ],
  2: ['misty-step', 'invisibility', 'hold-person', 'mirror-image', 'scorching-ray', 'web'],
  3: ['fireball', 'counterspell', 'fly', 'dispel-magic', 'haste', 'hypnotic-pattern'],
  4: ['greater-invisibility', 'dimension-door', 'polymorph', 'banishment', 'ice-storm'],
  5: ['cone-of-cold', 'scrying', 'telekinesis', 'wall-of-force'],
  6: ['chain-lightning', 'disintegrate', 'sunbeam', 'globe-of-invulnerability'],
  7: ['teleport', 'finger-of-death', 'prismatic-spray'],
  8: ['power-word-stun', 'sunburst', 'mind-blank'],
  9: ['meteor-swarm', 'time-stop', 'wish'],
}

export type SorcererSeedSpells = {
  cantripIds: string[]
  spellbookSpellIds: string[]
  preparedSpellIds: string[]
}

export type SorcererSeedSpec = {
  level: number
  subclassSlug: string | null
}

const SUBCLASS_SUFFIX: Record<string, string> = {
  '': 'draconic',
  draconic: 'draconic',
  clockwork: 'clockwork',
  aberrant: 'aberrant',
  wild: 'wild',
  wildmagic: 'wild',
  spellfire: 'spellfire',
  shadow: 'shadow',
}

function resolveSubclassSlug(suffix: string): string {
  const key = (suffix || 'draconic').replace(/[^a-z]/g, '')
  const base = SUBCLASS_SUFFIX[key] ?? key
  if (base === 'wild') return 'sorcerer__wild-magic-sorcery'
  return `sorcerer__${base}-sorcery`
}

/** `sorcerer5`, `sorcerer3clockwork`, `sorcerer11draconic` … */
export function parseSorcererSeed(raw: string): SorcererSeedSpec | null {
  const match = /^sorcerer(\d{1,2})([a-z]*)$/i.exec(raw.trim())
  if (!match) return null
  const level = Math.min(20, Math.max(1, Number(match[1])))
  if (level < 3) return { level, subclassSlug: null }
  const suffix = match[2]?.toLowerCase() ?? ''
  return { level, subclassSlug: resolveSubclassSlug(suffix) }
}

const DEFAULT_METAMAGIC = ['careful', 'quickened', 'subtle', 'twinned', 'empowered', 'extended']

export function sorcererMetamagicForLevel(level: number): string[] {
  const cap = metamagicKnownLimit2024(level)
  return DEFAULT_METAMAGIC.slice(0, cap)
}

type LevelRow = {
  level?: number
  spellcasting?: { cantrips?: number; prepared_spells?: number; slots?: Record<string, number> } | null
}

function levelRow(sorcererClass: CatalogEntry, level: number): LevelRow | null {
  const levels = (sorcererClass.data as { levels?: LevelRow[] } | undefined)?.levels
  if (!Array.isArray(levels)) return null
  return levels.find((row) => row?.level === level) ?? null
}

function spellLevelOf(entry: CatalogEntry): number {
  return Number((entry.data as { level?: number } | undefined)?.level ?? -1)
}

function maxCircle(row: LevelRow | null): number {
  const keys = Object.keys(row?.spellcasting?.slots ?? {}).map(Number)
  return keys.length ? Math.max(...keys) : 1
}

function poolForCircle(spells: readonly CatalogEntry[], circle: number): string[] {
  const available = spells
    .filter(
      (s) =>
        spellLevelOf(s) === circle &&
        spellOnClassList(s, 'sorcerer') &&
        (s.source === 'srd-5.2' || s.source === 'ph24'),
    )
    .map((s) => s.slug)
  const preferred = (PREFERRED[circle] ?? []).filter((slug) => available.includes(slug))
  const rest = available.filter((slug) => !preferred.includes(slug)).sort()
  return [...preferred, ...rest]
}

export function buildSorcererSeedSpells(
  spells: readonly CatalogEntry[],
  sorcererClass: CatalogEntry,
  level: number,
): SorcererSeedSpells {
  const row = levelRow(sorcererClass, level)
  const cantripNeed = Number(row?.spellcasting?.cantrips ?? 4)
  const preparedNeed = Number(row?.spellcasting?.prepared_spells ?? 2)
  const top = maxCircle(row)

  const cantripIds = poolForCircle(spells, 0).slice(0, cantripNeed)
  const taken = new Set<string>()
  const prepared: string[] = []
  const take = (circle: number): void => {
    const slug = poolForCircle(spells, circle).find((s) => !taken.has(s))
    if (!slug) return
    taken.add(slug)
    prepared.push(slug)
  }

  for (let round = 0; prepared.length < preparedNeed && round < preparedNeed * 2; round += 1) {
    for (let circle = top; circle >= 1 && prepared.length < preparedNeed; circle -= 1) {
      const before = prepared.length
      take(circle)
      if (prepared.length === before && circle === 1) break
    }
  }

  return {
    cantripIds,
    spellbookSpellIds: [],
    preparedSpellIds: prepared.slice(0, preparedNeed),
  }
}