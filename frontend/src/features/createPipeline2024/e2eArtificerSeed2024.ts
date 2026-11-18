/**
 * Internal e2e seeds for the 2024 create artificer (`?e2eLeveling=1&e2eSeed=artificer5reanimator`).
 * Book paths: 5 EFA + RTW Reanimator (P24-M02B-artificer).
 */
import type { CatalogEntry } from '../../shared/api/catalog'
import { spellOnClassList } from './create2024FeatPicks'
import { strangeModificationPickCount2024 } from '../../shared/dnd/artificerBook2024Features'

const PREFERRED: Record<number, string[]> = {
  0: ['acid-splash', 'prestidigitation', 'fire-bolt', 'mage-hand', 'guidance', 'light'],
  1: [
    'cure-wounds',
    'detect-magic',
    'faerie-fire',
    'grease',
    'jump',
    'longstrider',
    'absorb-elements',
    'catapult',
    'disguise-self',
    'identify',
  ],
  2: [
    'aid',
    'blur',
    'heat-metal',
    'invisibility',
    'lesser-restoration',
    'see-invisibility',
    'web',
  ],
  3: ['fly', 'haste', 'revivify', 'dispel-magic', 'protection-from-energy'],
  4: ['freedom-of-movement', 'fabricate', 'stone-shape'],
  5: ['animate-objects', 'wall-of-force', 'creation'],
}

export type ArtificerSeedSpells = {
  cantripIds: string[]
  spellbookSpellIds: string[]
  preparedSpellIds: string[]
}

export type ArtificerSeedSpec = {
  level: number
  subclassSlug: string | null
}

const SUBCLASS_SUFFIX: Record<string, string> = {
  '': 'alchemist',
  alchemist: 'alchemist',
  alchemy: 'alchemist',
  armorer: 'armorer',
  armor: 'armorer',
  artillerist: 'artillerist',
  artillery: 'artillerist',
  battlesmith: 'battle-smith',
  battle: 'battle-smith',
  smith: 'battle-smith',
  cartographer: 'cartographer',
  carto: 'cartographer',
  atlas: 'cartographer',
  reanimator: 'reanimator',
  reanim: 'reanimator',
}

function resolveSubclassSlug(suffix: string): string {
  const key = (suffix || 'alchemist').replace(/[^a-z]/g, '')
  const base = SUBCLASS_SUFFIX[key] ?? key
  return `artificer__${base}`
}

/** `artificer5`, `artificer3alchemist`, `artificer11reanimator`, `artificer15armorer` … */
export function parseArtificerSeed(raw: string): ArtificerSeedSpec | null {
  const match = /^artificer(\d{1,2})([a-z]*)$/i.exec(raw.trim())
  if (!match) return null
  const level = Math.min(20, Math.max(1, Number(match[1])))
  if (level < 3) return { level, subclassSlug: null }
  const suffix = match[2]?.toLowerCase() ?? ''
  return { level, subclassSlug: resolveSubclassSlug(suffix) }
}

export function artificerAsiChoicesForLevel(level: number): Array<{
  classSlug: string
  classLevel: number
  kind: 'asi_plus2'
  abilities: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
}> {
  const gates = [4, 8, 12, 16, 19].filter((g) => g <= level)
  // e2e harness (soldier + dwarf) only accepts ASI into str/dex/con.
  const bumps: Array<Partial<Record<'str' | 'dex' | 'con', number>>> = [
    { dex: 2 },
    { con: 2 },
    { str: 2 },
    { dex: 2 },
    { con: 2 },
  ]
  return gates.map((classLevel, index) => ({
    classSlug: 'artificer',
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
  resources?: { replicate_plans_known?: number } | null
}

function levelRow(artificerClass: CatalogEntry, level: number): LevelRow | null {
  const levels = (artificerClass.data as { levels?: LevelRow[] } | undefined)?.levels
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
        spellOnClassList(s, 'artificer') &&
        (s.source === 'srd-5.2' || s.source === 'ph24' || s.source === 'efa'),
    )
    .map((s) => s.slug)
  const preferred = (PREFERRED[circle] ?? []).filter((slug) => available.includes(slug))
  const rest = available.filter((slug) => !preferred.includes(slug)).sort()
  return [...preferred, ...rest]
}

export function buildArtificerSeedSpells(
  spells: CatalogEntry[],
  classEntry: CatalogEntry,
  level: number,
): ArtificerSeedSpells {
  const row = levelRow(classEntry, level)
  const cantripNeed = Number(row?.spellcasting?.cantrips ?? 2)
  const preparedNeed = Number(row?.spellcasting?.prepared_spells ?? 2)
  const top = maxCircle(row)
  const cantrips: string[] = []
  for (const slug of poolForCircle(spells, 0)) {
    if (cantrips.length >= cantripNeed) break
    cantrips.push(slug)
  }
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
    cantripIds: cantrips.slice(0, cantripNeed),
    spellbookSpellIds: [],
    preparedSpellIds: prepared.slice(0, preparedNeed),
  }
}

const PLAN_IDS = [
  'bag-of-holding',
  'sending-stones',
  'cap-of-water-breathing',
  'goggles-of-night',
  'alchemy-jug',
  'lantern-of-revealing',
  'rope-of-climbing',
  'wand-of-magic-detection',
]

function plansKnown(level: number): number {
  if (level < 2) return 0
  if (level >= 18) return 8
  if (level >= 14) return 7
  if (level >= 10) return 6
  if (level >= 6) return 5
  return 4
}

export function buildArtificerClassOptionPicks(
  level: number,
  subclassSlug: string | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const plans = plansKnown(level)
  if (plans > 0) out.replicate_plans = PLAN_IDS.slice(0, plans)
  if (level >= 11) out.spell_storing_spell = 'cure-wounds'
  if (subclassSlug === 'artificer__armorer' && level >= 3) {
    out.armor_model = 'dreadnaught'
  }
  if (subclassSlug === 'artificer__reanimator') {
    const need = strangeModificationPickCount2024(level)
    if (need > 0) {
      const pool =
        level >= 9
          ? ['magical_conduit', 'ferocity', 'bloated', 'gaunt', 'sodden']
          : ['magical_conduit', 'ferocity']
      out.strange_modifications = pool.slice(0, need)
    }
  }
  return out
}
