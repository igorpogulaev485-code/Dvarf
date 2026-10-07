/** Multiclass class-level helpers for the digital sheet (2014). */

export type ClassLevelEntry = {
  id: string
  name: string
  catalog_id: string | null
  level: number
  subclass_name: string
  subclass_catalog_id: string | null
}

export function createClassLevel(partial?: Partial<ClassLevelEntry>): ClassLevelEntry {
  return {
    id:
      partial?.id ??
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `class-${Date.now()}`),
    name: partial?.name ?? '',
    catalog_id: partial?.catalog_id ?? null,
    level: Math.max(1, Math.floor(partial?.level ?? 1)),
    subclass_name: partial?.subclass_name ?? '',
    subclass_catalog_id: partial?.subclass_catalog_id ?? null,
  }
}

export function totalCharacterLevel(classes: ClassLevelEntry[]): number {
  const sum = classes.reduce((acc, row) => acc + Math.max(0, Math.floor(row.level)), 0)
  return Math.min(20, Math.max(1, sum || 1))
}

export function formatClassSummary(classes: ClassLevelEntry[]): string {
  const parts = classes
    .filter((row) => row.name.trim() && row.level > 0)
    .map((row) => `${row.name.trim()} ${Math.floor(row.level)}`)
  return parts.join(' / ')
}

export function primaryClassName(classes: ClassLevelEntry[]): string {
  const first = classes.find((row) => row.name.trim())
  return first?.name.trim() ?? ''
}

export function bumpClassLevel(
  classes: ClassLevelEntry[],
  classId: string,
): ClassLevelEntry[] {
  return classes.map((row) =>
    row.id === classId ? { ...row, level: Math.min(20, row.level + 1) } : row,
  )
}

export function addMulticlassLevel(
  classes: ClassLevelEntry[],
  input: { name: string; catalog_id?: string | null },
): ClassLevelEntry[] {
  const name = input.name.trim()
  if (!name) return classes
  const existing = classes.find(
    (row) => row.name.trim().toLowerCase() === name.toLowerCase(),
  )
  if (existing) return bumpClassLevel(classes, existing.id)
  return [
    ...classes,
    createClassLevel({
      name,
      catalog_id: input.catalog_id ?? null,
      level: 1,
    }),
  ]
}

export function reduceClassLevel(
  classes: ClassLevelEntry[],
  classId: string,
): ClassLevelEntry[] {
  const next = classes
    .map((row) => {
      if (row.id !== classId) return row
      return { ...row, level: row.level - 1 }
    })
    .filter((row) => row.level > 0)
  if (next.length === 0) {
    const fallback = classes[0]
    return [
      createClassLevel({
        id: fallback?.id,
        name: fallback?.name ?? '',
        catalog_id: fallback?.catalog_id ?? null,
        level: 1,
        subclass_name: fallback?.subclass_name ?? '',
      }),
    ]
  }
  return next
}

export function ensureClassLevels(input: {
  classes: ClassLevelEntry[]
  fallbackName: string
  fallbackLevel: number
  fallbackSubclass?: string
  fallbackCatalogId?: string | null
}): ClassLevelEntry[] {
  if (input.classes.length > 0) {
    return input.classes.map((row) =>
      createClassLevel({
        ...row,
        level: Math.max(1, Math.floor(row.level)),
      }),
    )
  }
  return [
    createClassLevel({
      name: input.fallbackName,
      level: Math.max(1, Math.floor(input.fallbackLevel || 1)),
      subclass_name: input.fallbackSubclass ?? '',
      catalog_id: input.fallbackCatalogId ?? null,
    }),
  ]
}
