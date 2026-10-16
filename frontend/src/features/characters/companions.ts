/** Companion / ally entities for subclass and feature summons. */

export type CompanionKind =
  | 'beast_companion'
  | 'steel_defender'
  | 'eldritch_cannon'
  | 'drake'
  | 'primal_companion'
  | 'familiar'
  /** Temporary combat ally (Wildfire Spirit, etc.) — not a familiar/beast companion. */
  | 'ally'
  | 'other'

export type CompanionEntry = {
  id: string
  kind: CompanionKind
  name: string
  catalog_ref: string | null
  source: {
    classEntryId: string
    subclassSlug: string
    feature: string
  } | null
  stats: {
    hp: number | null
    ac: number | null
    speed: number | null
  }
  notes: string
}

/** Stable id for a feature-summoned ally/companion (replace on re-summon). */
export function featureSummonId(classEntryId: string, featureId: string): string {
  return `feature-summon:${classEntryId}:${featureId}`
}

export function isFeatureSummonId(id: string): boolean {
  return id.startsWith('feature-summon:')
}

export function createCompanion(partial?: Partial<CompanionEntry>): CompanionEntry {
  return {
    id:
      partial?.id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `companion-${Date.now()}`),
    kind: partial?.kind ?? 'other',
    name: partial?.name ?? '',
    catalog_ref: partial?.catalog_ref ?? null,
    source: partial?.source ?? null,
    stats: {
      hp: partial?.stats?.hp ?? null,
      ac: partial?.stats?.ac ?? null,
      speed: partial?.stats?.speed ?? null,
    },
    notes: partial?.notes ?? '',
  }
}

export function readCompanions(raw: unknown): CompanionEntry[] {
  if (!Array.isArray(raw)) return []
  const result: CompanionEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string') continue
    const kind = row.kind
    const validKind: CompanionKind =
      kind === 'beast_companion' ||
      kind === 'steel_defender' ||
      kind === 'eldritch_cannon' ||
      kind === 'drake' ||
      kind === 'primal_companion' ||
      kind === 'familiar' ||
      kind === 'ally' ||
      kind === 'other'
        ? kind
        : 'other'
    const statsRaw =
      row.stats && typeof row.stats === 'object'
        ? (row.stats as Record<string, unknown>)
        : {}
    const sourceRaw =
      row.source && typeof row.source === 'object'
        ? (row.source as Record<string, unknown>)
        : null
    result.push({
      id: row.id,
      kind: validKind,
      name: typeof row.name === 'string' ? row.name : '',
      catalog_ref: typeof row.catalog_ref === 'string' ? row.catalog_ref : null,
      source:
        sourceRaw &&
        typeof sourceRaw.classEntryId === 'string' &&
        typeof sourceRaw.subclassSlug === 'string'
          ? {
              classEntryId: sourceRaw.classEntryId,
              subclassSlug: sourceRaw.subclassSlug,
              feature:
                typeof sourceRaw.feature === 'string' ? sourceRaw.feature : '',
            }
          : null,
      stats: {
        hp: typeof statsRaw.hp === 'number' ? statsRaw.hp : null,
        ac: typeof statsRaw.ac === 'number' ? statsRaw.ac : null,
        speed: typeof statsRaw.speed === 'number' ? statsRaw.speed : null,
      },
      notes: typeof row.notes === 'string' ? row.notes : '',
    })
  }
  return result
}

/** Drop companions tied to a class entry / subclass (Wave C will call on revoke). */
export function revokeCompanionsForSubclass(
  companions: CompanionEntry[],
  classEntryId: string,
  subclassSlug?: string,
): CompanionEntry[] {
  return companions.filter((row) => {
    if (!row.source) return true
    if (row.source.classEntryId !== classEntryId) return true
    if (subclassSlug && row.source.subclassSlug !== subclassSlug) return true
    return false
  })
}

export type FeatureSummonApply = {
  kind: CompanionKind
  nameRu: string
  replaceExisting?: boolean
  notesRu?: string | null
  ac?: number | null
  speed?: number | null
  hpBase?: number | null
  hpPerLevel?: number | null
}

/** Upsert a feature-summoned ally/companion onto the sheet list. */
export function applyFeatureSummon(input: {
  companions: CompanionEntry[]
  classEntryId: string
  subclassSlug: string
  featureId: string
  classLevel: number
  summon: FeatureSummonApply
}): CompanionEntry[] {
  const id = featureSummonId(input.classEntryId, input.featureId)
  const hp =
    input.summon.hpBase != null
      ? Math.max(
          1,
          Math.floor(input.summon.hpBase) +
            Math.floor(input.summon.hpPerLevel ?? 0) *
              Math.max(1, Math.floor(input.classLevel)),
        )
      : null
  const next = createCompanion({
    id,
    kind: input.summon.kind,
    name: input.summon.nameRu,
    notes: input.summon.notesRu ?? '',
    source: {
      classEntryId: input.classEntryId,
      subclassSlug: input.subclassSlug,
      feature: input.featureId,
    },
    stats: {
      hp,
      ac: input.summon.ac ?? null,
      speed: input.summon.speed ?? null,
    },
  })
  // Always one active summon per feature id (Wildfire Spirit, Drake, …).
  const without = input.companions.filter((row) => row.id !== id)
  return [...without, next]
}
