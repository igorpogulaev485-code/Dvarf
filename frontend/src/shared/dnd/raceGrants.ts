/** PHB 2014 race grants: catalog.data → picks → ledger (mirrors classGrants). */

import type { NaturalArmor } from './armor'

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export type { NaturalArmor }

/** Race natural weapon that becomes an attack card on the sheet. */
export type RaceNaturalWeapon = {
  id: string
  nameRu: string
  damage: string
  damageType: string
  ability: AbilityKey
  proficient: boolean
  notesRu: string | null
}

export type RaceSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan'

export const RACE_SIZE_LABELS: Record<RaceSize, string> = {
  tiny: 'Крошечный',
  small: 'Маленький',
  medium: 'Средний',
  large: 'Большой',
  huge: 'Огромный',
  gargantuan: 'Громадный',
}

/** One ASI bucket inside a mode, e.g. «+2 to one ability». */
export type AbilityBonusBucket = {
  amount: number
  count: number
}

/** Tasha/MPMM fork: pick one mode, then fill its buckets. */
export type AbilityBonusMode = {
  id: string
  labelRu: string
  buckets: AbilityBonusBucket[]
}

/**
 * ASI choice package.
 * - Legacy: `{ count, amount, from }` — N picks of the same amount.
 * - Flexible: `{ from, preset: 'tasha_flexible' }` or explicit `modes`.
 */
export type AbilityBonusChoice = {
  from: AbilityKey[] | 'any'
  exclude?: AbilityKey[]
  /** Legacy single-mode pick count (all get `amount`). */
  count?: number
  /** Legacy single-mode amount per pick. */
  amount?: number
  /** Named preset expanded in `resolveAbilityBonusModes`. */
  preset?: 'tasha_flexible'
  modes?: AbilityBonusMode[]
}

/** Official MPMM / Tasha flexible ASI: +2/+1 or three +1. */
export const TASHA_FLEXIBLE_ASI_MODES: AbilityBonusMode[] = [
  {
    id: 'plus2_plus1',
    labelRu:
      'Увеличьте одну любую характеристику на +2 и любую другую характеристику на +1',
    buckets: [
      { amount: 2, count: 1 },
      { amount: 1, count: 1 },
    ],
  },
  {
    id: 'plus1x3',
    labelRu:
      'Увеличьте одну любую характеристику на +1, любую другую на +1 и третью на +1',
    buckets: [{ amount: 1, count: 3 }],
  },
]

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
  /** Default / fixed size when there is no choice fork. */
  size: RaceSize
  /** When length > 1, player picks one size in the setup dialog. */
  sizeChoices: RaceSize[]
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
  naturalArmor: NaturalArmor | null
  naturalWeapons: RaceNaturalWeapon[]
}

export type RaceGrantPicks = {
  /** Selected ASI mode id when `ability_bonus_choices` has modes/preset. */
  abilityBonusModeId: string | null
  /**
   * Ability keys in bucket order for the selected mode
   * (e.g. plus2_plus1 → [keyFor+2, keyFor+1]; plus1x3 → three +1 keys).
   */
  abilityBonusKeys: AbilityKey[]
  /** Chosen size when `sizeChoices` offers Medium/Small (etc.). */
  size: RaceSize | null
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
  naturalArmor: NaturalArmor | null
  naturalWeapons: RaceNaturalWeapon[]
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

function readSizeChoices(raw: unknown, fallback: RaceSize): RaceSize[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<RaceSize>()
  const out: RaceSize[] = []
  for (const item of raw) {
    if (!SIZE_VALUES.includes(item as RaceSize)) continue
    const size = item as RaceSize
    if (seen.has(size)) continue
    seen.add(size)
    out.push(size)
  }
  if (out.length <= 1) return out
  // Prefer medium then small for stable chip order when both present.
  const rank = (size: RaceSize) =>
    size === 'medium' ? 0 : size === 'small' ? 1 : SIZE_VALUES.indexOf(size) + 2
  out.sort((a, b) => rank(a) - rank(b))
  if (!out.includes(fallback)) {
    // keep fallback as default only; do not inject into choices
  }
  return out
}

/** Resolved size after picks (choice fork or fixed catalog size). */
export function resolveRaceSize(input: {
  def: Pick<RaceGrantDef, 'size' | 'sizeChoices'>
  picks: Pick<RaceGrantPicks, 'size'>
}): RaceSize {
  const choices = input.def.sizeChoices
  if (choices.length > 1) {
    if (input.picks.size && choices.includes(input.picks.size)) {
      return input.picks.size
    }
  }
  return input.def.size
}

function readAbilityBonusBuckets(raw: unknown): AbilityBonusBucket[] {
  if (!Array.isArray(raw)) return []
  const out: AbilityBonusBucket[] = []
  for (const item of raw) {
    const row = asRecord(item)
    const amount = Math.trunc(readNumber(row.amount, 0))
    const count = Math.max(0, Math.floor(readNumber(row.count, 0)))
    if (!amount || count <= 0) continue
    out.push({ amount, count })
  }
  return out
}

function readAbilityBonusModes(raw: unknown): AbilityBonusMode[] {
  if (!Array.isArray(raw)) return []
  const out: AbilityBonusMode[] = []
  for (const item of raw) {
    const row = asRecord(item)
    if (typeof row.id !== 'string' || !row.id.trim()) continue
    const buckets = readAbilityBonusBuckets(row.buckets)
    if (buckets.length === 0) continue
    const labelRu =
      typeof row.label_ru === 'string'
        ? row.label_ru
        : typeof row.labelRu === 'string'
          ? row.labelRu
          : row.id
    out.push({ id: row.id.trim(), labelRu, buckets })
  }
  return out
}

function readAbilityBonusChoices(raw: unknown): AbilityBonusChoice | null {
  const obj = asRecord(raw)
  const exclude = Array.isArray(obj.exclude)
    ? obj.exclude.filter(isAbilityKey)
    : undefined

  let from: AbilityKey[] | 'any' = 'any'
  if (obj.from !== 'any' && obj.from != null) {
    if (!Array.isArray(obj.from)) return null
    const keys = obj.from.filter(isAbilityKey)
    if (keys.length === 0) return null
    from = keys
  }

  const modes = readAbilityBonusModes(obj.modes)
  const preset = obj.preset === 'tasha_flexible' ? 'tasha_flexible' : undefined
  if (preset || modes.length > 0) {
    return { from, exclude, preset, modes: modes.length > 0 ? modes : undefined }
  }

  const count = Math.max(0, Math.floor(readNumber(obj.count, 0)))
  if (count <= 0) return null
  const amount = Math.trunc(readNumber(obj.amount, 1)) || 1
  return { count, amount, from, exclude }
}

/** Resolve concrete modes (preset / explicit / legacy count+amount). */
export function resolveAbilityBonusModes(
  choice: AbilityBonusChoice | null,
): AbilityBonusMode[] {
  if (!choice) return []
  if (choice.preset === 'tasha_flexible') return TASHA_FLEXIBLE_ASI_MODES
  if (choice.modes && choice.modes.length > 0) return choice.modes
  const count = choice.count ?? 0
  const amount = choice.amount ?? 1
  if (count <= 0) return []
  return [
    {
      id: 'default',
      labelRu: `+${amount} к ${count} характеристикам`,
      buckets: [{ amount, count }],
    },
  ]
}

export function abilityBonusModeSlotCount(mode: AbilityBonusMode): number {
  return mode.buckets.reduce((sum, bucket) => sum + bucket.count, 0)
}

/** Expand buckets to a flat amount list matching `abilityBonusKeys` order. */
export function expandAbilityBonusAmounts(mode: AbilityBonusMode): number[] {
  const amounts: number[] = []
  for (const bucket of mode.buckets) {
    for (let i = 0; i < bucket.count; i += 1) amounts.push(bucket.amount)
  }
  return amounts
}

export function resolveSelectedAbilityBonusMode(input: {
  choice: AbilityBonusChoice | null
  modeId: string | null | undefined
}): AbilityBonusMode | null {
  const modes = resolveAbilityBonusModes(input.choice)
  if (modes.length === 0) return null
  if (modes.length === 1) return modes[0] ?? null
  if (!input.modeId) return null
  return modes.find((mode) => mode.id === input.modeId) ?? null
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

function readNaturalWeapons(raw: unknown): RaceNaturalWeapon[] {
  if (!Array.isArray(raw)) return []
  const out: RaceNaturalWeapon[] = []
  for (const item of raw) {
    const row = asRecord(item)
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    const nameRu =
      typeof row.name_ru === 'string'
        ? row.name_ru.trim()
        : typeof row.nameRu === 'string'
          ? row.nameRu.trim()
          : ''
    const damage = typeof row.damage === 'string' ? row.damage.trim() : ''
    if (!id || !nameRu || !damage) continue
    const abilityRaw = row.ability
    const ability =
      typeof abilityRaw === 'string' && ABILITY_KEYS.includes(abilityRaw as AbilityKey)
        ? (abilityRaw as AbilityKey)
        : 'str'
    const damageType =
      typeof row.damage_type === 'string'
        ? row.damage_type.trim()
        : typeof row.damageType === 'string'
          ? row.damageType.trim()
          : ''
    const notesRu =
      typeof row.notes_ru === 'string'
        ? row.notes_ru.trim()
        : typeof row.notesRu === 'string'
          ? row.notesRu.trim()
          : null
    out.push({
      id,
      nameRu,
      damage,
      damageType,
      ability,
      proficient: row.proficient !== false,
      notesRu: notesRu || null,
    })
  }
  return out
}

function readNaturalArmor(raw: unknown): NaturalArmor | null {
  const obj = asRecord(raw)
  const base = Math.floor(readNumber(obj.base, NaN))
  if (!Number.isFinite(base)) return null
  const modRaw = obj.mod ?? obj.ability
  const mod =
    typeof modRaw === 'string' && ABILITY_KEYS.includes(modRaw as AbilityKey)
      ? (modRaw as AbilityKey)
      : null
  const modCapRaw = obj.mod_cap ?? obj.modCap
  const modCap =
    typeof modCapRaw === 'number' && Number.isFinite(modCapRaw)
      ? Math.floor(modCapRaw)
      : null
  const armoredBonusRaw = obj.armored_bonus ?? obj.armoredBonus
  const armoredBonus =
    typeof armoredBonusRaw === 'number' && Number.isFinite(armoredBonusRaw)
      ? Math.floor(armoredBonusRaw)
      : undefined
  const labelRu =
    typeof obj.label_ru === 'string'
      ? obj.label_ru
      : typeof obj.labelRu === 'string'
        ? obj.labelRu
        : 'Природная броня'
  const allowsShield =
    obj.allows_shield === false || obj.allowsShield === false ? false : true
  return {
    base,
    mod,
    modCap,
    allowsShield,
    armoredBonus,
    labelRu,
  }
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
    sizeChoices: readSizeChoices(
      data.size_choices ?? data.sizeChoices,
      readSize(data.size),
    ),
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
    naturalArmor: readNaturalArmor(data.natural_armor ?? data.naturalArmor),
    naturalWeapons: readNaturalWeapons(data.natural_weapons ?? data.naturalWeapons),
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
    abilityBonusModeId: null,
    abilityBonusKeys: [],
    size: null,
    languages: [],
    skills: [],
    tools: [],
    ancestryId: null,
  }
}

export function raceGrantNeedsSetupDialog(def: RaceGrantDef): boolean {
  if (def.sizeChoices.length > 1) return true
  if (resolveAbilityBonusModes(def.abilityBonusChoices).length > 0) return true
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
  const modes = resolveAbilityBonusModes(asi)
  if (modes.length > 0) {
    const mode = resolveSelectedAbilityBonusMode({
      choice: asi,
      modeId: picks.abilityBonusModeId,
    })
    if (!mode) {
      return modes.length > 1 ? 'Выбери вариант увеличения характеристик' : 'Нет режима ASI'
    }
    const need = abilityBonusModeSlotCount(mode)
    if (picks.abilityBonusKeys.length !== need) {
      return `Выбери характеристики: ${need}`
    }
    const allowed = new Set(abilityKeysForBonusChoice(asi!))
    if (picks.abilityBonusKeys.some((key) => !allowed.has(key))) {
      return 'Характеристика вне списка расы'
    }
    if (new Set(picks.abilityBonusKeys).size !== picks.abilityBonusKeys.length) {
      return 'Нельзя выбрать одну характеристику дважды'
    }
  } else if (picks.abilityBonusKeys.length > 0 || picks.abilityBonusModeId) {
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

  if (def.sizeChoices.length > 1) {
    if (!picks.size) return 'Выбери размер'
    if (!def.sizeChoices.includes(picks.size)) {
      return 'Размер вне списка расы'
    }
  } else if (picks.size && picks.size !== def.size) {
    return 'Лишний выбор размера'
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
  modeId?: string | null,
): Partial<Record<AbilityKey, number>> {
  const result: Partial<Record<AbilityKey, number>> = { ...fixed }
  const mode = resolveSelectedAbilityBonusMode({ choice, modeId: modeId ?? null })
  if (!mode) return result
  const amounts = expandAbilityBonusAmounts(mode)
  for (let i = 0; i < picks.length; i += 1) {
    const key = picks[i]
    const amount = amounts[i]
    if (!key || !amount) continue
    result[key] = (result[key] ?? 0) + amount
  }
  return result
}

export function buildTraitsWithPicks(input: {
  def: RaceGrantDef
  picks: RaceGrantPicks
}): string {
  const parts = [input.def.traitsText]
  if (input.def.sizeChoices.length > 1) {
    const size = resolveRaceSize(input)
    parts.push(`Размер: ${RACE_SIZE_LABELS[size]}.`)
  }
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
  const naturalWeapons =
    input.def.naturalWeapons.length > 0
      ? `атаки: ${input.def.naturalWeapons.map((row) => row.nameRu).join(', ')}`
      : null
  const size = resolveRaceSize(input)
  const bits = [
    `скорость ${input.def.speed}`,
    `размер ${RACE_SIZE_LABELS[size]}`,
    `ТЗ ${input.def.darkvision || 'нет'}`,
    `языки: ${langs}`,
    asi ? `ASI: ${asi}` : null,
    naturalWeapons,
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
    naturalArmor: readNaturalArmor(row.naturalArmor ?? row.natural_armor),
    naturalWeapons: readNaturalWeapons(row.naturalWeapons ?? row.natural_weapons),
  }
}
