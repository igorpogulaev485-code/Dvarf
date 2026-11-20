/**
 * Internal e2e seeds for the 2024 create warlock (`?e2eLeveling=1&e2eSeed=warlock11vestige`).
 * Book paths: Vestige Patron (AU) + Undead (RTW). PHB patron aliases kept for convenience.
 */
import type { CatalogEntry } from '../../shared/api/catalog'
import {
  ELDRITCH_INVOCATIONS_2024,
  warlockInvocationLimit2024,
} from '../../shared/dnd/edition2024ClassOptions'
import type {
  VestigeCompanionType2024,
  VestigeDomain2024,
} from '../../shared/dnd/warlockBook2024Features'
import { spellOnClassList } from './create2024FeatPicks'

const PREFERRED: Record<number, string[]> = {
  0: ['eldritch-blast', 'mage-hand', 'prestidigitation', 'minor-illusion', 'friends', 'blade-ward'],
  1: [
    'hex',
    'armor-of-agathys',
    'hellish-rebuke',
    'charm-person',
    'witch-bolt',
    'tashas-hideous-laughter',
    'comprehend-languages',
    'expeditious-retreat',
  ],
  2: ['misty-step', 'hold-person', 'invisibility', 'mirror-image', 'suggestion', 'darkness'],
  3: ['counterspell', 'fear', 'hypnotic-pattern', 'dispel-magic', 'fly', 'hunger-of-hadar'],
  4: ['banishment', 'dimension-door', 'blight', 'greater-invisibility', 'hallucinatory-terrain'],
  5: ['hold-monster', 'scrying', 'dream', 'synaptic-static', 'teleportation-circle'],
  6: ['true-seeing', 'mass-suggestion', 'circle-of-death', 'eyebite'],
  7: ['forcecage', 'plane-shift', 'finger-of-death'],
  8: ['dominate-monster', 'demiplane', 'feeblemind'],
  9: ['foresight', 'true-polymorph', 'power-word-kill'],
}

/** Default L1-safe invocation order, then higher-level ones without pact prereqs. */
const PREFERRED_INVOCATIONS = [
  'armor-of-shadows',
  'eldritch-mind',
  'pact-of-the-tome',
  'pact-of-the-blade',
  'pact-of-the-chain',
  'devils-sight',
  'fiendish-vigor',
  'mask-of-many-faces',
  'misty-visions',
  'otherworldly-leap',
  'agonizing-blast',
  'eldritch-spear',
  'repelling-blast',
  'ascendant-step',
  'gaze-of-two-minds',
  'gift-of-the-depths',
  'master-of-myriad-forms',
  'one-with-shadows',
  'whispers-of-the-grave',
  'visions-of-distant-realms',
  'witch-sight',
]

export type WarlockSeedSpells = {
  cantripIds: string[]
  spellbookSpellIds: string[]
  preparedSpellIds: string[]
}

export type WarlockSeedSpec = {
  level: number
  subclassSlug: string | null
}

export type WarlockSeedOptionOverrides = {
  vestigeDomain?: VestigeDomain2024
  vestigeCompanionType?: VestigeCompanionType2024
}

const SUBCLASS_SUFFIX: Record<string, string> = {
  '': 'vestige',
  vestige: 'vestige',
  vestigepatron: 'vestige',
  predtecha: 'vestige',
  undead: 'undead',
  undeadpatron: 'undead',
  fiend: 'fiend',
  archfey: 'archfey',
  fey: 'archfey',
  celestial: 'celestial',
  goo: 'goo',
  greatoldone: 'goo',
  oldone: 'goo',
}

function resolveSubclassSlug(suffix: string): string {
  const key = (suffix || 'vestige').replace(/[^a-z]/g, '')
  const base = SUBCLASS_SUFFIX[key] ?? key
  if (base === 'vestige') return 'warlock__vestige-patron'
  if (base === 'undead') return 'warlock__undead'
  if (base === 'fiend') return 'warlock__fiend-patron'
  if (base === 'archfey') return 'warlock__archfey'
  if (base === 'celestial') return 'warlock__celestial-patron'
  if (base === 'goo') return 'warlock__greate-old-one-patron'
  return `warlock__${base}`
}

/** `warlock5`, `warlock3vestige`, `warlock11undead`, `warlock5fiend` … */
export function parseWarlockSeed(raw: string): WarlockSeedSpec | null {
  const match = /^warlock(\d{1,2})([a-z]*)$/i.exec(raw.trim())
  if (!match) return null
  const level = Math.min(20, Math.max(1, Number(match[1])))
  if (level < 3) return { level, subclassSlug: null }
  const suffix = match[2]?.toLowerCase() ?? ''
  return { level, subclassSlug: resolveSubclassSlug(suffix) }
}

/** Create-at ASI bumps (CHA primary, then CON). */
export function warlockAsiChoicesForLevel(level: number): Array<{
  classSlug: string
  classLevel: number
  kind: 'asi_plus2'
  abilities: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
}> {
  const levels = [4, 8, 12, 16, 19].filter((lv) => lv <= level)
  // Base CHA 15 → at most two +2 (→19); rest CON/DEX so create stays ≤20.
  const bumps: Array<Partial<Record<'cha' | 'con' | 'dex', number>>> = [
    { cha: 2 },
    { con: 2 },
    { cha: 2 },
    { con: 2 },
    { dex: 2 },
  ]
  return levels.map((classLevel, i) => ({
    classSlug: 'warlock',
    classLevel,
    kind: 'asi_plus2' as const,
    abilities: bumps[i] ?? { con: 2 },
  }))
}

/**
 * Invocations known up to the class table limit.
 * Prefers L1-safe picks first so create payload can take `.slice(0, 1)`.
 */
export function warlockInvocationsForLevel(level: number): string[] {
  const cap = warlockInvocationLimit2024(level)
  const lv = Math.max(1, Math.min(20, Math.floor(level || 1)))
  const byId = Object.fromEntries(ELDRITCH_INVOCATIONS_2024.map((row) => [row.id, row]))
  const preferred = PREFERRED_INVOCATIONS.filter((id) => {
    const def = byId[id]
    if (!def) return false
    if (def.minLevel > lv) return false
    if (def.requiresPact || def.requiresInvocation) return false
    return true
  })
  const rest = ELDRITCH_INVOCATIONS_2024.filter(
    (row) =>
      row.minLevel <= lv &&
      !row.requiresPact &&
      !row.requiresInvocation &&
      !preferred.includes(row.id),
  ).map((row) => row.id)
  return [...preferred, ...rest].slice(0, cap)
}

/** Vestige create picks (defaults war + fiend; overridable). */
export function warlockVestigeOptionPicks(
  level: number,
  overrides?: WarlockSeedOptionOverrides,
): Record<string, string> {
  if (level < 3) return {}
  return {
    vestige_domain: overrides?.vestigeDomain ?? 'war',
    vestige_companion_type: overrides?.vestigeCompanionType ?? 'fiend',
  }
}

export function buildWarlockClassOptionPicks(
  level: number,
  subclassSlug: string | null,
  overrides?: WarlockSeedOptionOverrides,
): Record<string, unknown> {
  // Create API still validates exactly one L1 invocation; sheet fills the rest.
  const invocations = warlockInvocationsForLevel(Math.max(1, level)).slice(0, 1)
  const picks: Record<string, unknown> = {
    eldritch_invocations: invocations,
  }
  if (subclassSlug === 'warlock__vestige-patron' && level >= 3) {
    Object.assign(picks, warlockVestigeOptionPicks(level, overrides))
  }
  return picks
}

type LevelRow = {
  level?: number
  spellcasting?: {
    cantrips?: number
    prepared_spells?: number
    slots?: Record<string, number>
    pact_slots?: { slot_level?: number; count?: number } | null
  } | null
}

function levelRow(warlockClass: CatalogEntry, level: number): LevelRow | null {
  const levels = (warlockClass.data as { levels?: LevelRow[] } | undefined)?.levels
  if (!Array.isArray(levels)) return null
  return levels.find((row) => row?.level === level) ?? null
}

function spellLevelOf(entry: CatalogEntry): number {
  return Number((entry.data as { level?: number } | undefined)?.level ?? -1)
}

function maxCircle(row: LevelRow | null): number {
  const pact = row?.spellcasting?.pact_slots
  if (pact && Number(pact.count) > 0 && Number(pact.slot_level) >= 1) {
    return Number(pact.slot_level)
  }
  const keys = Object.keys(row?.spellcasting?.slots ?? {}).map(Number)
  return keys.length ? Math.max(...keys) : 1
}

function poolForCircle(spells: readonly CatalogEntry[], circle: number): string[] {
  const available = spells
    .filter(
      (s) =>
        spellLevelOf(s) === circle &&
        spellOnClassList(s, 'warlock') &&
        (s.source === 'srd-5.2' || s.source === 'ph24'),
    )
    .map((s) => s.slug)
  const preferred = (PREFERRED[circle] ?? []).filter((slug) => available.includes(slug))
  const rest = available.filter((slug) => !preferred.includes(slug)).sort()
  return [...preferred, ...rest]
}

/** Pact prepared + cantrips from the warlock class table. */
export function buildWarlockSeedSpells(
  spells: readonly CatalogEntry[],
  warlockClass: CatalogEntry,
  level: number,
): WarlockSeedSpells {
  const row = levelRow(warlockClass, level)
  const cantripNeed = Number(row?.spellcasting?.cantrips ?? 2)
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
