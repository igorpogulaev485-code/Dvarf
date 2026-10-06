/** PHB 2014 race grants: catalog.data → picks → ledger (mirrors classGrants). */

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type RaceSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'

export type AbilityBonusChoice = {
  count: number
  amount: number
  from: AbilityKey[] | 'any'
  exclude?: AbilityKey[]
}

export type SkillChoice = {
  count: number
  from: string[] | 'any'
}

export type ToolChoice = {
  count: number
  from: string[]
}

export type RaceAncestryOption = {
  id: string
  labelRu: string
  damage: string
  breath: string
}

export type RaceGrantDef = {
  slug: string
  labelRu: string
  parentSlug: string | null
  selectable: boolean
  speed: number
  size: RaceSize
  darkvision: number
  abilityBonuses: Partial<Record<AbilityKey, number>>
  abilityBonusChoices: AbilityBonusChoice | null
  languages: string[]
  languagesChoose: number
  skillProficiencies: string[]
  skillChoices: SkillChoice | null
  toolProficiencies: string[]
  toolChoices: ToolChoice | null
  weaponProficiencies: string[]
  armorProficiencies: Array<'light' | 'medium' | 'heavy' | 'shields'>
  ancestryChoices: RaceAncestryOption[]
  featNoteRu: string | null
  traitsText: string
}

export type RaceGrantPicks = {
  /** Extra ASI keys chosen via ability_bonus_choices (each gets `amount`). */
  abilityBonusKeys: AbilityKey[]
  languages: string[]
  skills: string[]
  tools: string[]
  ancestryId: string | null
}

export type AppliedRaceGrant = {
  raceCatalogId: string
  slug: string
  parentSlug: string | null
  speed: number
  size: string
  darkvision: number
  abilityBonuses: Partial<Record<AbilityKey, number>>
  languages: string[]
  skills: string[]
  tools: string[]
  armorKeys: Array<'light' | 'medium' | 'heavy' | 'shields'>
  weaponNames: string[]
  traitsText: string
  ancestryId: string | null
  featNoteRu: string | null
}

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']
const SIZE_VALUES: RaceSize[] = [
  'tiny',
  'small',
  'medium',
  'large',
  'huge',
  'gargantuan',
]
const ARMOR_KEYS = ['light', 'medium', 'heavy', 'shields'] as const

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function readStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const name = item.trim().replace(/\s+/g, ' ')
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

function isAbilityKey(value: unknown): value is AbilityKey {
  return typeof value === 'string' && ABILITY_KEYS.includes(value as AbilityKey)
}

function readAbilityBonuses(raw: unknown): Partial<Record<AbilityKey, number>> {
  const obj = asRecord(raw)
  const result: Partial<Record<AbilityKey, number>> = {}
  for (const key of ABILITY_KEYS) {
    const n = readNumber(obj[key], NaN)
    if (Number.isFinite(n) && n !== 0) result[key] = Math.trunc(n)
  }
  return result
}

function readSize(value: unknown): RaceSize {
  return SIZE_VALUES.includes(value as RaceSize) ? (value as RaceSize) : 'medium'
}

function readAbilityBonusChoices(raw: unknown): AbilityBonusChoice | null {
  const obj = asRecord(raw)
  const count = Math.max(0, Math.floor(readNumber(obj.count, 0)))
  if (count <= 0) return null
  const amount = Math.trunc(readNumber(obj.amount, 1)) || 1
  const exclude = Array.isArray(obj.exclude)
    ? obj.exclude.filter(isAbilityKey)
    : undefined
  if (obj.from === 'any' || obj.from == null) {
    return { count, amount, from: 'any', exclude }
  }
  if (!Array.isArray(obj.from)) return null
  const from = obj.from.filter(isAbilityKey)
  if (from.length === 0) return null
  return { count, amount, from, exclude }
}

function readSkillChoice(raw: unknown): SkillChoice | null {
  const obj = asRecord(raw)
  const count = Math.max(0, Math.floor(readNumber(obj.count, 0)))
  if (count <= 0) return null
  if (obj.from === 'any') return { count, from: 'any' }
  if (!Array.isArray(obj.from)) return null
  const from = obj.from.filter((item): item is string => typeof item === 'string')
  if (from.length === 0) return null
  return { count, from }
}

function readToolChoice(raw: unknown): ToolChoice | null {
  const obj = asRecord(raw)
  const count = Math.max(0, Math.floor(readNumber(obj.count, 0)))
  if (count <= 0) return null
  if (!Array.isArray(obj.from)) return null
  const from = readStringList(obj.from)
  if (from.length === 0) return null
  return { count, from }
}

function readAncestries(raw: unknown): RaceAncestryOption[] {
  if (!Array.isArray(raw)) return []
  const out: RaceAncestryOption[] = []
  for (const item of raw) {
    const row = asRecord(item)
    if (typeof row.id !== 'string' || typeof row.label_ru !== 'string') continue
    out.push({
      id: row.id,
      labelRu: row.label_ru,
      damage: typeof row.damage === 'string' ? row.damage : '',
      breath: typeof row.breath === 'string' ? row.breath : '',
    })
  }
  return out
}

function readArmor(raw: unknown): RaceGrantDef['armorProficiencies'] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (item): item is RaceGrantDef['armorProficiencies'][number] =>
      typeof item === 'string' &&
      (ARMOR_KEYS as readonly string[]).includes(item),
  )
}

export function catalogHasRaceGrantData(data: Record<string, unknown>): boolean {
  return (
    data.speed != null ||
    data.ability_bonuses != null ||
    data.traits_text != null ||
    data.languages != null
  )
}

export function isRaceSelectable(data: Record<string, unknown> | null | undefined): boolean {
  if (!data) return true
  if (data.selectable === false) return false
  return true
}

/** Combobox shows only root races; subraces are picked inside RaceSetupDialog. */
export function isRaceComboboxRoot(entry: {
  parent_id?: string | null
}): boolean {
  return entry.parent_id == null
}

export function raceSubraceRequired(
  data: Record<string, unknown> | null | undefined,
): boolean {
  if (!data) return false
  return data.subrace_required === true
}

export function raceGrantDefFromCatalog(input: {
  slug: string
  nameRu: string
  parentSlug?: string | null
  data: Record<string, unknown>
}): RaceGrantDef | null {
  if (!catalogHasRaceGrantData(input.data)) return null
  const data = input.data
  const parentFromData =
    typeof data.parent_slug === 'string'
      ? data.parent_slug
      : typeof data.parentSlug === 'string'
        ? data.parentSlug
        : null
  return {
    slug: input.slug,
    labelRu: input.nameRu,
    parentSlug: input.parentSlug ?? parentFromData,
    selectable: isRaceSelectable(data),
    speed: Math.max(0, Math.floor(readNumber(data.speed, 30))),
    size: readSize(data.size),
    darkvision: Math.max(0, Math.floor(readNumber(data.darkvision, 0))),
    abilityBonuses: readAbilityBonuses(data.ability_bonuses ?? data.abilityBonuses),
    abilityBonusChoices: readAbilityBonusChoices(
      data.ability_bonus_choices ?? data.abilityBonusChoices,
    ),
    languages: readStringList(data.languages),
    languagesChoose: Math.max(0, Math.floor(readNumber(data.languages_choose, 0))),
    skillProficiencies: readStringList(
      data.skill_proficiencies ?? data.skillProficiencies,
    ),
    skillChoices: readSkillChoice(data.skill_choices ?? data.skillChoices),
    toolProficiencies: readStringList(
      data.tool_proficiencies ?? data.toolProficiencies,
    ),
    toolChoices: readToolChoice(data.tool_choices ?? data.toolChoices),
    weaponProficiencies: readStringList(
      data.weapon_proficiencies ?? data.weaponProficiencies,
    ),
    armorProficiencies: readArmor(data.armor_proficiencies ?? data.armorProficiencies),
    ancestryChoices: readAncestries(data.ancestry_choices ?? data.ancestryChoices),
    featNoteRu:
      typeof data.feat_note_ru === 'string'
        ? data.feat_note_ru
        : typeof data.featNoteRu === 'string'
          ? data.featNoteRu
          : null,
    traitsText:
      typeof data.traits_text === 'string'
        ? data.traits_text.trim()
        : typeof data.traitsText === 'string'
          ? data.traitsText.trim()
          : '',
  }
}

export function resolveRaceGrantDef(input: {
  raceName: string
  catalogSlug?: string | null
  catalogData?: Record<string, unknown> | null
  parentSlug?: string | null
  nameRu?: string | null
}): RaceGrantDef | null {
  const slug = (input.catalogSlug && input.catalogSlug.trim()) || ''
  const label =
    (input.nameRu && input.nameRu.trim()) ||
    input.raceName.trim() ||
    slug ||
    ''
  if (!slug || !input.catalogData) return null
  return raceGrantDefFromCatalog({
    slug,
    nameRu: label || slug,
    parentSlug: input.parentSlug,
    data: input.catalogData,
  })
}

export function emptyRacePicks(): RaceGrantPicks {
  return {
    abilityBonusKeys: [],
    languages: [],
    skills: [],
    tools: [],
    ancestryId: null,
  }
}

export function raceGrantNeedsSetupDialog(def: RaceGrantDef): boolean {
  if ((def.abilityBonusChoices?.count ?? 0) > 0) return true
  if (def.languagesChoose > 0) return true
  if ((def.skillChoices?.count ?? 0) > 0) return true
  if ((def.toolChoices?.count ?? 0) > 0) return true
  if (def.ancestryChoices.length > 0) return true
  if (def.featNoteRu) return true
  // Still open once so user confirms traits/ASI even without picks.
  return true
}

export function abilityKeysForBonusChoice(choice: AbilityBonusChoice): AbilityKey[] {
  const exclude = new Set(choice.exclude ?? [])
  const pool =
    choice.from === 'any'
      ? ABILITY_KEYS
      : choice.from
  return pool.filter((key) => !exclude.has(key))
}

export function validateRaceGrantPicks(input: {
  def: RaceGrantDef
  picks: RaceGrantPicks
}): string | null {
  const { def, picks } = input
  const asi = def.abilityBonusChoices
  if (asi) {
    if (picks.abilityBonusKeys.length !== asi.count) {
      return `Выбери характеристики: ${asi.count}`
    }
    const allowed = new Set(abilityKeysForBonusChoice(asi))
    if (picks.abilityBonusKeys.some((key) => !allowed.has(key))) {
      return 'Характеристика вне списка расы'
    }
    if (new Set(picks.abilityBonusKeys).size !== picks.abilityBonusKeys.length) {
      return 'Нельзя выбрать одну характеристику дважды'
    }
  } else if (picks.abilityBonusKeys.length > 0) {
    return 'Лишние бонусы характеристик'
  }

  if (picks.languages.length !== def.languagesChoose) {
    return `Выбери языки: ${def.languagesChoose}`
  }

  const skillNeed = def.skillChoices?.count ?? 0
  if (picks.skills.length !== skillNeed) {
    return `Выбери навыки: ${skillNeed}`
  }
  if (def.skillChoices && def.skillChoices.from !== 'any') {
    const allowed = new Set(def.skillChoices.from)
    if (picks.skills.some((key) => !allowed.has(key))) {
      return 'Навык вне списка расы'
    }
  }

  const toolNeed = def.toolChoices?.count ?? 0
  if (picks.tools.length !== toolNeed) {
    return `Выбери инструменты: ${toolNeed}`
  }
  if (def.toolChoices) {
    const allowed = new Set(def.toolChoices.from.map((item) => item.toLowerCase()))
    if (picks.tools.some((name) => !allowed.has(name.trim().toLowerCase()))) {
      return 'Инструмент вне списка расы'
    }
  }

  if (def.ancestryChoices.length > 0) {
    if (!picks.ancestryId) return 'Выбери драконье происхождение'
    if (!def.ancestryChoices.some((row) => row.id === picks.ancestryId)) {
      return 'Неизвестное происхождение'
    }
  }

  return null
}

export function mergeAbilityBonuses(
  fixed: Partial<Record<AbilityKey, number>>,
  choice: AbilityBonusChoice | null,
  picks: AbilityKey[],
): Partial<Record<AbilityKey, number>> {
  const result: Partial<Record<AbilityKey, number>> = { ...fixed }
  if (!choice) return result
  for (const key of picks) {
    result[key] = (result[key] ?? 0) + choice.amount
  }
  return result
}

export function buildTraitsWithPicks(input: {
  def: RaceGrantDef
  picks: RaceGrantPicks
}): string {
  const parts = [input.def.traitsText]
  if (input.picks.ancestryId) {
    const ancestry = input.def.ancestryChoices.find(
      (row) => row.id === input.picks.ancestryId,
    )
    if (ancestry) {
      parts.push(
        `Происхождение: ${ancestry.labelRu} — сопротивление (${ancestry.damage}), дыхание ${ancestry.breath}.`,
      )
    }
  }
  if (input.def.featNoteRu) {
    parts.push(input.def.featNoteRu)
  }
  if (input.def.weaponProficiencies.length > 0) {
    parts.push(`Оружие: ${input.def.weaponProficiencies.join(', ')}.`)
  }
  return parts.filter(Boolean).join(' ')
}

export function formatRaceGrantSummary(input: {
  def: RaceGrantDef
  picks: RaceGrantPicks
  bonuses: Partial<Record<AbilityKey, number>>
}): string {
  const langs = [...input.def.languages, ...input.picks.languages].join(', ') || '—'
  const asi = Object.entries(input.bonuses)
    .map(([key, value]) => `${key.toUpperCase()} ${value! > 0 ? '+' : ''}${value}`)
    .join(', ')
  const bits = [
    `скорость ${input.def.speed}`,
    `ТЗ ${input.def.darkvision || 'нет'}`,
    `языки: ${langs}`,
    asi ? `ASI: ${asi}` : null,
  ]
  return bits.filter(Boolean).join(' · ')
}

export function readAppliedRaceGrant(raw: unknown): AppliedRaceGrant | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (typeof row.raceCatalogId !== 'string' || typeof row.slug !== 'string') return null
  const abilityBonuses = readAbilityBonuses(row.abilityBonuses)
  return {
    raceCatalogId: row.raceCatalogId,
    slug: row.slug,
    parentSlug: typeof row.parentSlug === 'string' ? row.parentSlug : null,
    speed: Math.max(0, Math.floor(readNumber(row.speed, 30))),
    size: typeof row.size === 'string' ? row.size : 'medium',
    darkvision: Math.max(0, Math.floor(readNumber(row.darkvision, 0))),
    abilityBonuses,
    languages: readStringList(row.languages),
    skills: readStringList(row.skills),
    tools: readStringList(row.tools),
    armorKeys: readArmor(row.armorKeys),
    weaponNames: readStringList(row.weaponNames),
    traitsText: typeof row.traitsText === 'string' ? row.traitsText : '',
    ancestryId: typeof row.ancestryId === 'string' ? row.ancestryId : null,
    featNoteRu: typeof row.featNoteRu === 'string' ? row.featNoteRu : null,
  }
}
