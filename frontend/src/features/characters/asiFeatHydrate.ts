/** Rebuild ASI→feat packages missing from the ledger (older create discarded them). */

import type { CatalogEntry } from '../../shared/api/catalog'
import type { AppliedClassAsi } from '../../shared/dnd/classAsi'
import {
  buildAppliedFeatPackage,
  emptyFeatPicks,
  featGrantDefFromCatalog,
  newFeatGrantId,
  type AppliedFeatGrant,
} from '../../shared/dnd/featGrants'

export function findMissingAsiFeatEntries(
  classAsi: AppliedClassAsi[],
  featGrants: AppliedFeatGrant[],
): AppliedClassAsi[] {
  return classAsi.filter((entry) => {
    if (entry.resolution.kind !== 'feat') return false
    const resolution = entry.resolution
    return !featGrants.some(
      (row) =>
        row.id === resolution.featGrantId ||
        (row.source.kind === 'asi' &&
          row.featCatalogId === resolution.featCatalogId &&
          row.source.classEntryId === entry.classEntryId &&
          row.source.featureId === entry.featureId),
    )
  })
}

export function buildAsiFeatGrantFromCatalog(input: {
  entry: AppliedClassAsi
  catalogEntry: CatalogEntry
  characterLevel: number
}): AppliedFeatGrant | null {
  const resolution = input.entry.resolution
  if (resolution.kind !== 'feat') return null
  const def = featGrantDefFromCatalog({
    slug: input.catalogEntry.slug,
    nameRu: input.catalogEntry.name_ru,
    data: input.catalogEntry.data,
  })
  if (!def) return null
  const picks = emptyFeatPicks()
  return {
    id: resolution.featGrantId || newFeatGrantId(),
    featCatalogId: input.catalogEntry.id,
    slug: input.catalogEntry.slug,
    nameRu: input.catalogEntry.name_ru,
    source: {
      kind: 'asi',
      classEntryId: input.entry.classEntryId,
      featureId: input.entry.featureId,
      atClassLevel: input.entry.atClassLevel,
    },
    applied: buildAppliedFeatPackage({
      def,
      picks,
      characterLevel: input.characterLevel,
    }),
    picks,
  }
}

export function matchFeatCatalogEntry(
  rows: CatalogEntry[],
  resolution: Extract<AppliedClassAsi['resolution'], { kind: 'feat' }>,
): CatalogEntry | null {
  const id = resolution.featCatalogId
  const slug = resolution.featSlug.trim().toLowerCase()
  return (
    rows.find((row) => row.id === id) ??
    rows.find((row) => row.slug.trim().toLowerCase() === slug) ??
    null
  )
}
