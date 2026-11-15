/**
 * MAG-01: map a possibly-stale classEntryId to a live row in leveling state.
 * Covers first warlock patron, druid circle, paladin oath, and remapped sole class.
 */
export function resolveClassEntryIdForSubclassCommit(input: {
  classEntryId: string
  classes: Array<{
    id: string
    name?: string
    catalog_id?: string | null
    subclass_name?: string | null
  }>
  preferredClassEntryId?: string | null
  /** Catalog parent of the picked subclass entry. */
  subclassParentCatalogId?: string | null
}): string {
  const rows = input.classes
  if (rows.some((row) => row.id === input.classEntryId)) return input.classEntryId

  const preferred = input.preferredClassEntryId?.trim()
  if (preferred && rows.some((row) => row.id === preferred)) return preferred

  const parentId = input.subclassParentCatalogId?.trim()
  if (parentId) {
    const byParent = rows.find((row) => row.catalog_id === parentId)
    if (byParent) return byParent.id
  }

  if (rows.length === 1) return rows[0]!.id

  const withoutSubclass = rows.find((row) => !String(row.subclass_name ?? '').trim())
  if (withoutSubclass) return withoutSubclass.id

  return ''
}
