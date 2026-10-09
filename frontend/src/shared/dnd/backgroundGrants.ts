/** PHB+official 2014 background grants: catalog.data → picks → ledger. */

import {
  ARTISAN_TOOL_CHOICES,
  MUSICAL_INSTRUMENT_CHOICES,
  type StartingEquipmentPackage,
  type StartingGearItem,
} from './classGrants'

export type SkillChoice = {
  count: number
  from: string[] | 'any'
}

export type ToolChoice = {
  count: number
  from: string[]
}

/** «Молитвенник или молитвенный барабан» style forks inside background gear. */
export type EquipmentOrChoice = {
  id: string
  labelRu: string
  options: string[]
}

/** Extra flavor tables: амплуа, специализация, культура, … */
export type BackgroundChoiceTable = {
  id: string
  labelRu: string
  count: number
  options: string[]
}

export type BackgroundGrantDef = {
  slug: string
  labelRu: string
  source: string
  skillProficiencies: string[]
  skillChoices: SkillChoice | null
  toolProficiencies: string[]
  toolChoices: ToolChoice | null
  languages: string[]
  languagesChoose: number
  languagesChooseNoteRu: string | null
  featureNameRu: string | null
  featureTextRu: string | null
  featNoteRu: string | null
  equipment: StartingEquipmentPackage[]
  equipmentOrChoices: EquipmentOrChoice[]
  equipmentNoteRu: string | null
  choiceTables: BackgroundChoiceTable[]
  /** Suggested characteristics tables (optional RP picks). */
  personalityTraits: string[]
  ideals: string[]
  bonds: string[]
  flaws: string[]
  isVariant: boolean
  variantOf: string | null
  notesRu: string | null
}

export type BackgroundGrantPicks = {
  skills: string[]
  tools: string[]
  languages: string[]
  equipmentPackageId: string | null
  /** choiceId → selected option name */
  equipmentOrPicks: Record<string, string>
  /** tableId → selected option labels */
  choiceTablePicks: Record<string, string[]>
  /** 0 or personalityPickCount (usually 2). */
  personalityTraits: string[]
  ideal: string | null
  bond: string | null
  flaw: string | null
}

export type AppliedBackgroundGrant = {
  backgroundCatalogId: string
  slug: string
  skills: string[]
  tools: string[]
  languages: string[]
  /** Specific weapon proficiencies granted (e.g. gladiator exotic weapon). */
  weaponExtras: string[]
  featureNameRu: string | null
  featureTextRu: string | null
  featNoteRu: string | null
  equipmentPackageId: string | null
  equipmentOrPicks: Record<string, string>
  equipmentItemIds: string[]
  /** Attack cards from background gear weapons. */
  equipmentAttackIds: string[]
  equipmentCoinsGp: number
  choiceTablePicks: Record<string, string[]>
  personalityTraits: string[]
  ideal: string | null
  bond: string | null
  flaw: string | null
}

export const GAMING_SET_CHOICES = [
  'Кости',
  'Карты',
  'Драконьи шахматы',
  'Ставка трёх драконов',
] as const

/** Common tools from Eberron dragonmarked houses (House Agent fork). */
export const HOUSE_AGENT_TOOL_CHOICES = [
  'Инструменты алхимика',
  'Инструменты ремонтника',
  'Инструменты пивовара',
  'Инструменты повара',
  'Набор травника',
  'Воровские инструменты',
  'Инструменты навигатора',
  'Набор для грима',
  'Инструменты стеклодува',
  'Инструменты кузнеца',
  'Инструменты ювелира',
  'Транспорт (наземный)',
  'Транспорт (водный)',
  'Транспорт (воздушный)',
  ...GAMING_SET_CHOICES,
] as const

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
}

function readStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const value = item.trim()
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out
}

function readNumber(raw: unknown, fallback = 0): number {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback
}

function readSkillChoice(raw: unknown): SkillChoice | null {
  const row = asRecord(raw)
  const count = Math.max(0, Math.floor(readNumber(row.count, 0)))
  if (count <= 0) return null
  if (row.from === 'any') return { count, from: 'any' }
  const from = readStringList(row.from)
  if (from.length === 0) return { count, from: 'any' }
  return { count, from }
}

function expandToolToken(token: string): string[] {
  switch (token) {
    case 'artisan_tools':
      return [...ARTISAN_TOOL_CHOICES]
    case 'musical_instruments':
      return [...MUSICAL_INSTRUMENT_CHOICES]
    case 'gaming_sets':
      return [...GAMING_SET_CHOICES]
    case 'thieves_tools':
      return ['Воровские инструменты']
    case 'cartographer_or_navigator':
      return ['Инструменты картографа', 'Инструменты навигатора']
    case 'disguise_or_musical':
      return ['Набор для грима', ...MUSICAL_INSTRUMENT_CHOICES]
    case 'house_agent_tools':
      return [...HOUSE_AGENT_TOOL_CHOICES]
    default:
      return [token]
  }
}

function readToolChoice(raw: unknown): ToolChoice | null {
  const row = asRecord(raw)
  const count = Math.max(0, Math.floor(readNumber(row.count, 0)))
  if (count <= 0) return null
  const tokens = readStringList(row.from)
  if (tokens.length === 0) return null
  const from: string[] = []
  const seen = new Set<string>()
  for (const token of tokens) {
    for (const name of expandToolToken(token)) {
      const key = name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      from.push(name)
    }
  }
  return from.length > 0 ? { count, from } : null
}

function readGearItem(raw: unknown): StartingGearItem | null {
  const row = asRecord(raw)
  if (typeof row.name !== 'string' || !row.name.trim()) return null
  return {
    name: row.name.trim(),
    qty: Math.max(1, Math.floor(readNumber(row.qty, 1))),
    armor_kind:
      row.armor_kind === 'light' ||
      row.armor_kind === 'medium' ||
      row.armor_kind === 'heavy' ||
      row.armor_kind === 'shield' ||
      row.armor_kind === 'none'
        ? row.armor_kind
        : 'none',
    base_ac: typeof row.base_ac === 'number' ? row.base_ac : null,
    weight_lb: typeof row.weight_lb === 'number' ? row.weight_lb : null,
    notes: typeof row.notes === 'string' ? row.notes : 'Снаряжение предыстории',
  }
}

function readEquipmentPackages(raw: unknown): StartingEquipmentPackage[] {
  if (!Array.isArray(raw)) return []
  const packs: StartingEquipmentPackage[] = []
  for (const item of raw) {
    const row = asRecord(item)
    const id = typeof row.id === 'string' && row.id.trim() ? row.id.trim() : 'pack'
    const labelRu =
      typeof row.labelRu === 'string' && row.labelRu.trim()
        ? row.labelRu.trim()
        : 'Снаряжение предыстории'
    const summary = typeof row.summary === 'string' ? row.summary : ''
    const items = Array.isArray(row.items)
      ? row.items.map(readGearItem).filter((x): x is StartingGearItem => Boolean(x))
      : []
    const coinsGp = Math.max(0, Math.floor(readNumber(row.coinsGp, 0)))
    if (items.length === 0 && coinsGp <= 0) continue
    packs.push({ id, labelRu, summary, items, coinsGp })
  }
  return packs
}

function readEquipmentOrChoices(raw: unknown): EquipmentOrChoice[] {
  if (!Array.isArray(raw)) return []
  const out: EquipmentOrChoice[] = []
  for (const item of raw) {
    const row = asRecord(item)
    const id = typeof row.id === 'string' && row.id.trim() ? row.id.trim() : ''
    const labelRu =
      typeof row.labelRu === 'string' && row.labelRu.trim()
        ? row.labelRu.trim()
        : ''
    const options = readStringList(row.options)
    if (!id || options.length < 2) continue
    out.push({ id, labelRu: labelRu || options.join(' или '), options })
  }
  return out
}

function readChoiceTables(raw: unknown): BackgroundChoiceTable[] {
  if (!Array.isArray(raw)) return []
  const out: BackgroundChoiceTable[] = []
  for (const item of raw) {
    const row = asRecord(item)
    const id = typeof row.id === 'string' && row.id.trim() ? row.id.trim() : ''
    const labelRu =
      typeof row.labelRu === 'string' && row.labelRu.trim()
        ? row.labelRu.trim()
        : id
    const options = readStringList(row.options)
    const count = Math.max(1, Math.floor(readNumber(row.count, 1)))
    if (!id || options.length < 2) continue
    out.push({ id, labelRu, count, options })
  }
  return out
}

/** Root backgrounds in combobox (variants open inside the setup popup). */
export function isBackgroundComboboxRoot(entry: {
  parent_id?: string | null
  data?: Record<string, unknown> | null
}): boolean {
  if (entry.parent_id) return false
  const data = entry.data ?? {}
  if (data.is_variant === true) return false
  if (typeof data.variant_of === 'string' && data.variant_of.trim()) return false
  return true
}

/** PHB variants (spy/gladiator/…) for a root catalog row. */
export function backgroundVariantsForRoot<
  T extends {
    id: string
    slug: string
    parent_id?: string | null
    sort_order: number
    name_ru: string
    data?: Record<string, unknown> | null
  },
>(root: { id: string; slug: string }, catalog: T[]): T[] {
  return catalog
    .filter((row) => {
      if (row.id === root.id) return false
      if (row.parent_id === root.id) return true
      const data = row.data ?? {}
      if (typeof data.variant_of === 'string' && data.variant_of === root.slug) {
        return true
      }
      return false
    })
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order || a.name_ru.localeCompare(b.name_ru, 'ru'),
    )
}

export function backgroundGrantDefFromCatalog(input: {
  slug: string
  nameRu: string
  data: Record<string, unknown> | null | undefined
}): BackgroundGrantDef | null {
  if (!input.slug || !input.data) return null
  const data = input.data
  return {
    slug: input.slug,
    labelRu: input.nameRu || input.slug,
    source: typeof data.source === 'string' ? data.source : 'phb',
    skillProficiencies: readStringList(data.skill_proficiencies),
    skillChoices: readSkillChoice(data.skill_choices),
    toolProficiencies: readStringList(data.tool_proficiencies),
    toolChoices: readToolChoice(data.tool_choices),
    languages: readStringList(data.languages),
    languagesChoose: Math.max(0, Math.floor(readNumber(data.languages_choose, 0))),
    languagesChooseNoteRu:
      typeof data.languages_choose_note_ru === 'string'
        ? data.languages_choose_note_ru
        : null,
    featureNameRu:
      typeof data.feature_name_ru === 'string' ? data.feature_name_ru : null,
    featureTextRu:
      typeof data.feature_text_ru === 'string' ? data.feature_text_ru : null,
    featNoteRu: typeof data.feat_note_ru === 'string' ? data.feat_note_ru : null,
    equipment: readEquipmentPackages(data.starting_equipment),
    equipmentOrChoices: readEquipmentOrChoices(data.equipment_or_choices),
    equipmentNoteRu:
      typeof data.equipment_note_ru === 'string' ? data.equipment_note_ru : null,
    choiceTables: readChoiceTables(data.choice_tables),
    personalityTraits: readStringList(data.personality_traits),
    ideals: readStringList(data.ideals),
    bonds: readStringList(data.bonds),
    flaws: readStringList(data.flaws),
    isVariant: data.is_variant === true,
    variantOf: typeof data.variant_of === 'string' ? data.variant_of : null,
    notesRu: typeof data.notes_ru === 'string' ? data.notes_ru : null,
  }
}

/** PHB: usually two personality traits when the table exists. */
export function personalityPickCount(def: BackgroundGrantDef): number {
  if (def.personalityTraits.length >= 2) return 2
  if (def.personalityTraits.length === 1) return 1
  return 0
}

export function backgroundHasRoleplayTables(def: BackgroundGrantDef): boolean {
  return (
    def.personalityTraits.length > 0 ||
    def.ideals.length > 0 ||
    def.bonds.length > 0 ||
    def.flaws.length > 0
  )
}

/**
 * PHB ideals end with an alignment hint in parentheses, e.g. «… (Законный)».
 * Returns a sheet-ready label, or null for «Любой» / unknown / missing tag.
 */
export function alignmentSuggestionFromIdeal(ideal: string | null | undefined): string | null {
  if (!ideal || !ideal.trim()) return null
  const match = ideal.trim().match(/\(([^)]+)\)\s*$/)
  if (!match) return null
  const raw = match[1].trim().toLowerCase().replace(/ё/g, 'е')
  if (!raw) return null

  // «Любой» / «Любое» — игрок выбирает сам.
  if (raw === 'любой' || raw === 'любое') return null

  const aliases: Record<string, string> = {
    законный: 'Законный',
    законное: 'Законный',
    законно: 'Законный',
    законопослушный: 'Законный',
    закон: 'Законный',
    хаотичный: 'Хаотичный',
    хаотичное: 'Хаотичный',
    хаос: 'Хаотичный',
    добрый: 'Добрый',
    доброе: 'Добрый',
    добро: 'Добрый',
    злой: 'Злой',
    злое: 'Злой',
    зло: 'Злой',
    нейтральный: 'Нейтральный',
    нейтральное: 'Нейтральный',
  }
  if (aliases[raw]) return aliases[raw]

  // Already a compound / free-form tag — keep capitalization from source.
  return match[1].trim()
}

/** Whether to push ideal-derived alignment onto the sheet (respects manual edit). */
export function shouldApplyAlignmentFromIdeal(input: {
  suggested: string | null
  currentAlignment: string
  previousIdeal: string | null
  nextIdeal: string | null
}): boolean {
  if (!input.suggested) return false
  const current = input.currentAlignment.trim()
  const prevSuggested = alignmentSuggestionFromIdeal(input.previousIdeal)
  const idealChanged = (input.previousIdeal ?? null) !== (input.nextIdeal ?? null)
  if (!current) return true
  if (current === prevSuggested) return true
  if (idealChanged) return true
  return false
}

export function resolveBackgroundGrantDef(input: {
  backgroundName: string
  catalogSlug?: string | null
  catalogData?: Record<string, unknown> | null
  nameRu?: string | null
}): BackgroundGrantDef | null {
  const slug = (input.catalogSlug && input.catalogSlug.trim()) || ''
  const label =
    (input.nameRu && input.nameRu.trim()) ||
    input.backgroundName.trim() ||
    slug ||
    ''
  if (!slug || !input.catalogData) return null
  return backgroundGrantDefFromCatalog({
    slug,
    nameRu: label || slug,
    data: input.catalogData,
  })
}

export function emptyBackgroundPicks(): BackgroundGrantPicks {
  return {
    skills: [],
    tools: [],
    languages: [],
    equipmentPackageId: null,
    equipmentOrPicks: {},
    choiceTablePicks: {},
    personalityTraits: [],
    ideal: null,
    bond: null,
    flaw: null,
  }
}

export function backgroundGrantNeedsSetupDialog(def: BackgroundGrantDef): boolean {
  if ((def.skillChoices?.count ?? 0) > 0) return true
  if ((def.toolChoices?.count ?? 0) > 0) return true
  if (def.languagesChoose > 0) return true
  if (def.equipment.length > 0) return true
  // Confirm feature text even without forks.
  return true
}

export function skillOptionsForBackground(def: BackgroundGrantDef): string[] {
  const choice = def.skillChoices
  if (!choice) return []
  if (choice.from === 'any') {
    return [
      'acrobatics',
      'animal_handling',
      'arcana',
      'athletics',
      'deception',
      'history',
      'insight',
      'intimidation',
      'investigation',
      'medicine',
      'nature',
      'perception',
      'performance',
      'persuasion',
      'religion',
      'sleight_of_hand',
      'stealth',
      'survival',
    ]
  }
  return [...choice.from]
}

export function validateBackgroundGrantPicks(input: {
  def: BackgroundGrantDef
  picks: BackgroundGrantPicks
}): string | null {
  const { def, picks } = input
  const skillNeed = def.skillChoices?.count ?? 0
  if (picks.skills.length !== skillNeed) {
    return `Выбери навыки: ${skillNeed}`
  }
  if (def.skillChoices && def.skillChoices.from !== 'any') {
    const allowed = new Set(def.skillChoices.from)
    if (picks.skills.some((key) => !allowed.has(key))) {
      return 'Навык вне списка предыстории'
    }
  }
  if (new Set(picks.skills).size !== picks.skills.length) {
    return 'Нельзя выбрать один навык дважды'
  }

  const toolNeed = def.toolChoices?.count ?? 0
  if (picks.tools.length !== toolNeed) {
    return `Выбери инструменты: ${toolNeed}`
  }
  if (def.toolChoices) {
    const allowed = new Set(def.toolChoices.from.map((item) => item.toLowerCase()))
    if (picks.tools.some((name) => !allowed.has(name.trim().toLowerCase()))) {
      return 'Инструмент вне списка предыстории'
    }
  }
  if (
    new Set(picks.tools.map((item) => item.toLowerCase())).size !== picks.tools.length
  ) {
    return 'Нельзя выбрать один инструмент дважды'
  }

  if (picks.languages.length !== def.languagesChoose) {
    return `Выбери языки: ${def.languagesChoose}`
  }
  if (
    new Set(picks.languages.map((item) => item.toLowerCase())).size !==
    picks.languages.length
  ) {
    return 'Нельзя выбрать один язык дважды'
  }

  if (def.equipment.length > 0) {
    const id = picks.equipmentPackageId
    if (!id) return 'Выбери снаряжение предыстории или «Без снаряжения»'
    if (id !== 'skip' && !def.equipment.some((pack) => pack.id === id)) {
      return 'Неизвестный пакет снаряжения'
    }
    if (id !== 'skip' && def.equipmentOrChoices.length > 0) {
      for (const choice of def.equipmentOrChoices) {
        const picked = picks.equipmentOrPicks[choice.id]
        if (!picked) return `Выбери вариант: ${choice.labelRu}`
        if (!choice.options.includes(picked)) {
          return `Неизвестный вариант снаряжения: ${choice.labelRu}`
        }
      }
    }
  }

  for (const table of def.choiceTables) {
    const picked = picks.choiceTablePicks[table.id] ?? []
    if (picked.length !== table.count) {
      return `Выбери «${table.labelRu}»: ${table.count}`
    }
    const allowed = new Set(table.options)
    if (picked.some((row) => !allowed.has(row))) {
      return `Вариант вне таблицы «${table.labelRu}»`
    }
    if (new Set(picked).size !== picked.length) {
      return `Нельзя выбрать один пункт «${table.labelRu}» дважды`
    }
  }

  // RP tables are optional (0 = skip), but partial picks must be complete/valid.
  const traitNeed = personalityPickCount(def)
  if (picks.personalityTraits.length > 0) {
    if (picks.personalityTraits.length !== traitNeed) {
      return `Выбери черты характера: ${traitNeed} (или ни одной — заполнишь позже)`
    }
    const allowed = new Set(def.personalityTraits)
    if (picks.personalityTraits.some((row) => !allowed.has(row))) {
      return 'Черта характера вне таблицы предыстории'
    }
    if (new Set(picks.personalityTraits).size !== picks.personalityTraits.length) {
      return 'Нельзя выбрать одну черту дважды'
    }
  }
  if (picks.ideal) {
    if (!def.ideals.includes(picks.ideal)) return 'Идеал вне таблицы предыстории'
  }
  if (picks.bond) {
    if (!def.bonds.includes(picks.bond)) return 'Привязанность вне таблицы предыстории'
  }
  if (picks.flaw) {
    if (!def.flaws.includes(picks.flaw)) return 'Слабость вне таблицы предыстории'
  }

  return null
}

export function formatBackgroundGrantSummary(input: {
  def: BackgroundGrantDef
  picks: BackgroundGrantPicks
}): string {
  const skills = [...input.def.skillProficiencies, ...input.picks.skills]
  const tools = [...input.def.toolProficiencies, ...input.picks.tools]
  const langs = [...input.def.languages, ...input.picks.languages]
  const bits = [
    skills.length ? `навыки: ${skills.length}` : null,
    tools.length ? `инструменты: ${tools.length}` : null,
    langs.length ? `языки: ${langs.join(', ')}` : null,
    input.def.featureNameRu ? `умение: ${input.def.featureNameRu}` : null,
    input.picks.equipmentPackageId && input.picks.equipmentPackageId !== 'skip'
      ? 'снаряжение'
      : null,
    input.picks.personalityTraits.length ||
    input.picks.ideal ||
    input.picks.bond ||
    input.picks.flaw
      ? 'черты/идеалы'
      : null,
  ]
  return bits.filter(Boolean).join(' · ')
}

export function readAppliedBackgroundGrant(raw: unknown): AppliedBackgroundGrant | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  if (
    typeof row.backgroundCatalogId !== 'string' ||
    typeof row.slug !== 'string'
  ) {
    return null
  }
  return {
    backgroundCatalogId: row.backgroundCatalogId,
    slug: row.slug,
    skills: readStringList(row.skills),
    tools: readStringList(row.tools),
    languages: readStringList(row.languages),
    featureNameRu:
      typeof row.featureNameRu === 'string' ? row.featureNameRu : null,
    featureTextRu:
      typeof row.featureTextRu === 'string' ? row.featureTextRu : null,
    featNoteRu: typeof row.featNoteRu === 'string' ? row.featNoteRu : null,
    equipmentPackageId:
      typeof row.equipmentPackageId === 'string' ? row.equipmentPackageId : null,
    equipmentOrPicks: readStringMap(row.equipmentOrPicks),
    equipmentItemIds: readStringList(row.equipmentItemIds),
    equipmentAttackIds: readStringList(row.equipmentAttackIds),
    equipmentCoinsGp: Math.max(0, Math.floor(readNumber(row.equipmentCoinsGp, 0))),
    weaponExtras: readStringList(row.weaponExtras),
    choiceTablePicks: readStringListMap(row.choiceTablePicks),
    personalityTraits: readStringList(row.personalityTraits),
    ideal: typeof row.ideal === 'string' ? row.ideal : null,
    bond: typeof row.bond === 'string' ? row.bond : null,
    flaw: typeof row.flaw === 'string' ? row.flaw : null,
  }
}

function readStringListMap(raw: unknown): Record<string, string[]> {
  const row = asRecord(raw)
  const out: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(row)) {
    const list = readStringList(value)
    if (list.length) out[key] = list
  }
  return out
}

export function formatChoiceTableSummary(
  def: BackgroundGrantDef,
  picks: BackgroundGrantPicks,
): string {
  const bits: string[] = []
  for (const table of def.choiceTables) {
    const selected = picks.choiceTablePicks[table.id] ?? []
    if (selected.length) bits.push(`${table.labelRu}: ${selected.join('; ')}`)
  }
  return bits.join('\n')
}

function readStringMap(raw: unknown): Record<string, string> {
  const row = asRecord(raw)
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'string' && value.trim()) out[key] = value.trim()
  }
  return out
}

const RP_MARKERS: Record<
  'personality' | 'ideals' | 'bonds' | 'flaws' | 'backgroundStory',
  { start: string; end: string }
> = {
  personality: {
    start: '<!-- dvarf-bg-personality -->',
    end: '<!-- /dvarf-bg-personality -->',
  },
  ideals: {
    start: '<!-- dvarf-bg-ideals -->',
    end: '<!-- /dvarf-bg-ideals -->',
  },
  bonds: {
    start: '<!-- dvarf-bg-bonds -->',
    end: '<!-- /dvarf-bg-bonds -->',
  },
  flaws: {
    start: '<!-- dvarf-bg-flaws -->',
    end: '<!-- /dvarf-bg-flaws -->',
  },
  backgroundStory: {
    start: '<!-- dvarf-bg-story -->',
    end: '<!-- /dvarf-bg-story -->',
  },
}

export function upsertMarkedTextBlock(
  current: string,
  markerKey: keyof typeof RP_MARKERS,
  body: string,
): string {
  const { start, end } = RP_MARKERS[markerKey]
  const text = body.trim()
  const block = text ? `${start}\n${text}\n${end}` : ''
  const from = current.indexOf(start)
  const to = current.indexOf(end)
  if (from >= 0 && to > from) {
    const afterEnd = to + end.length
    const before = current.slice(0, from).trimEnd()
    const after = current.slice(afterEnd).trimStart()
    return [before, block, after].filter(Boolean).join('\n\n').trim()
  }
  if (!block) return current.trim()
  if (!current.trim()) return block
  return `${current.trim()}\n\n${block}`
}

const FEATURE_START = '<!-- dvarf-background-feature -->'
const FEATURE_END = '<!-- /dvarf-background-feature -->'

export function buildBackgroundFeatureText(def: BackgroundGrantDef): string {
  const name = (def.featureNameRu || '').trim()
  const body = (def.featureTextRu || '').trim()
  const feat = (def.featNoteRu || '').trim()
  const parts = [
    name ? `Умение предыстории: ${name}` : 'Умение предыстории',
    body,
    feat,
  ].filter(Boolean)
  return parts.join('\n')
}

export function upsertBackgroundFeatureBlock(
  current: string,
  featureText: string,
): string {
  const body = featureText.trim()
  const block = body ? `${FEATURE_START}\n${body}\n${FEATURE_END}` : ''
  const start = current.indexOf(FEATURE_START)
  const end = current.indexOf(FEATURE_END)
  if (start >= 0 && end > start) {
    const afterEnd = end + FEATURE_END.length
    const before = current.slice(0, start).trimEnd()
    const after = current.slice(afterEnd).trimStart()
    return [before, block, after].filter(Boolean).join('\n\n').trim()
  }
  if (!block) return current.trim()
  if (!current.trim()) return block
  return `${current.trim()}\n\n${block}`
}

export function mergeBackgroundLanguages(input: {
  current: string[]
  previousApplied: string[]
  next: string[]
}): string[] {
  const remove = new Set(input.previousApplied.map((item) => item.toLowerCase()))
  const kept = input.current.filter((item) => !remove.has(item.toLowerCase()))
  const seen = new Set(kept.map((item) => item.toLowerCase()))
  const result = [...kept]
  for (const lang of input.next) {
    const key = lang.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(lang)
  }
  return result
}
