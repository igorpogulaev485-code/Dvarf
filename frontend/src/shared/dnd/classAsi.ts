/** Class level ASI (+2 / +1+1) with feat scaffold for later catalog. */

import type { ClassFeatureDef } from './classFeatures'

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type ClassAsiModeId = 'plus2' | 'plus1x2'

export type ClassAsiResolution =
  | { kind: 'scores'; modeId: ClassAsiModeId; keys: AbilityKey[] }
  | { kind: 'feat'; featId: string | null; status: 'coming_soon' }

export type AppliedClassAsi = {
  classEntryId: string
  featureId: string
  atClassLevel: number
  resolution: ClassAsiResolution
  /** Bonuses applied to scores (empty for feat scaffold). */
  bonuses: Partial<Record<AbilityKey, number>>
}

export const CLASS_ASI_MODE_OPTIONS: Array<{
  id: ClassAsiModeId
  labelRu: string
  amounts: number[]
}> = [
  { id: 'plus2', labelRu: '+2 к одной характеристике', amounts: [2] },
  { id: 'plus1x2', labelRu: '+1 к двум характеристикам', amounts: [1, 1] },
]

const ASI_SCORE_CAP = 20

export function isAsiFeature(feature: Pick<ClassFeatureDef, 'id' | 'name_en'>): boolean {
  if (feature.id.startsWith('asi_')) return true
  return feature.name_en === 'Ability Score Improvement'
}

export function findAsiFeatureAtLevel(
  features: ClassFeatureDef[],
  classLevel: number,
): ClassFeatureDef | null {
  return (
    features.find((feature) => feature.level === classLevel && isAsiFeature(feature)) ?? null
  )
}

export function asiAlreadyApplied(
  ledger: AppliedClassAsi[],
  classEntryId: string,
  featureId: string,
): boolean {
  return ledger.some(
    (row) => row.classEntryId === classEntryId && row.featureId === featureId,
  )
}

export function validateClassAsiPicks(input: {
  modeId: ClassAsiModeId
  keys: AbilityKey[]
  abilities: Record<AbilityKey, number>
}): { ok: true; bonuses: Partial<Record<AbilityKey, number>> } | { ok: false; reason: string } {
  const mode = CLASS_ASI_MODE_OPTIONS.find((row) => row.id === input.modeId)
  if (!mode) return { ok: false, reason: 'Неизвестный вариант ASI' }
  if (input.keys.length !== mode.amounts.length) {
    return { ok: false, reason: `Выбери ${mode.amounts.length} характеристику(и)` }
  }
  if (mode.id === 'plus1x2' && input.keys[0] === input.keys[1]) {
    return { ok: false, reason: 'Для +1/+1 выбери две разные характеристики' }
  }
  const bonuses: Partial<Record<AbilityKey, number>> = {}
  for (let i = 0; i < mode.amounts.length; i += 1) {
    const key = input.keys[i]
    const amount = mode.amounts[i]
    if (!key || !amount) continue
    const next = (input.abilities[key] ?? 10) + amount + (bonuses[key] ?? 0)
    if (next > ASI_SCORE_CAP) {
      return {
        ok: false,
        reason: `Характеристика не может стать выше ${ASI_SCORE_CAP}`,
      }
    }
    bonuses[key] = (bonuses[key] ?? 0) + amount
  }
  return { ok: true, bonuses }
}

export function applyClassAsiBonuses(
  abilities: Record<AbilityKey, number>,
  bonuses: Partial<Record<AbilityKey, number>>,
): Record<AbilityKey, number> {
  const next = { ...abilities }
  for (const [key, amount] of Object.entries(bonuses) as Array<[AbilityKey, number]>) {
    if (!amount) continue
    next[key] = Math.min(ASI_SCORE_CAP, Math.max(1, (next[key] ?? 10) + amount))
  }
  return next
}

export function revokeClassAsiBonuses(
  abilities: Record<AbilityKey, number>,
  bonuses: Partial<Record<AbilityKey, number>>,
): Record<AbilityKey, number> {
  const next = { ...abilities }
  for (const [key, amount] of Object.entries(bonuses) as Array<[AbilityKey, number]>) {
    if (!amount) continue
    next[key] = Math.min(ASI_SCORE_CAP, Math.max(1, (next[key] ?? 10) - amount))
  }
  return next
}

export function readClassAsiLedger(raw: unknown): AppliedClassAsi[] {
  if (!Array.isArray(raw)) return []
  const out: AppliedClassAsi[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.classEntryId !== 'string' || typeof row.featureId !== 'string') continue
    const resolutionRaw =
      row.resolution && typeof row.resolution === 'object'
        ? (row.resolution as Record<string, unknown>)
        : null
    let resolution: ClassAsiResolution
    if (resolutionRaw?.kind === 'feat') {
      resolution = {
        kind: 'feat',
        featId: typeof resolutionRaw.featId === 'string' ? resolutionRaw.featId : null,
        status: 'coming_soon',
      }
    } else if (
      resolutionRaw?.kind === 'scores' &&
      (resolutionRaw.modeId === 'plus2' || resolutionRaw.modeId === 'plus1x2') &&
      Array.isArray(resolutionRaw.keys)
    ) {
      resolution = {
        kind: 'scores',
        modeId: resolutionRaw.modeId,
        keys: resolutionRaw.keys.filter(
          (key): key is AbilityKey =>
            key === 'str' ||
            key === 'dex' ||
            key === 'con' ||
            key === 'int' ||
            key === 'wis' ||
            key === 'cha',
        ),
      }
    } else {
      continue
    }
    const bonusesRaw =
      row.bonuses && typeof row.bonuses === 'object'
        ? (row.bonuses as Record<string, unknown>)
        : {}
    const bonuses: Partial<Record<AbilityKey, number>> = {}
    for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityKey[]) {
      const value = bonusesRaw[key]
      if (typeof value === 'number' && Number.isFinite(value) && value !== 0) {
        bonuses[key] = Math.floor(value)
      }
    }
    out.push({
      classEntryId: row.classEntryId,
      featureId: row.featureId,
      atClassLevel:
        typeof row.atClassLevel === 'number' ? Math.max(1, Math.floor(row.atClassLevel)) : 1,
      resolution,
      bonuses,
    })
  }
  return out
}
