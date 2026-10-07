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
}

export type BackgroundGrantPicks = {
  skills: string[]
  tools: string[]
  languages: string[]
  equipmentPackageId: string | null
}

export type AppliedBackgroundGrant = {
  backgroundCatalogId: string
  slug: string
  skills: string[]
  tools: string[]
  languages: string[]
  featureNameRu: string | null
  featureTextRu: string | null
  featNoteRu: string | null
  equipmentPackageId: string | null
  equipmentItemIds: string[]
  equipmentCoinsGp: number
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
  }
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
    equipmentItemIds: readStringList(row.equipmentItemIds),
    equipmentCoinsGp: Math.max(0, Math.floor(readNumber(row.equipmentCoinsGp, 0))),
  }
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
