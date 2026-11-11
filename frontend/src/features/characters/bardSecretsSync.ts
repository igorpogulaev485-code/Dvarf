/**
 * Bard Magical Secrets (PHB 10/14/18) and Lore Additional Magical Secrets (PHB 6).
 * Picks are feature_picks of catalog slugs. Sheet rows are materialized by sync.
 *
 * Additional secrets do not count against spells known (prepared_locked).
 * The PHB spells-known table already includes the two general secrets, so those
 * rows stay removable and count toward the bard known budget.
 */

import { maxSpellLevelForClassAlone } from '../../shared/dnd/casterProgression'
import { resolveClassFeatureSlug } from '../../shared/dnd/classFeatures'
import {
  getFeaturePickList,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import { bundledSpellBySlug } from './alwaysPreparedSpellEnrichment'
import {
  asAlwaysPreparedSpell,
  createSheetSpell,
  featureSpellId,
  sheetSpellFromCatalog,
  type SheetSpell,
  type SpellsState,
} from './spells'

export const ADDITIONAL_MAGICAL_SECRETS_ID = 'additional_magical_secrets'
export const MAGICAL_SECRET_FEATURE_IDS = [
  'magical_secrets_10',
  'magical_secrets_14',
  'magical_secrets_18',
] as const

export const MAGICAL_SECRETS_PICK_LIMIT = 2

const GENERAL_PREFIX = 'feature-spell:magical_secrets_'
const ADDITIONAL_PREFIX = `feature-spell:${ADDITIONAL_MAGICAL_SECRETS_ID}:`

export function isAdditionalMagicalSecrets(featureId: string): boolean {
  return featureId === ADDITIONAL_MAGICAL_SECRETS_ID
}

export function isMagicalSecretsFeature(featureId: string): boolean {
  return (
    featureId === ADDITIONAL_MAGICAL_SECRETS_ID ||
    (MAGICAL_SECRET_FEATURE_IDS as readonly string[]).includes(featureId)
  )
}

export function magicalSecretsUnlocked(featureId: string, classLevel: number): boolean {
  if (featureId === ADDITIONAL_MAGICAL_SECRETS_ID) return classLevel >= 6
  if (featureId === 'magical_secrets_10') return classLevel >= 10
  if (featureId === 'magical_secrets_14') return classLevel >= 14
  if (featureId === 'magical_secrets_18') return classLevel >= 18
  return false
}

/** Highest spell circle this bard can cast alone (cantrips are always allowed). */
export function bardSecretsMaxSpellLevel(classLevel: number): number {
  return maxSpellLevelForClassAlone('full', classLevel)
}

export function secretSpellId(featureId: string, classEntryId: string, slug: string): string {
  return featureSpellId(featureId, `${classEntryId}:${slug}`)
}

export function isManagedSecretSpellId(id: string): boolean {
  return id.startsWith(GENERAL_PREFIX) || id.startsWith(ADDITIONAL_PREFIX)
}

function secretRow(
  featureId: string,
  classEntryId: string,
  slug: string,
  existing: SheetSpell | undefined,
): SheetSpell | null {
  const entry = bundledSpellBySlug(slug)
  if (!entry) return null
  const id = secretSpellId(featureId, classEntryId, slug)
  const fromCatalog = sheetSpellFromCatalog({
    id: entry.id,
    name_ru: entry.name_ru,
    slug: entry.slug,
    data: entry.data,
  })
  const base: SheetSpell = {
    ...(existing ?? createSheetSpell()),
    ...fromCatalog,
    id,
    catalog_id: entry.id,
    prepared: true,
    class_slug: 'bard',
    class_entry_id: classEntryId,
  }
  if (featureId === ADDITIONAL_MAGICAL_SECRETS_ID) {
    return asAlwaysPreparedSpell(base, {
      source_kind: 'feature',
      label: 'Доп. магические тайны',
      class_slug: 'bard',
      class_entry_id: classEntryId,
    })
  }
  return {
    ...base,
    prepared_locked: false,
    source_kind: undefined,
    prepare_source_label: 'Магические тайны',
    notes: 'Магические тайны · входит в число известных заклинаний барда',
  }
}

/**
 * Rebuild secret rows from feature picks.
 * Drops managed rows whose slug is no longer picked or whose feature is below level.
 */
export function syncMagicalSecrets(input: {
  spells: SpellsState
  featurePicks: FeaturePicksState
  classes: Array<{ id: string; name: string; level: number }>
}): { spells: SpellsState; changed: boolean } {
  const desired = new Map<string, SheetSpell>()
  for (const row of input.classes) {
    if (resolveClassFeatureSlug(row.name) !== 'bard' || row.level <= 0) continue
    const featureIds = [
      ADDITIONAL_MAGICAL_SECRETS_ID,
      ...MAGICAL_SECRET_FEATURE_IDS,
    ]
    for (const featureId of featureIds) {
      if (!magicalSecretsUnlocked(featureId, row.level)) continue
      const slugs = getFeaturePickList(input.featurePicks, row.id, featureId).slice(
        0,
        MAGICAL_SECRETS_PICK_LIMIT,
      )
      const cap = bardSecretsMaxSpellLevel(row.level)
      for (const slug of slugs) {
        const entry = bundledSpellBySlug(slug)
        const level = typeof entry?.data?.level === 'number' ? entry.data.level : null
        if (level == null || level < 0 || level > cap) continue
        const id = secretSpellId(featureId, row.id, slug)
        const existing = input.spells.known.find((spell) => spell.id === id)
        const built = secretRow(featureId, row.id, slug, existing)
        if (built) desired.set(id, built)
      }
    }
  }

  const kept = input.spells.known.filter((spell) => !isManagedSecretSpellId(spell.id))
  const next = [...kept, ...desired.values()]
  const same =
    next.length === input.spells.known.length &&
    next.every((spell, index) => {
      const prev = input.spells.known[index]
      return (
        prev &&
        prev.id === spell.id &&
        prev.name === spell.name &&
        prev.prepared_locked === spell.prepared_locked &&
        prev.level === spell.level
      )
    })
  if (same) return { spells: input.spells, changed: false }
  return { spells: { ...input.spells, known: next }, changed: true }
}
