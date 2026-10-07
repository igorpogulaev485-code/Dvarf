/** PHB/Tasha 2014 subclass grant defs (sheet forks only — no feature text). */

import type { ArmorProfKey, WeaponProfKey } from './classGrants'

export type SubclassChoiceKind = 'single' | 'multi' | 'open_text'
export type SubclassChoiceAppliesTo =
  | 'sheet_field'
  | 'grant'
  | 'flavor_only'
  | 'later_spells'
  | 'companion'

export type SubclassChoiceDef = {
  id: string
  labelRu: string
  kind: SubclassChoiceKind
  count: number
  from: string[] | 'any'
  fromLabelsRu?: Record<string, string>
  appliesTo: SubclassChoiceAppliesTo
  required: boolean
  notesRu?: string
}

export type SubclassSheetGrants = {
  armor: ArmorProfKey[]
  weapons: { simple: boolean; martial: boolean; extras: string[] }
  toolsFixed: string[]
  skillChoices: { count: number; from: string[] | 'any' } | null
  languageChoices: { count: number; from: string[] | 'any' } | null
  caster: { progression: 'third' | 'none'; ability: 'int' | 'wis' | 'cha' | null } | null
}

export type SubclassGrantDef = {
  slug: string
  labelRu: string
  nameEn: string
  parentSlug: string
  grantsLevel: number
  source: string
  sheetGrants: SubclassSheetGrants
  choices: SubclassChoiceDef[]
  notesRu?: string
}

export type SubclassGrantPicks = {
  /** choice.id → selected value(s) or open text */
  values: Record<string, string | string[]>
}

export type AppliedSubclassGrant = {
  classEntryId: string
  catalogId: string | null
  slug: string
  parentSlug: string
  armorKeys: ArmorProfKey[]
  weaponKeys: WeaponProfKey[]
  weaponExtras: string[]
  skills: string[]
  tools: string[]
  languages: string[]
  picks: Record<string, string | string[]>
  caster: { progression: 'third' | 'none'; ability: 'int' | 'wis' | 'cha' | null } | null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function isArmorKey(value: string): value is ArmorProfKey {
  return value === 'light' || value === 'medium' || value === 'heavy' || value === 'shields'
}

function emptySheetGrants(): SubclassSheetGrants {
  return {
    armor: [],
    weapons: { simple: false, martial: false, extras: [] },
    toolsFixed: [],
    skillChoices: null,
    languageChoices: null,
    caster: null,
  }
}

export function emptySubclassPicks(): SubclassGrantPicks {
  return { values: {} }
}

export function parseSubclassGrantDef(input: {
  slug: string
  nameRu: string
  nameEn?: string | null
  parentSlug?: string | null
  catalogData?: Record<string, unknown> | null
}): SubclassGrantDef | null {
  const data = asRecord(input.catalogData)
  const parentSlug =
    (typeof data.parent_slug === 'string' && data.parent_slug) ||
    (typeof input.parentSlug === 'string' && input.parentSlug) ||
    ''
  if (!input.slug || !parentSlug) return null

  const grantsRaw = asRecord(data.sheet_grants)
  const weaponsRaw = asRecord(grantsRaw.weapons)
  const skillRaw = grantsRaw.skill_choices
  const langRaw = grantsRaw.language_choices
  const casterRaw = asRecord(grantsRaw.caster)

  let skillChoices: SubclassSheetGrants['skillChoices'] = null
  if (skillRaw && typeof skillRaw === 'object') {
    const row = skillRaw as Record<string, unknown>
    const count = typeof row.count === 'number' ? row.count : 0
    const from = row.from === 'any' ? 'any' : asStringArray(row.from)
    if (count > 0) skillChoices = { count, from }
  }

  let languageChoices: SubclassSheetGrants['languageChoices'] = null
  if (langRaw && typeof langRaw === 'object') {
    const row = langRaw as Record<string, unknown>
    const count = typeof row.count === 'number' ? row.count : 0
    const from = row.from === 'any' ? 'any' : asStringArray(row.from)
    if (count > 0) languageChoices = { count, from }
  }

  let caster: SubclassSheetGrants['caster'] = null
  if (casterRaw.progression === 'third') {
    const ability =
      casterRaw.ability === 'int' ||
      casterRaw.ability === 'wis' ||
      casterRaw.ability === 'cha'
        ? casterRaw.ability
        : null
    caster = { progression: 'third', ability }
  }

  const choices: SubclassChoiceDef[] = []
  const rawChoices = Array.isArray(data.choices) ? data.choices : []
  for (const item of rawChoices) {
    const row = asRecord(item)
    if (typeof row.id !== 'string' || typeof row.label_ru !== 'string') continue
    const kind =
      row.kind === 'multi' || row.kind === 'open_text' || row.kind === 'single'
        ? row.kind
        : 'single'
    const appliesTo =
      row.applies_to === 'sheet_field' ||
      row.applies_to === 'grant' ||
      row.applies_to === 'flavor_only' ||
      row.applies_to === 'later_spells' ||
      row.applies_to === 'companion'
        ? row.applies_to
        : 'flavor_only'
    const from = row.from === 'any' ? 'any' : asStringArray(row.from)
    const fromLabelsRu =
      row.from_labels_ru && typeof row.from_labels_ru === 'object'
        ? Object.fromEntries(
            Object.entries(row.from_labels_ru as Record<string, unknown>).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string',
            ),
          )
        : undefined
    choices.push({
      id: row.id,
      labelRu: row.label_ru,
      kind,
      count: typeof row.count === 'number' ? Math.max(1, row.count) : 1,
      from,
      fromLabelsRu,
      appliesTo,
      required: row.required !== false,
      notesRu: typeof row.notes_ru === 'string' ? row.notes_ru : undefined,
    })
  }

  return {
    slug: input.slug,
    labelRu: input.nameRu,
    nameEn: input.nameEn ?? '',
    parentSlug,
    grantsLevel:
      typeof data.grants_level === 'number' ? Math.max(1, data.grants_level) : 3,
    source: typeof data.source === 'string' ? data.source : 'phb',
    sheetGrants: {
      armor: asStringArray(grantsRaw.armor).filter(isArmorKey),
      weapons: {
        simple: Boolean(weaponsRaw.simple),
        martial: Boolean(weaponsRaw.martial),
        extras: asStringArray(weaponsRaw.extras),
      },
      toolsFixed: asStringArray(grantsRaw.tools_fixed),
      skillChoices,
      languageChoices,
      caster,
    },
    choices,
    notesRu: typeof data.notes_ru === 'string' ? data.notes_ru : undefined,
  }
}

export function subclassNeedsSetup(def: SubclassGrantDef): boolean {
  if (def.choices.some((choice) => choice.required)) return true
  if (def.sheetGrants.skillChoices && def.sheetGrants.skillChoices.count > 0) {
    // skills may be mirrored in choices; if no choice covers them, still need setup
    const hasSkillChoice = def.choices.some(
      (choice) =>
        choice.appliesTo === 'grant' &&
        (choice.id.includes('skill') || choice.from === 'any' || Array.isArray(choice.from)),
    )
    if (!hasSkillChoice) return true
  }
  if (def.sheetGrants.languageChoices && def.sheetGrants.languageChoices.count > 0) {
    const hasLangChoice = def.choices.some(
      (choice) => choice.appliesTo === 'grant' && choice.id.toLowerCase().includes('lang'),
    )
    if (!hasLangChoice) return true
  }
  return def.choices.length > 0
}

/** True when dialog is needed for player forks (not empty Champion/Berserker). */
export function subclassNeedsSetupDialog(def: SubclassGrantDef): boolean {
  return def.choices.length > 0
}

export function validateSubclassPicks(
  def: SubclassGrantDef,
  picks: SubclassGrantPicks,
): string | null {
  for (const choice of def.choices) {
    if (!choice.required) continue
    const value = picks.values[choice.id]
    if (choice.kind === 'open_text') {
      if (typeof value !== 'string' || !value.trim()) {
        return `Заполни: ${choice.labelRu}`
      }
      continue
    }
    if (choice.kind === 'single') {
      if (typeof value !== 'string' || !value.trim()) {
        return `Выбери: ${choice.labelRu}`
      }
      continue
    }
    if (!Array.isArray(value) || value.length !== choice.count) {
      return `Выбери ${choice.count}: ${choice.labelRu}`
    }
  }
  return null
}

export function formatSubclassGrantSummary(input: {
  def: SubclassGrantDef
  picks: SubclassGrantPicks
}): string {
  const parts: string[] = []
  const g = input.def.sheetGrants
  if (g.armor.length) parts.push(`доспехи: ${g.armor.join(', ')}`)
  if (g.weapons.martial) parts.push('воинское оружие')
  else if (g.weapons.simple) parts.push('простое оружие')
  if (g.weapons.extras.length) parts.push(g.weapons.extras.join(', '))
  if (g.toolsFixed.length) parts.push(g.toolsFixed.join(', '))

  for (const choice of input.def.choices) {
    const value = input.picks.values[choice.id]
    if (value == null) continue
    const label =
      typeof value === 'string'
        ? choice.fromLabelsRu?.[value] ?? value
        : value.map((item) => choice.fromLabelsRu?.[item] ?? item).join(', ')
    if (String(label).trim()) parts.push(`${choice.labelRu}: ${label}`)
  }
  return parts.join(' · ') || 'без доп. владений'
}

export function collectGrantTextSnippets(input: {
  def: SubclassGrantDef | null
  grant: AppliedSubclassGrant | null
}): string[] {
  if (!input.grant) return []
  const lines: string[] = []
  const labels = new Map(
    (input.def?.choices ?? []).map((choice) => [choice.id, choice] as const),
  )
  for (const [id, value] of Object.entries(input.grant.picks)) {
    const choice = labels.get(id)
    const rendered =
      typeof value === 'string'
        ? choice?.fromLabelsRu?.[value] ?? value
        : value.map((item) => choice?.fromLabelsRu?.[item] ?? item).join(', ')
    if (!String(rendered).trim()) continue
    lines.push(`${choice?.labelRu ?? id}: ${rendered}`)
  }
  return lines
}

export function emptyAppliedSubclassGrant(): AppliedSubclassGrant {
  return {
    classEntryId: '',
    catalogId: null,
    slug: '',
    parentSlug: '',
    armorKeys: [],
    weaponKeys: [],
    weaponExtras: [],
    skills: [],
    tools: [],
    languages: [],
    picks: {},
    caster: null,
  }
}

/** @deprecated parse only — empty sheet grants helper kept for tests */
export function _emptySheetGrantsForTests(): SubclassSheetGrants {
  return emptySheetGrants()
}
