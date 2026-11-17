/**
 * Bard Magical Secrets (PHB 10/14/18) and Lore Additional Magical Secrets (PHB 6).
 * Picks are feature_picks of catalog slugs. Sheet rows are materialized by sync.
 *
 * Additional secrets do not count against spells known (prepared_locked).
 * The PHB spells-known table already includes the two general secrets, so those
 * rows stay removable and count toward the bard known budget.
 */

import {
  bardMaxSpellCircle2024,
  isLoreSubclass2024,
  loreDiscoveryEligible2024,
} from '../../shared/dnd/bard2024Features'
import { maxSpellLevelForClassAlone } from '../../shared/dnd/casterProgression'
import { resolveClassFeatureSlug } from '../../shared/dnd/classFeatures'
import {
  getFeaturePickList,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import { bundledSpellBySlug } from './alwaysPreparedSpellEnrichment'
import { bardSpell2024BySlug, bardSpells2024Loaded } from './bardSpellCatalog2024'
import {
  asAlwaysPreparedSpell,
  createSheetSpell,
  featureSpellId,
  sheetSpellFromCatalog,
  type SheetSpell,
  type SpellsState,
} from './spells'

export const ADDITIONAL_MAGICAL_SECRETS_ID = 'additional_magical_secrets'
/** 2024 College of Lore «Доп. магические тайны» (level 6): two Wizard/Druid/Cleric spells. */
export const MAGICAL_DISCOVERIES_ID_2024 = 'magical_discoveries'
export const MAGICAL_SECRET_FEATURE_IDS = [
  'magical_secrets_10',
  'magical_secrets_14',
  'magical_secrets_18',
] as const

export const MAGICAL_SECRETS_PICK_LIMIT = 2

const GENERAL_PREFIX = 'feature-spell:magical_secrets_'
const ADDITIONAL_PREFIX = `feature-spell:${ADDITIONAL_MAGICAL_SECRETS_ID}:`
const DISCOVERIES_PREFIX = `feature-spell:${MAGICAL_DISCOVERIES_ID_2024}:`

export function isAdditionalMagicalSecrets(featureId: string): boolean {
  return featureId === ADDITIONAL_MAGICAL_SECRETS_ID || featureId === MAGICAL_DISCOVERIES_ID_2024
}

export function isMagicalSecretsFeature(featureId: string): boolean {
  return (
    featureId === ADDITIONAL_MAGICAL_SECRETS_ID ||
    featureId === MAGICAL_DISCOVERIES_ID_2024 ||
    (MAGICAL_SECRET_FEATURE_IDS as readonly string[]).includes(featureId)
  )
}

export function magicalSecretsUnlocked(featureId: string, classLevel: number): boolean {
  if (featureId === ADDITIONAL_MAGICAL_SECRETS_ID || featureId === MAGICAL_DISCOVERIES_ID_2024) {
    return classLevel >= 6
  }
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
  return (
    id.startsWith(GENERAL_PREFIX) ||
    id.startsWith(ADDITIONAL_PREFIX) ||
    id.startsWith(DISCOVERIES_PREFIX)
  )
}

type SecretCatalogEntry = {
  id: string
  name_ru: string
  slug?: string
  data?: Record<string, unknown>
}

function secretRow(
  featureId: string,
  classEntryId: string,
  slug: string,
  existing: SheetSpell | undefined,
  entry: SecretCatalogEntry | null = bundledSpellBySlug(slug),
): SheetSpell | null {
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
  if (isAdditionalMagicalSecrets(featureId)) {
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
  /** `2024` uses the Lore discoveries only (2014 secrets 10/14/18 never apply). */
  edition?: string | null
  subclassSlugByEntryId?: Record<string, string>
}): { spells: SpellsState; changed: boolean } {
  const is2024 = String(input.edition ?? '2014').trim() === '2024'
  const catalog2024Ready = !is2024 || bardSpells2024Loaded()
  const desired = new Map<string, SheetSpell>()
  const preserved = new Set<string>()
  for (const row of input.classes) {
    if (resolveClassFeatureSlug(row.name) !== 'bard' || row.level <= 0) continue
    const featureIds = is2024
      ? [MAGICAL_DISCOVERIES_ID_2024]
      : [ADDITIONAL_MAGICAL_SECRETS_ID, ...MAGICAL_SECRET_FEATURE_IDS]
    for (const featureId of featureIds) {
      if (!magicalSecretsUnlocked(featureId, row.level)) continue
      if (is2024 && !isLoreSubclass2024(input.subclassSlugByEntryId?.[row.id])) continue
      if (is2024 && !catalog2024Ready) {
        const prefix = secretSpellId(featureId, row.id, '')
        for (const spell of input.spells.known) {
          if (spell.id.startsWith(prefix)) preserved.add(spell.id)
        }
        continue
      }
      const slugs = getFeaturePickList(input.featurePicks, row.id, featureId).slice(
        0,
        MAGICAL_SECRETS_PICK_LIMIT,
      )
      const cap = is2024 ? bardMaxSpellCircle2024(row.level) : bardSecretsMaxSpellLevel(row.level)
      for (const slug of slugs) {
        const entry: SecretCatalogEntry | null = is2024
          ? (bardSpell2024BySlug(slug)?.entry ?? null)
          : bundledSpellBySlug(slug)
        const level = typeof entry?.data?.level === 'number' ? entry.data.level : null
        if (level == null || level < 0 || level > cap) continue
        if (is2024) {
          const classes = bardSpell2024BySlug(slug)?.classes ?? []
          if (!loreDiscoveryEligible2024({ bardLevel: row.level, spellLevel: level, spellClasses: classes })) {
            continue
          }
        }
        const id = secretSpellId(featureId, row.id, slug)
        const existing = input.spells.known.find((spell) => spell.id === id)
        const built = secretRow(featureId, row.id, slug, existing, entry)
        if (built) desired.set(id, built)
      }
    }
  }

  const kept = input.spells.known.filter(
    (spell) => !isManagedSecretSpellId(spell.id) || preserved.has(spell.id),
  )
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
