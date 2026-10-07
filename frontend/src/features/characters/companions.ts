/** Companion entities for subclass/feature summons (Wave C UI; Wave A stores empty list). */

export type CompanionKind =
  | 'beast_companion'
  | 'steel_defender'
  | 'eldritch_cannon'
  | 'drake'
  | 'primal_companion'
  | 'familiar'
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
