/**
 * Feature / item self_form sources (Wizard Shapechanger, cloak-like items, …).
 * See docs/forms-feature-plan.md F6.
 */

import {
  createCompanion,
  dismissSelfForm,
  normalizeSelfForms,
  type CompanionEntry,
  type FormSourceKind,
} from './companions'
import { createKnownForm, upsertKnownForm, type KnownForm } from './knownForms'
import { parseCr, type BestiaryFormPick } from './wildShape'

export type FeatureFormLimits = {
  maxCr: number
  allowedTypes: string[]
  forbiddenTypes: string[]
  labelRu: string
  formSource: FormSourceKind
  formSourceRef: string
  featureId: string
  durationMinutes: number | null
}

/** Transmutation Wizard 10: polymorph self into a beast CR ≤ 1, 1× short rest. */
export function shapechangerFormLimits(): FeatureFormLimits {
  return {
    maxCr: 1,
    allowedTypes: ['beast'],
    forbiddenTypes: [],
    labelRu: 'Перевёртыш',
    formSource: 'feature',
    formSourceRef: 'shapechanger',
    featureId: 'shapechanger',
    durationMinutes: 60,
  }
}

export function featureFormPickAllowed(
  pick: BestiaryFormPick,
  limits: FeatureFormLimits,
): boolean {
  const cr = parseCr(pick.cr)
  if (cr == null || cr > limits.maxCr + 1e-9) return false
  const type = (pick.type || '').toLowerCase()
  if (limits.forbiddenTypes.some((t) => t === type)) return false
  if (limits.allowedTypes.length > 0 && !limits.allowedTypes.includes(type)) {
    return false
  }
  return true
}

function capturePreviousPrimaryId(companions: CompanionEntry[]): string | null {
  const primary = companions.find(
    (row) => row.is_primary && row.role !== 'self_form',
  )
  return primary?.id ?? null
}

function setPrimaryExclusive(
  companions: CompanionEntry[],
  primaryId: string,
): CompanionEntry[] {
  return companions.map((row) => ({
    ...row,
    is_primary: row.id === primaryId,
  }))
}

export function applyFeatureSelfForm(input: {
  companions: CompanionEntry[]
  knownForms: KnownForm[]
  pick: BestiaryFormPick
  hostHp: number
  hostHpMax: number
  limits: FeatureFormLimits
}): { companions: CompanionEntry[]; knownForms: KnownForm[] } {
  const previousPrimaryId = capturePreviousPrimaryId(input.companions)
  const withoutForm = dismissSelfForm({
    companions: input.companions,
    keepRow: false,
  }).companions

  const form = createCompanion({
    role: 'self_form',
    kind: 'transformed_self',
    name: input.pick.name_ru,
    bestiary_ref: input.pick.catalog_id ?? input.pick.slug,
    bestiary_name_ru: input.pick.name_ru,
    nature: 'summoned',
    control: 'with_master',
    active: true,
    is_primary: true,
    stats: {
      hp: input.pick.hp,
      hp_max: input.pick.hp,
      ac: input.pick.ac,
      speed: input.pick.speed_walk,
    },
    actions: input.pick.actions_text,
    notes: `${input.limits.labelRu} · CR ${input.pick.cr}`,
    source: {
      kind: 'feature',
      labelRu: input.limits.labelRu,
      feature: input.limits.featureId,
    },
    form: {
      form_source: input.limits.formSource,
      form_source_ref: input.limits.formSourceRef,
      host_hp_at_enter: input.hostHp,
      host_hp_max_at_enter: input.hostHpMax,
      duration_minutes: input.limits.durationMinutes,
      entered_at: new Date().toISOString(),
      previous_primary_id: previousPrimaryId,
    },
  })

  const tags: KnownForm['tags'] = []
  if ((input.pick.speed_swim ?? 0) > 0) tags.push('swim')
  if ((input.pick.speed_fly ?? 0) > 0) tags.push('fly')

  const known = upsertKnownForm(
    input.knownForms,
    createKnownForm({
      bestiary_ref: input.pick.catalog_id ?? null,
      bestiary_slug: input.pick.slug,
      name_ru: input.pick.name_ru,
      cr: input.pick.cr,
      tags,
      stats_override: {
        hp: input.pick.hp,
        ac: input.pick.ac,
        speed: input.pick.speed_walk,
        actions: input.pick.actions_text,
      },
    }),
  )

  return {
    companions: normalizeSelfForms(
      setPrimaryExclusive([...withoutForm, form], form.id),
    ),
    knownForms: known,
  }
}

/** Item-granted combat form (Cloak of the Bat, …) — same card model. */
export function applyItemSelfForm(input: {
  companions: CompanionEntry[]
  knownForms: KnownForm[]
  pick: BestiaryFormPick
  hostHp: number
  hostHpMax: number
  itemId: string
  labelRu: string
  durationMinutes?: number | null
}): { companions: CompanionEntry[]; knownForms: KnownForm[] } {
  return applyFeatureSelfForm({
    companions: input.companions,
    knownForms: input.knownForms,
    pick: input.pick,
    hostHp: input.hostHp,
    hostHpMax: input.hostHpMax,
    limits: {
      maxCr: 99,
      allowedTypes: [],
      forbiddenTypes: [],
      labelRu: input.labelRu,
      formSource: 'item',
      formSourceRef: input.itemId,
      featureId: `item:${input.itemId}`,
      durationMinutes: input.durationMinutes ?? null,
    },
  })
}

export const FEATURE_SELF_FORM_IDS = new Set(['shapechanger'])

export function isFeatureSelfFormId(featureId: string): boolean {
  return FEATURE_SELF_FORM_IDS.has(featureId)
}
