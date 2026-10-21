/**
 * Pact of the Tome (Гримуар): +3 cantrips from any class list.
 * Stored as feature picks; materialized as always-prepared feature spells
 * outside the warlock cantrip budget (prepared_locked + source_kind feature).
 */

import {
  clearFeaturePicksForFeatureIds,
  getFeaturePick,
  getFeaturePickList,
  type FeaturePicksState,
} from '../../shared/dnd/featurePicks'
import type { GuidedWizardStep } from '../../shared/dnd/pendingFeatureChoices'
import {
  WARLOCK_PACT_BOON_GRANTS,
  type WarlockPactBoonId,
} from '../../shared/dnd/warlockInvocations'
import {
  asAlwaysPreparedSpell,
  createSheetSpell,
  featureSpellId,
  type SheetSpell,
  type SpellsState,
} from './spells'

export const PACT_BOON_FEATURE_ID = 'pact_boon'
export const PACT_TOME_CANTRIPS_FEATURE_ID =
  WARLOCK_PACT_BOON_GRANTS.tome.knownCantrips?.pickFeatureId ?? 'pact_tome_cantrips'
export const PACT_TOME_SPELL_SCOPE = 'pact_tome'
export const PACT_TOME_CANTRIPS_LIMIT =
  WARLOCK_PACT_BOON_GRANTS.tome.knownCantrips?.count ?? 3
export const PACT_TOME_LABEL_RU = 'Гримуар'

const WARLOCK_CLASS_RE = /колдун|warlock/i

export type PactTomeResolvedCantrip = {
  slug: string
  nameRu: string
  catalogId?: string | null
}

export function isWarlockClassName(name: string): boolean {
  return WARLOCK_CLASS_RE.test(name.trim())
}

export function isPactTomeSpellId(id: string): boolean {
  return id.startsWith(`feature-spell:${PACT_TOME_SPELL_SCOPE}:`)
}

export function pactTomeSpellId(slug: string): string {
  return featureSpellId(PACT_TOME_SPELL_SCOPE, slug)
}

export function getPactBoonId(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): WarlockPactBoonId | null {
  const raw = getFeaturePick(featurePicks, classEntryId, PACT_BOON_FEATURE_ID)
  if (raw === 'blade' || raw === 'chain' || raw === 'tome') return raw
  return null
}

export function isPactTomeActive(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): boolean {
  return getPactBoonId(featurePicks, classEntryId) === 'tome'
}

export function listPactTomeCantripSlugs(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): string[] {
  return getFeaturePickList(
    featurePicks,
    classEntryId,
    PACT_TOME_CANTRIPS_FEATURE_ID,
  ).slice(0, PACT_TOME_CANTRIPS_LIMIT)
}

export function isPactTomeCantripsComplete(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): boolean {
  if (!isPactTomeActive(featurePicks, classEntryId)) return true
  return (
    listPactTomeCantripSlugs(featurePicks, classEntryId).length >=
    PACT_TOME_CANTRIPS_LIMIT
  )
}

/** Drop tome cantrip picks when pact is not Гримуар. */
export function clearPactTomeCantripsIfNeeded(
  featurePicks: FeaturePicksState,
  classEntryId: string,
): FeaturePicksState {
  if (isPactTomeActive(featurePicks, classEntryId)) return featurePicks
  return clearFeaturePicksForFeatureIds(featurePicks, classEntryId, [
    PACT_TOME_CANTRIPS_FEATURE_ID,
  ])
}

/**
 * After any feature-pick change: if a warlock left Tome, strip cantrip picks.
 * Safe to call for every class entry.
 */
export function sanitizeFeaturePicksForPactBoons(input: {
  featurePicks: FeaturePicksState
  classes: Array<{ id: string; name: string }>
}): FeaturePicksState {
  let next = input.featurePicks
  for (const row of input.classes) {
    if (!isWarlockClassName(row.name)) continue
    next = clearPactTomeCantripsIfNeeded(next, row.id)
  }
  return next
}

function stripPactTomeSpells(known: SheetSpell[]): SheetSpell[] {
  return known.filter((spell) => !isPactTomeSpellId(spell.id))
}

/**
 * Ensure Гримуар cantrips match feature picks.
 * When pact ≠ tome (or class gone): strip all managed rows.
 * resolveSpell supplies catalog name/id for each picked slug.
 */
export function syncPactTomeCantrips(input: {
  spells: SpellsState
  featurePicks: FeaturePicksState
  classes: Array<{ id: string; name: string; level: number }>
  resolveSpell: (slug: string) => PactTomeResolvedCantrip | null
}): { spells: SpellsState; changed: boolean } {
  let known = stripPactTomeSpells(input.spells.known)
  let changed = known.length !== input.spells.known.length

  for (const row of input.classes) {
    if (!isWarlockClassName(row.name) || row.level <= 0) continue
    if (!isPactTomeActive(input.featurePicks, row.id)) continue

    for (const slug of listPactTomeCantripSlugs(input.featurePicks, row.id)) {
      const resolved = input.resolveSpell(slug)
      if (!resolved) continue
      const id = pactTomeSpellId(slug)
      const existing = input.spells.known.find((spell) => spell.id === id)
      const created = asAlwaysPreparedSpell(
        {
          ...(existing ?? createSheetSpell()),
          id,
          name: resolved.nameRu,
          level: 0,
          catalog_id: resolved.catalogId ?? existing?.catalog_id ?? null,
        },
        { source_kind: 'feature', label: PACT_TOME_LABEL_RU },
      )
      if (!existing) changed = true
      known.push(created)
    }
  }

  // Re-detect rename / lock drift on existing rows.
  if (!changed) {
    const beforeIds = input.spells.known.map((s) => s.id).join('|')
    const afterIds = known.map((s) => s.id).join('|')
    changed = beforeIds !== afterIds
  }

  if (!changed) return { spells: input.spells, changed: false }
  return { spells: { ...input.spells, known }, changed: true }
}

export function pactTomeCantripsWizardStep(input: {
  classEntryId: string
  className: string
  classLevel: number
}): Extract<GuidedWizardStep, { kind: 'pact_tome_cantrips' }> {
  const level = Math.max(1, Math.floor(input.classLevel) || 1)
  return {
    id: `pact-tome-cantrips:${input.classEntryId}`,
    kind: 'pact_tome_cantrips',
    classEntryId: input.classEntryId,
    className: input.className.trim() || 'Колдун',
    classLevel: level,
  }
}

/**
 * Insert Гримуар cantrip pick after pact_boon feature_choice (or at end).
 * No-op when pact ≠ tome or already complete / already queued.
 */
export function withPactTomeCantripsStep(
  steps: GuidedWizardStep[],
  input: {
    classEntryId: string
    className: string
    classLevel: number
    featurePicks: FeaturePicksState
  },
): GuidedWizardStep[] {
  if (!isWarlockClassName(input.className)) return steps
  if (!isPactTomeActive(input.featurePicks, input.classEntryId)) return steps
  if (isPactTomeCantripsComplete(input.featurePicks, input.classEntryId)) {
    return steps
  }
  if (
    steps.some(
      (row) =>
        row.kind === 'pact_tome_cantrips' &&
        row.classEntryId === input.classEntryId,
    )
  ) {
    return steps
  }
  const step = pactTomeCantripsWizardStep(input)
  const pactIdx = steps.findIndex(
    (row) =>
      row.kind === 'feature_choice' &&
      row.classEntryId === input.classEntryId &&
      row.featureId === PACT_BOON_FEATURE_ID,
  )
  if (pactIdx >= 0) {
    return [
      ...steps.slice(0, pactIdx + 1),
      step,
      ...steps.slice(pactIdx + 1),
    ]
  }
  return [...steps, step]
}
