/**
 * Polymorph / Shapechange / True Polymorph → self_form (v1: self only).
 * See docs/forms-feature-plan.md F5.
 */

import {
  createCompanion,
  dismissSelfForm,
  getActiveSelfForm,
  normalizeSelfForms,
  type CompanionEntry,
} from './companions'
import { createKnownForm, upsertKnownForm, type KnownForm } from './knownForms'
import { spellKeyFromName, type SheetSpell } from './spells'
import {
  parseCr,
  type BestiaryFormPick,
} from './wildShape'

export type SpellSelfFormSlug =
  | 'polymorph'
  | 'shapechange'
  | 'true_polymorph'

const SPELL_SELF_FORM_DEFAULTS: Record<
  SpellSelfFormSlug,
  { titleRu: string; durationMinutes: number }
> = {
  polymorph: { titleRu: 'Превращение', durationMinutes: 60 },
  shapechange: { titleRu: 'Смена облика', durationMinutes: 60 },
  true_polymorph: { titleRu: 'Истинное превращение', durationMinutes: 60 },
}

const NAME_KEY_TO_SELF_FORM: Record<string, SpellSelfFormSlug | ''> = {
  polymorph: 'polymorph',
  'превращение': 'polymorph',
  shapechange: 'shapechange',
  'смена-облика': 'shapechange',
  'смена_облика': 'shapechange',
  true_polymorph: 'true_polymorph',
  'true-polymorph': 'true_polymorph',
  'истинное-превращение': 'true_polymorph',
  'истинное_превращение': 'true_polymorph',
}

export function resolveSpellSelfFormSlug(
  spell: Pick<SheetSpell, 'name'> | string,
): SpellSelfFormSlug | null {
  const key =
    typeof spell === 'string'
      ? spellKeyFromName(spell)
      : spellKeyFromName(spell.name)
  const compact = key.replace(/-/g, '_')
  if (Object.prototype.hasOwnProperty.call(NAME_KEY_TO_SELF_FORM, key)) {
    return NAME_KEY_TO_SELF_FORM[key] || null
  }
  if (Object.prototype.hasOwnProperty.call(NAME_KEY_TO_SELF_FORM, compact)) {
    return NAME_KEY_TO_SELF_FORM[compact] || null
  }
  if (
    compact.includes('true_polymorph') ||
    compact.includes('истинное_превращение') ||
    compact.includes('истинное-превращение')
  ) {
    return 'true_polymorph'
  }
  if (compact.includes('shapechange') || compact.includes('смена_облика')) {
    return 'shapechange'
  }
  if (compact === 'polymorph' || compact.includes('polymorph')) {
    return 'polymorph'
  }
  if (compact === 'превращение' || compact.includes('превращение')) {
    return 'polymorph'
  }
  return null
}

export function isSpellSelfFormCast(spell: SheetSpell): boolean {
  return resolveSpellSelfFormSlug(spell) != null
}

export type SpellFormLimits = {
  slug: SpellSelfFormSlug
  maxCr: number
  /** If set, only these creature types (EN). Empty = any. */
  allowedTypes: string[]
  /** Types never allowed. */
  forbiddenTypes: string[]
  labelRu: string
}

export function spellFormLimits(input: {
  slug: SpellSelfFormSlug
  characterLevel: number
}): SpellFormLimits {
  const level = Math.max(1, Math.min(20, Math.floor(input.characterLevel) || 1))
  const meta = SPELL_SELF_FORM_DEFAULTS[input.slug]
  if (input.slug === 'polymorph') {
    return {
      slug: input.slug,
      maxCr: level,
      allowedTypes: ['beast'],
      forbiddenTypes: [],
      labelRu: meta.titleRu,
    }
  }
  if (input.slug === 'shapechange') {
    return {
      slug: input.slug,
      maxCr: level,
      allowedTypes: [],
      forbiddenTypes: ['undead', 'construct'],
      labelRu: meta.titleRu,
    }
  }
  return {
    slug: input.slug,
    maxCr: level,
    allowedTypes: [],
    forbiddenTypes: [],
    labelRu: meta.titleRu,
  }
}

export function spellFormPickAllowed(
  pick: BestiaryFormPick,
  limits: SpellFormLimits,
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

export function applySpellSelfForm(input: {
  companions: CompanionEntry[]
  knownForms: KnownForm[]
  spell: SheetSpell
  slug: SpellSelfFormSlug
  pick: BestiaryFormPick
  hostHp: number
  hostHpMax: number
  characterLevel: number
}): { companions: CompanionEntry[]; knownForms: KnownForm[] } {
  const meta = SPELL_SELF_FORM_DEFAULTS[input.slug]
  const previousPrimaryId = capturePreviousPrimaryId(input.companions)
  // Drop any prior active form without overflow.
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
    notes: `${meta.titleRu} · CR ${input.pick.cr} · концентрация`,
    source: {
      kind: 'spell',
      labelRu: `Заклинание: ${input.spell.name || meta.titleRu}`,
      feature: `spell:${input.slug}`,
      spellId: input.spell.id,
    },
    form: {
      form_source: 'spell',
      form_source_ref: `spell:${input.slug}`,
      host_hp_at_enter: input.hostHp,
      host_hp_max_at_enter: input.hostHpMax,
      duration_minutes: meta.durationMinutes,
      entered_at: new Date().toISOString(),
      previous_primary_id: previousPrimaryId,
    },
  })

  const tags: KnownForm['tags'] = []
  if (input.pick.type === 'elemental') tags.push('elemental')
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

/** Concentration end: remove spell-linked self_form (not just deactivate). */
export function dismissSpellSelfFormsForConcentration(input: {
  companions: CompanionEntry[]
  endedSpellId: string | null | undefined
  endedSpellName?: string | null
}): { companions: CompanionEntry[]; dismissedNames: string[] } {
  const names: string[] = []
  const endedSlug = input.endedSpellName
    ? resolveSpellSelfFormSlug(input.endedSpellName)
    : null
  const targets = input.companions.filter((row) => {
    if (row.role !== 'self_form' || row.source?.kind !== 'spell') return false
    if (input.endedSpellId && row.source.spellId === input.endedSpellId) {
      return true
    }
    if (endedSlug && row.source.feature === `spell:${endedSlug}`) return true
    return false
  })
  if (targets.length === 0) {
    return { companions: input.companions, dismissedNames: [] }
  }
  let next = input.companions
  for (const target of targets) {
    names.push(target.name.trim() || 'Облик')
    next = dismissSelfForm({
      companions: next,
      formId: target.id,
      keepRow: false,
    }).companions
  }
  return { companions: next, dismissedNames: names }
}

export function activeSpellSelfForm(
  companions: CompanionEntry[],
): CompanionEntry | null {
  const form = getActiveSelfForm(companions)
  if (!form || form.source?.kind !== 'spell') return null
  return form
}
