/**
 * Internal e2e seeds for the 2024 create monk (`?e2eLeveling=1&e2eSeed=monk11hand`).
 * Monk is a non-caster — no spell prep. PHB subclasses only (Hand / Mercy / Shadow / Elements).
 */

export type MonkSeedSpec = {
  level: number
  subclassSlug: string | null
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
}

function resolveSubclassSlug(suffix: string): string {
  const key = (suffix || 'hand').replace(/[^a-z]/g, '')
  const base = SUBCLASS_SUFFIX[key] ?? key
  if (base === 'hand') return 'monk__warrior-of-the-hand'
  if (base === 'mercy') return 'monk__warrior-of-mercy'
  if (base === 'shadow') return 'monk__warrior-of-shadow'
  if (base === 'elements') return 'monk__warrior-of-the-elements'
  return `monk__warrior-of-${base}`
}

/** `monk5`, `monk11hand`, `monk17mercy`, `monk11shadow`, `monk17elements` … */
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
