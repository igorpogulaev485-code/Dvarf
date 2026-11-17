/**
 * Resolve known metamagic option ids for a 2014 sorcerer sheet.
 * Used by CastSpellDialog via the play-desk model — must work for live sheets
 * (UUID class entry ids, catalog_id, unlocked feature cards, stale pick keys).
 */
import type { ClassLevelEntry } from './classLevels'
import { resolveClassCasterSlug } from './casterProgression'
import { resolveClassFeatureSlug } from './classFeatures'
import {
  getFeatureChoicePickList,
  type FeaturePicksState,
} from './featurePicks'

export function collectSorcererMetamagicIds(input: {
  classes: ClassLevelEntry[]
  featurePicks: FeaturePicksState
  unlockedFeatures?: Array<{ id: string; classEntryId?: string | null }>
}): string[] {
  const ids: string[] = []
  const entryIds = new Set<string>()
  for (const row of input.classes) {
    const byName =
      resolveClassCasterSlug(row.name) === 'sorcerer' ||
      resolveClassFeatureSlug(row.name) === 'sorcerer'
    const byCatalog = (row.catalog_id ?? '').trim().toLowerCase() === 'sorcerer'
    if (byName || byCatalog) entryIds.add(row.id)
  }
  for (const feat of input.unlockedFeatures ?? []) {
    if (feat.id === 'metamagic' && feat.classEntryId) entryIds.add(feat.classEntryId)
  }
  for (const entryId of entryIds) {
    ids.push(
      ...getFeatureChoicePickList(input.featurePicks, entryId, 'metamagic', 'metamagic'),
    )
  }
  if (ids.length === 0) {
    for (const [key, raw] of Object.entries(input.featurePicks.values ?? {})) {
      if (!/:metamagic$/i.test(key) || typeof raw !== 'string') continue
      for (const part of raw.split(',')) {
        const t = part.trim()
        if (t) ids.push(t)
      }
    }
  }
  return [...new Set(ids)]
}
