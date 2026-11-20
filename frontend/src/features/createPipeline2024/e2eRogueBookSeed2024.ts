/**
 * Internal e2e seeds for 2024 create rogue book paths
 * (`?e2eLeveling=1&e2eSeed=rogue11scion`, `rogue9phantom`, …).
 */
export type RogueBookSeedSpec = {
  level: number
  subclassSlug: string | null
}

const SUBCLASS_SUFFIX: Record<string, string> = {
  scion: 'scion-of-the-three',
  sciono: 'scion-of-the-three',
  three: 'scion-of-the-three',
  phantom: 'phantom',
  fantom: 'phantom',
  thief: 'thief',
  assassin: 'assassin',
  arcanetrickster: 'arcane-trickster',
  at: 'arcane-trickster',
  soulknife: 'soulknife',
  soul: 'soulknife',
}

function resolveSubclassSlug(suffix: string): string {
  const key = (suffix || 'thief').replace(/[^a-z]/g, '')
  const base = SUBCLASS_SUFFIX[key] ?? key
  return `rogue__${base}`
}

/** `rogue5scion`, `rogue11phantom`, `rogue3scion` … */
export function parseRogueBookSeed(raw: string): RogueBookSeedSpec | null {
  const match = /^rogue(\d{1,2})([a-z]*)$/i.exec(raw.trim())
  if (!match) return null
  const level = Math.min(20, Math.max(1, Number(match[1])))
  const suffix = match[2]?.toLowerCase() ?? ''
  // Bare `rogue5` keeps the static PHB seed in CreateCharacter2024Page.
  if (!suffix) return null
  if (level < 3) return { level, subclassSlug: null }
  return { level, subclassSlug: resolveSubclassSlug(suffix) }
}

export function rogueBookAsiChoicesForLevel(
  level: number,
  subclassSlug: string | null,
): Array<{
  classSlug: string
  classLevel: number
  kind: 'asi_plus2'
  abilities: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
}> {
  const gates = [4, 8, 10, 12, 16, 19].filter((g) => g <= level)
  const scion = subclassSlug === 'rogue__scion-of-the-three'
  // Seed bases: DEX 15 + criminal +2 DEX / +1 INT|CON. Keep finals ≤20.
  const bumps: Array<Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>> = scion
    ? [
        { dex: 2 }, // 17→19
        { int: 2 },
        { con: 2 },
        { int: 2 },
        { wis: 2 },
        { con: 2 },
      ]
    : [
        { dex: 2 }, // 17→19
        { con: 2 },
        { wis: 2 },
        { con: 2 },
        { int: 2 },
        { cha: 2 },
      ]
  return gates.map((classLevel, index) => ({
    classSlug: 'rogue',
    classLevel,
    kind: 'asi_plus2' as const,
    abilities: bumps[index] ?? { con: 2 },
  }))
}

export function buildRogueBookClassOptionPicks(
  level: number,
  subclassSlug: string | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    expertise: ['stealth', 'perception'],
  }
  if (level >= 6) {
    out.expertise = ['stealth', 'perception', 'sleight_of_hand', 'acrobatics']
  }
  if (subclassSlug === 'rogue__scion-of-the-three' && level >= 3) {
    out.dread_allegiance_deity = 'baal'
  }
  return out
}
