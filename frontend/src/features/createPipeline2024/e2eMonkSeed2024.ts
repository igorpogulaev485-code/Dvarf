/**
 * Internal e2e seeds for the 2024 create monk (`?e2eLeveling=1&e2eSeed=monk11hand`).
 * PHB subclasses (Hand / Mercy / Shadow / Elements) are non-casters.
 * Book path `mystic` / `mysticarts` → Мистический воин (third-caster, sorcerer list).
 */
import type { CatalogEntry } from '../../shared/api/catalog'
import { thirdCasterBlock2024 } from '../../shared/dnd/edition2024Subclasses'
import { spellOnClassList } from './create2024FeatPicks'

export type MonkSeedSpec = {
  level: number
  subclassSlug: string | null
}

export type MonkSeedSpells = {
  cantripIds: string[]
  spellbookSpellIds: string[]
  preparedSpellIds: string[]
}

const SUBCLASS_SUFFIX: Record<string, string> = {
  '': 'hand',
  hand: 'hand',
  openhand: 'hand',
  open: 'hand',
  mercy: 'mercy',
  shadow: 'shadow',
  elements: 'elements',
  elemental: 'elements',
  element: 'elements',
  mystic: 'mystic',
  mysticarts: 'mystic',
  mysticar: 'mystic',
  warriormystic: 'mystic',
}

function resolveSubclassSlug(suffix: string): string {
  const key = (suffix || 'hand').replace(/[^a-z]/g, '')
  const base = SUBCLASS_SUFFIX[key] ?? key
  if (base === 'hand') return 'monk__warrior-of-the-hand'
  if (base === 'mercy') return 'monk__warrior-of-mercy'
  if (base === 'shadow') return 'monk__warrior-of-shadow'
  if (base === 'elements') return 'monk__warrior-of-the-elements'
  if (base === 'mystic') return 'monk__warrior-of-the-mystic-arts'
  return `monk__warrior-of-${base}`
}

/** `monk5`, `monk11hand`, `monk17mercy`, `monk11shadow`, `monk6mystic` … */
export function parseMonkSeed(raw: string): MonkSeedSpec | null {
  const match = /^monk(\d{1,2})([a-z]*)$/i.exec(raw.trim())
  if (!match) return null
  const level = Math.min(20, Math.max(1, Number(match[1])))
  if (level < 3) return { level, subclassSlug: null }
  const suffix = match[2]?.toLowerCase() ?? ''
  return { level, subclassSlug: resolveSubclassSlug(suffix) }
}

/** Default ASI bumps for create-at-N (DEX primary, then WIS). */
export function monkAsiChoicesForLevel(level: number): Array<{
  classSlug: string
  classLevel: number
  kind: 'asi_plus2'
  abilities: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
}> {
  const levels = [4, 8, 12, 16].filter((lv) => lv <= level)
  const bumps: Array<Partial<Record<'dex' | 'wis', number>>> = [
    { dex: 2 },
    { wis: 2 },
    { dex: 2 },
    { wis: 2 },
  ]
  return levels.map((classLevel, i) => ({
    classSlug: 'monk',
    classLevel,
    kind: 'asi_plus2' as const,
    abilities: bumps[i] ?? { dex: 2 },
  }))
}

const PREFERRED: Record<number, string[]> = {
  0: ['blade-ward', 'thunderclap', 'fire-bolt', 'mage-hand', 'prestidigitation', 'ray-of-frost'],
  1: [
    'magic-missile',
    'jump',
    'shield',
    'mage-armor',
    'thunderwave',
    'chromatic-orb',
    'burning-hands',
    'detect-magic',
  ],
  2: ['misty-step', 'invisibility', 'hold-person', 'scorching-ray', 'mirror-image', 'web'],
  3: ['fireball', 'counterspell', 'fly', 'dispel-magic', 'haste'],
  4: ['greater-invisibility', 'dimension-door', 'polymorph', 'banishment'],
}

function spellLevelOf(entry: CatalogEntry): number {
  return Number((entry.data as { level?: number } | undefined)?.level ?? -1)
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

/** Build third-caster picks for Мистический воин (sorcerer list, Wis). */
export function buildMysticArtsSeedSpells(
  spells: readonly CatalogEntry[],
  level: number,
): MonkSeedSpells {
  const third = thirdCasterBlock2024('monk__warrior-of-the-mystic-arts', level)
  if (!third) {
    return { cantripIds: [], spellbookSpellIds: [], preparedSpellIds: [] }
  }
  const cantripNeed = Number(third.cantrips || 0)
  const preparedNeed = Number(third.prepared_spells || 0)
  const top = Math.max(
    1,
    ...Object.entries(third.slots || {})
      .filter(([, n]) => Number(n) > 0)
      .map(([k]) => Number(k)),
  )

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
