/**
 * Internal e2e seeds for the 2024 create fighter (`?e2eLeveling=1&e2eSeed=fighter11archer`).
 * Book paths: Arcane Archer (AU) + Banneret / «Знаменосец» (FRHoF).
 */
import { arcaneShotsKnown2024, ARCANE_SHOT_IDS_2024 } from '../../shared/dnd/fighterBook2024Features'

export type FighterSeedSpec = {
  level: number
  subclassSlug: string | null
}

const SUBCLASS_SUFFIX: Record<string, string> = {
  '': 'champion',
  champion: 'champion',
  battlemaster: 'battlemaster',
  bm: 'battlemaster',
  eldritchknight: 'eldritch-knight',
  ek: 'eldritch-knight',
  psiwarrior: 'psi-warrior',
  psi: 'psi-warrior',
  archer: 'arcane-archer',
  arcanearcher: 'arcane-archer',
  banneret: 'banneret',
  znam: 'banneret',
  znamyenosets: 'banneret',
}

function resolveSubclassSlug(suffix: string): string {
  const key = (suffix || 'champion').replace(/[^a-z]/g, '')
  const base = SUBCLASS_SUFFIX[key] ?? key
  return `fighter__${base}`
}

/** `fighter5`, `fighter3archer`, `fighter11banneret`, `fighter18archer` … */
export function parseFighterSeed(raw: string): FighterSeedSpec | null {
  const match = /^fighter(\d{1,2})([a-z]*)$/i.exec(raw.trim())
  if (!match) return null
  const level = Math.min(20, Math.max(1, Number(match[1])))
  const suffix = match[2]?.toLowerCase() ?? ''
  // Bare `fighter5` (no suffix) keeps the static seed in CreateCharacter2024Page.
  if (!suffix) return null
  if (level < 3) return { level, subclassSlug: null }
  return { level, subclassSlug: resolveSubclassSlug(suffix) }
}

export function fighterAsiChoicesForLevel(
  level: number,
  subclassSlug: string | null,
): Array<{
  classSlug: string
  classLevel: number
  kind: 'asi_plus2'
  abilities: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>>
}> {
  const gates = [4, 6, 8, 12, 14, 16, 19].filter((g) => g <= level)
  const archer = subclassSlug === 'fighter__arcane-archer'
  const banneret = subclassSlug === 'fighter__banneret'
  // Keep finals ≤20: seed bases are 15 + soldier +2/+1 on the primary physical score.
  // Archer primary DEX ends at 19 after one ASI; Banneret primary STR the same.
  const bumps: Array<Partial<Record<'str' | 'dex' | 'con' | 'int' | 'cha', number>>> = archer
    ? [
        { dex: 2 }, // 17→19
        { int: 2 },
        { con: 2 },
        { int: 2 },
        { con: 2 },
        { wis: 2 },
        { con: 2 },
      ]
    : banneret
      ? [
          { str: 2 }, // 17→19
          { cha: 2 },
          { con: 2 },
          { cha: 2 },
          { con: 2 },
          { wis: 2 },
          { con: 2 },
        ]
      : [
          { str: 2 },
          { con: 2 },
          { dex: 2 },
          { con: 2 },
          { str: 2 },
          { dex: 2 },
          { con: 2 },
        ]
  return gates.map((classLevel, index) => ({
    classSlug: 'fighter',
    classLevel,
    kind: 'asi_plus2' as const,
    abilities: bumps[index] ?? { con: 2 },
  }))
}

export function buildFighterClassOptionPicks(
  level: number,
  subclassSlug: string | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (subclassSlug === 'fighter__arcane-archer' && level >= 3) {
    out.arcane_archer_lore_cantrip = 'prestidigitation'
    const need = arcaneShotsKnown2024(level)
    out.arcane_shot_options = ARCANE_SHOT_IDS_2024.slice(0, need)
  }
  if (subclassSlug === 'fighter__banneret' && level >= 3) {
    out.knightly_envoy_language = 'elvish'
    out.knightly_envoy_skill = 'persuasion'
  }
  return out
}
