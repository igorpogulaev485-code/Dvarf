import {
  createClassLevel,
  ensureClassLevels,
  type ClassLevelEntry,
} from '../../shared/dnd/classLevels'
import { asRecord, readNumber } from './sheetTypes'

export type { ClassLevelEntry }

export function readClassLevels(
  sheet: Record<string, unknown>,
  fallback: {
    className: string
    level: number
    subclassName: string
    classCatalogId: string | null
  },
): ClassLevelEntry[] {
  const raw = sheet.classes
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((item, index) => {
      const row = asRecord(item)
      return createClassLevel({
        id: typeof row.id === 'string' ? row.id : `class-${index}`,
        name: typeof row.name === 'string' ? row.name : '',
        catalog_id: typeof row.catalog_id === 'string' ? row.catalog_id : null,
        level: Math.max(1, readNumber(row.level, 1)),
        subclass_name:
          typeof row.subclass_name === 'string'
            ? row.subclass_name
            : typeof row.subclassName === 'string'
              ? row.subclassName
              : '',
        subclass_catalog_id:
          typeof row.subclass_catalog_id === 'string'
            ? row.subclass_catalog_id
            : typeof row.subclassCatalogId === 'string'
              ? row.subclassCatalogId
              : null,
      })
    })
  }

  return ensureClassLevels({
    classes: [],
    fallbackName: fallback.className,
    fallbackLevel: fallback.level,
    fallbackSubclass: fallback.subclassName,
    fallbackCatalogId: fallback.classCatalogId,
  })
}

export function classLevelsToSheet(classes: ClassLevelEntry[]): {
  classes: Array<{
    id: string
    name: string
    catalog_id: string | null
    level: number
    subclass_name: string
    subclass_catalog_id: string | null
  }>
} {
  return {
    classes: classes.map((row) => ({
      id: row.id,
      name: row.name.trim(),
      catalog_id: row.catalog_id,
      level: Math.max(1, Math.floor(row.level)),
      subclass_name: row.subclass_name.trim(),
      subclass_catalog_id: row.subclass_catalog_id,
    })),
  }
}
