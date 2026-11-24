/**
 * Forge Domain (XGtE 2014) passive combat math:
 * Soul of the Forge (L6) — fire resistance; +1 AC in heavy armor.
 * Saint of Forge and Fire (L17) — fire immunity; nonmagical B/P/S resistance in heavy armor.
 */

export type ForgeFeatureDefenseLine = {
  type: string
  source: string
  kind?: 'resistance' | 'immunity'
  nonmagical?: boolean
}

const SOUL_ID = 'soul_of_the_forge'
const SAINT_ID = 'saint_of_forge_and_fire'
const SOUL_NAME = 'Душа кузницы'
const SAINT_NAME = 'Святой кузницы и огня'

export function forgeDomainAcBonus(input: {
  features: Array<{ id: string }>
  wearingHeavyArmor: boolean
}): number {
  if (!input.wearingHeavyArmor) return 0
  if (!input.features.some((row) => row.id === SOUL_ID)) return 0
  return 1
}

export function forgeDomainDefenseLines(input: {
  features: Array<{ id: string }>
  wearingHeavyArmor: boolean
}): ForgeFeatureDefenseLine[] {
  const ids = new Set(input.features.map((row) => row.id))
  const hasSoul = ids.has(SOUL_ID)
  const hasSaint = ids.has(SAINT_ID)
  const out: ForgeFeatureDefenseLine[] = []
  if (hasSaint) {
    out.push({ type: 'огонь', source: SAINT_NAME, kind: 'immunity' })
  } else if (hasSoul) {
    out.push({ type: 'огонь', source: SOUL_NAME, kind: 'resistance' })
  }
  if (hasSaint && input.wearingHeavyArmor) {
    for (const type of ['дробящий', 'колющий', 'рубящий'] as const) {
      out.push({
        type,
        source: SAINT_NAME,
        kind: 'resistance',
        nonmagical: true,
      })
    }
  }
  return out
}
