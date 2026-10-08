/**
 * Catalog gear `data` contract (D&D 2014) — weapon / armor / item.
 * JSONB on catalog_entries — readers must accept legacy SRD shapes.
 *
 * GEAR slice G1: schema + parsers only. Backfill / UI effects come later.
 */

export const GEAR_DATA_SCHEMA_VERSION = 1 as const

// —— shared enums ——

export const GEAR_COST_UNITS = ['gp', 'sp', 'cp'] as const
export type GearCostUnit = (typeof GEAR_COST_UNITS)[number]

export type GearCost = {
  amount: number
  unit: GearCostUnit
}

export const GEAR_RARITIES = [
  'mundane',
  'common',
  'uncommon',
  'rare',
  'very_rare',
  'legendary',
  'artifact',
] as const
export type GearRarity = (typeof GEAR_RARITIES)[number]

/** Worn / wielded slot (5e common-sense; one active item per slot, rings ×2). */
export const WEAR_SLOTS = [
  'body_armor',
  'shield',
  'cloak',
  'head',
  'eyes',
  'neck',
  'hands',
  'arms',
  'feet',
  'belt',
  'ring',
  'held_main',
  'held_off',
  'none',
] as const
export type WearSlot = (typeof WEAR_SLOTS)[number]

export const WEAPON_CATEGORIES = ['simple', 'martial'] as const
export type WeaponCategory = (typeof WEAPON_CATEGORIES)[number]

export const ARMOR_KINDS_CATALOG = ['none', 'light', 'medium', 'heavy', 'shield'] as const
export type ArmorKindCatalog = (typeof ARMOR_KINDS_CATALOG)[number]

export const ITEM_CATEGORIES = [
  'gear',
  'tool',
  'pack',
  'ammo',
  'focus',
  'symbol',
  'container',
  'mount',
  'vehicle',
  'tack',
  'consumable',
  'wondrous',
  'other',
] as const
export type ItemCategory = (typeof ITEM_CATEGORIES)[number]

export const TOOL_TYPES = ['artisan', 'kit', 'gaming', 'musical', 'vehicles'] as const
export type ToolType = (typeof TOOL_TYPES)[number]

export const CHARGE_RESTORE = [
  'long_rest',
  'short_rest',
  'dawn',
  'never',
  'manual',
] as const
export type ChargeRestore = (typeof CHARGE_RESTORE)[number]

export type GearCharges = {
  max: number
  restore: ChargeRestore
  /** e.g. "1d3" dawn recharge */
  recharge_dice?: string
}

export type PackContentRef = {
  /** Catalog slug when known. */
  slug?: string
  name_ru?: string
  qty: number
}

export type WeaponRange = {
  normal: number
  long: number
}

export type AbilityScoreKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

/**
 * Typed gear effects (MVP union). Unknown types stay as notes — never throw.
 * Full engine lands in later GEAR slices.
 */
export type GearEffect =
  | { type: 'ac_bonus'; value: number }
  | { type: 'attack_bonus'; value: number }
  | { type: 'damage_bonus'; value: number }
  | { type: 'ability_score'; ability: AbilityScoreKey; value: number }
  | { type: 'ability_mod'; ability: AbilityScoreKey; value: number }
  | { type: 'skill_bonus'; skill: string; value: number }
  | { type: 'save_bonus'; ability?: AbilityScoreKey; value: number }
  | { type: 'sense'; sense: string; range_ft?: number }
  | { type: 'speed'; mode?: string; value_ft: number }
  | { type: 'spell_slots'; level: number; delta: number }
  | { type: 'grant_spell'; slug: string; uses?: number }
  | { type: 'resistance'; damage_type: string }
  | { type: 'resource'; id: string; max: number; restore?: ChargeRestore }
  | { type: 'companion'; kind: string; name_ru?: string }
  | { type: 'sheet_flag'; flag: string; value?: boolean | string | number }
  | { type: 'custom_note'; text: string }
  | { type: string; [key: string]: unknown }

/** Canonical weapon payload in catalog_entries.data (kind=weapon). */
export type WeaponCatalogData = {
  schema_version?: typeof GEAR_DATA_SCHEMA_VERSION
  ability: AbilityScoreKey | string
  damage: string
  damage_type: string
  category: WeaponCategory | string
  finesse?: boolean
  ranged?: boolean
  weight_lb?: number | null
  properties?: string[]
  cost?: GearCost
  range?: WeaponRange
  versatile_damage?: string
  description_ru?: string
  source_book?: string
  rarity?: GearRarity
  requires_attunement?: boolean
  wear_slot?: WearSlot
  magic_bonus?: number
  base_weapon_slug?: string
  ammo_slug?: string
  charges?: GearCharges
  effects?: GearEffect[]
}

/** Canonical armor payload (kind=armor). */
export type ArmorCatalogData = {
  schema_version?: typeof GEAR_DATA_SCHEMA_VERSION
  armor_kind: ArmorKindCatalog | string
  base_ac: number | null
  weight_lb?: number | null
  stealth_disadvantage?: boolean
  /** Medium default 2; light = null (uncapped); heavy = 0. */
  max_dex_bonus?: number | null
  strength_requirement?: number | null
  cost?: GearCost
  description_ru?: string
  source_book?: string
  rarity?: GearRarity
  requires_attunement?: boolean
  wear_slot?: WearSlot
  magic_bonus?: number
  base_armor_slug?: string
  charges?: GearCharges
  effects?: GearEffect[]
}

/** Canonical item / gear / tool / pack payload (kind=item). */
export type ItemCatalogData = {
  schema_version?: typeof GEAR_DATA_SCHEMA_VERSION
  weight_lb?: number | null
  cost?: GearCost
  description_ru?: string
  source_book?: string
  item_category?: ItemCategory
  tool_type?: ToolType
  stackable?: boolean
  contents?: PackContentRef[]
  container_capacity_lb?: number
  rarity?: GearRarity
  requires_attunement?: boolean
  wear_slot?: WearSlot
  charges?: GearCharges
  effects?: GearEffect[]
}

export type ParsedWeaponCatalog = {
  schema_version: number
  ability: AbilityScoreKey
  damage: string
  damage_type: string
  category: WeaponCategory
  finesse: boolean
  ranged: boolean
  weight_lb: number | null
  properties: string[]
  cost: GearCost | null
  range: WeaponRange | null
  versatile_damage: string
  description_ru: string
  source_book: string
  rarity: GearRarity
  requires_attunement: boolean
  wear_slot: WearSlot
  magic_bonus: number
  base_weapon_slug: string
  ammo_slug: string
  charges: GearCharges | null
  effects: GearEffect[]
}

export type ParsedArmorCatalog = {
  schema_version: number
  armor_kind: ArmorKindCatalog
  base_ac: number | null
  weight_lb: number | null
  stealth_disadvantage: boolean
  max_dex_bonus: number | null
  strength_requirement: number | null
  cost: GearCost | null
  description_ru: string
  source_book: string
  rarity: GearRarity
  requires_attunement: boolean
  wear_slot: WearSlot
  magic_bonus: number
  base_armor_slug: string
  charges: GearCharges | null
  effects: GearEffect[]
}

export type ParsedItemCatalog = {
  schema_version: number
  weight_lb: number | null
  cost: GearCost | null
  description_ru: string
  source_book: string
  item_category: ItemCategory
  tool_type: ToolType | null
  stackable: boolean
  contents: PackContentRef[]
  container_capacity_lb: number | null
  rarity: GearRarity
  requires_attunement: boolean
  wear_slot: WearSlot
  charges: GearCharges | null
  effects: GearEffect[]
}

// —— helpers ——

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function readBool(value: unknown): boolean {
  return value === true
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

function readSchemaVersion(row: Record<string, unknown>): number {
  const raw = row.schema_version
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.floor(raw)
  return 0
}

function isAbility(value: unknown): value is AbilityScoreKey {
  return (
    value === 'str' ||
    value === 'dex' ||
    value === 'con' ||
    value === 'int' ||
    value === 'wis' ||
    value === 'cha'
  )
}

function isWearSlot(value: unknown): value is WearSlot {
  return typeof value === 'string' && (WEAR_SLOTS as readonly string[]).includes(value)
}

function isRarity(value: unknown): value is GearRarity {
  return typeof value === 'string' && (GEAR_RARITIES as readonly string[]).includes(value)
}

function isItemCategory(value: unknown): value is ItemCategory {
  return typeof value === 'string' && (ITEM_CATEGORIES as readonly string[]).includes(value)
}

function isToolType(value: unknown): value is ToolType {
  return typeof value === 'string' && (TOOL_TYPES as readonly string[]).includes(value)
}

function isChargeRestore(value: unknown): value is ChargeRestore {
  return typeof value === 'string' && (CHARGE_RESTORE as readonly string[]).includes(value)
}

function isArmorKindCatalog(value: unknown): value is ArmorKindCatalog {
  return (
    value === 'none' ||
    value === 'light' ||
    value === 'medium' ||
    value === 'heavy' ||
    value === 'shield'
  )
}

/** Parse PHB-style cost object or legacy number-as-gp / "2 gp" strings. */
export function parseGearCost(value: unknown): GearCost | null {
  if (value == null) return null
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { amount: value, unit: 'gp' }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase().replace(',', '.')
    const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(gp|sp|cp|зм|см|мм)?$/i)
    if (!match) return null
    const amount = Number(match[1])
    if (!Number.isFinite(amount)) return null
    const unitRaw = (match[2] ?? 'gp').toLowerCase()
    const unit: GearCostUnit =
      unitRaw === 'sp' || unitRaw === 'см'
        ? 'sp'
        : unitRaw === 'cp' || unitRaw === 'мм'
          ? 'cp'
          : 'gp'
    return { amount, unit }
  }
  const row = asRecord(value)
  const amount = readFiniteNumber(row.amount ?? row.value ?? row.gp)
  if (amount == null) return null
  const unitRaw = readString(row.unit) ?? 'gp'
  const unit: GearCostUnit =
    unitRaw === 'sp' || unitRaw === 'см'
      ? 'sp'
      : unitRaw === 'cp' || unitRaw === 'мм'
        ? 'cp'
        : 'gp'
  return { amount, unit }
}

/** Convert cost to gold pieces (gp) for sorting / filters. */
export function gearCostToGp(cost: GearCost | null | undefined): number | null {
  if (!cost) return null
  if (cost.unit === 'gp') return cost.amount
  if (cost.unit === 'sp') return cost.amount / 10
  return cost.amount / 100
}

export function formatGearCostRu(cost: GearCost | null | undefined): string {
  if (!cost) return ''
  const unit =
    cost.unit === 'gp' ? 'зм' : cost.unit === 'sp' ? 'см' : 'мм'
  const amount =
    Number.isInteger(cost.amount) ? String(cost.amount) : String(cost.amount)
  return `${amount} ${unit}`
}

function parseCharges(value: unknown): GearCharges | null {
  const row = asRecord(value)
  const max = readFiniteNumber(row.max ?? row.charges_max ?? row.uses)
  if (max == null || max < 0) return null
  const restoreRaw = row.restore ?? row.recharge ?? row.reset
  const restore: ChargeRestore = isChargeRestore(restoreRaw) ? restoreRaw : 'manual'
  const recharge_dice = readString(row.recharge_dice)
  return {
    max: Math.floor(max),
    restore,
    ...(recharge_dice ? { recharge_dice } : {}),
  }
}

function parseEffects(value: unknown): GearEffect[] {
  if (!Array.isArray(value)) return []
  const out: GearEffect[] = []
  for (const item of value) {
    const row = asRecord(item)
    const type = readString(row.type)
    if (!type) continue
    out.push({ ...row, type } as GearEffect)
  }
  return out
}

function parseContents(value: unknown): PackContentRef[] {
  if (!Array.isArray(value)) return []
  const out: PackContentRef[] = []
  for (const item of value) {
    if (typeof item === 'string' && item.trim()) {
      out.push({ slug: item.trim(), qty: 1 })
      continue
    }
    const row = asRecord(item)
    const slug = readString(row.slug)
    const name_ru = readString(row.name_ru ?? row.name)
    const qty = Math.max(1, Math.floor(readFiniteNumber(row.qty ?? row.quantity) ?? 1))
    if (!slug && !name_ru) continue
    out.push({
      ...(slug ? { slug } : {}),
      ...(name_ru ? { name_ru } : {}),
      qty,
    })
  }
  return out
}

function parseWeaponRange(value: unknown): WeaponRange | null {
  if (value == null) return null
  if (typeof value === 'string') {
    // "20/60" or "дис. 20/60"
    const match = value.replace(/,/g, '').match(/(\d+)\s*\/\s*(\d+)/)
    if (!match) return null
    return { normal: Number(match[1]), long: Number(match[2]) }
  }
  const row = asRecord(value)
  const normal = readFiniteNumber(row.normal ?? row.short ?? row.min)
  const long = readFiniteNumber(row.long ?? row.max)
  if (normal == null || long == null) return null
  return { normal, long }
}

function parseArmorKind(raw: unknown): ArmorKindCatalog {
  if (isArmorKindCatalog(raw)) return raw
  if (typeof raw !== 'string') return 'none'
  const lower = raw.toLowerCase()
  if (lower.includes('shield') || lower.includes('щит')) return 'shield'
  if (lower.includes('light') || lower.includes('лёгк') || lower.includes('легк')) return 'light'
  if (lower.includes('medium') || lower.includes('средн')) return 'medium'
  if (lower.includes('heavy') || lower.includes('тяж')) return 'heavy'
  return 'none'
}

function defaultMaxDex(kind: ArmorKindCatalog, explicit: number | null): number | null {
  if (explicit != null) return explicit
  if (kind === 'medium') return 2
  if (kind === 'heavy') return 0
  if (kind === 'light') return null
  return null
}

function defaultWearSlotArmor(kind: ArmorKindCatalog, explicit: WearSlot | null): WearSlot {
  if (explicit) return explicit
  if (kind === 'shield') return 'shield'
  if (kind === 'light' || kind === 'medium' || kind === 'heavy') return 'body_armor'
  return 'none'
}

function defaultWearSlotWeapon(ranged: boolean, explicit: WearSlot | null): WearSlot {
  if (explicit) return explicit
  return ranged ? 'held_main' : 'held_main'
}

function inferItemCategory(row: Record<string, unknown>): ItemCategory {
  const explicit = row.item_category ?? row.category
  if (isItemCategory(explicit)) return explicit
  if (typeof explicit === 'string') {
    const lower = explicit.toLowerCase()
    if (lower.includes('tool') || lower.includes('инструмент')) return 'tool'
    if (lower.includes('pack') || lower.includes('набор')) return 'pack'
    if (lower.includes('ammo') || lower.includes('боеприпас')) return 'ammo'
    if (lower.includes('focus') || lower.includes('фокус')) return 'focus'
    if (lower.includes('mount') || lower.includes('скакун')) return 'mount'
    if (lower.includes('vehicle') || lower.includes('транспорт')) return 'vehicle'
  }
  return 'gear'
}

function readWeightLb(row: Record<string, unknown>): number | null {
  return readFiniteNumber(row.weight_lb ?? row.weight)
}

function readRarity(row: Record<string, unknown>): GearRarity {
  if (isRarity(row.rarity)) return row.rarity
  // Legacy magic stubs often have empty combat stats — treat as uncommon placeholder.
  return 'mundane'
}

function readProperties(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
}

// —— public parsers ——

/** Normalize catalog entry.data into the weapon v1 contract (legacy-safe). */
export function parseWeaponCatalogData(
  data: Record<string, unknown> | null | undefined,
): ParsedWeaponCatalog {
  const row = data ?? {}
  const properties = readProperties(row.properties)
  const finesse =
    row.finesse === true || properties.some((p) => p.toLowerCase() === 'finesse')
  const ranged =
    row.ranged === true ||
    properties.some((p) => {
      const key = p.toLowerCase()
      return key === 'ammunition' || key === 'thrown'
    })
  const categoryRaw = readString(row.category)?.toLowerCase()
  const category: WeaponCategory = categoryRaw === 'martial' ? 'martial' : 'simple'
  const abilityRaw = readString(row.ability)?.toLowerCase()
  const ability: AbilityScoreKey = isAbility(abilityRaw)
    ? abilityRaw
    : finesse || ranged
      ? 'dex'
      : 'str'
  const wearExplicit = isWearSlot(row.wear_slot) ? row.wear_slot : null

  return {
    schema_version: readSchemaVersion(row),
    ability,
    damage: readString(row.damage) ?? '',
    damage_type: readString(row.damage_type) ?? readString(row.damageType) ?? '',
    category,
    finesse,
    ranged,
    weight_lb: readWeightLb(row),
    properties,
    cost: parseGearCost(row.cost ?? row.price),
    range: parseWeaponRange(row.range ?? row.range_ft),
    versatile_damage:
      readString(row.versatile_damage) ??
      readString(row.versatile) ??
      readString(row.two_handed_damage) ??
      '',
    description_ru: readString(row.description_ru) ?? readString(row.description) ?? '',
    source_book: readString(row.source_book) ?? '',
    rarity: readRarity(row),
    requires_attunement: readBool(row.requires_attunement ?? row.attunement),
    wear_slot: defaultWearSlotWeapon(ranged, wearExplicit),
    magic_bonus: Math.floor(readFiniteNumber(row.magic_bonus ?? row.bonus) ?? 0),
    base_weapon_slug: readString(row.base_weapon_slug) ?? '',
    ammo_slug: readString(row.ammo_slug) ?? '',
    charges: parseCharges(row.charges),
    effects: parseEffects(row.effects),
  }
}

/** Normalize catalog entry.data into the armor v1 contract (legacy-safe). */
export function parseArmorCatalogData(
  data: Record<string, unknown> | null | undefined,
): ParsedArmorCatalog {
  const row = data ?? {}
  let kind = parseArmorKind(row.armor_kind ?? row.armor_type ?? row.category)
  const base =
    readFiniteNumber(row.base_ac) ??
    readFiniteNumber(row.ac) ??
    readFiniteNumber(row.ac_bonus)
  // Legacy: typed AC without kind → treat as light (same as previous reader).
  if (kind === 'none' && base != null) kind = 'light'
  const explicitMaxDex = readFiniteNumber(row.max_dex_bonus ?? row.max_dex ?? row.dex_cap)
  const wearExplicit = isWearSlot(row.wear_slot) ? row.wear_slot : null

  return {
    schema_version: readSchemaVersion(row),
    armor_kind: kind,
    base_ac: base,
    weight_lb: readWeightLb(row),
    stealth_disadvantage: readBool(row.stealth_disadvantage),
    max_dex_bonus: defaultMaxDex(kind, explicitMaxDex),
    strength_requirement: readFiniteNumber(
      row.strength_requirement ?? row.str_requirement ?? row.min_str,
    ),
    cost: parseGearCost(row.cost ?? row.price),
    description_ru: readString(row.description_ru) ?? readString(row.description) ?? '',
    source_book: readString(row.source_book) ?? '',
    rarity: readRarity(row),
    requires_attunement: readBool(row.requires_attunement ?? row.attunement),
    wear_slot: defaultWearSlotArmor(kind, wearExplicit),
    magic_bonus: Math.floor(readFiniteNumber(row.magic_bonus ?? row.bonus) ?? 0),
    base_armor_slug: readString(row.base_armor_slug) ?? '',
    charges: parseCharges(row.charges),
    effects: parseEffects(row.effects),
  }
}

/** Normalize catalog entry.data into the item v1 contract (legacy-safe). */
export function parseItemCatalogData(
  data: Record<string, unknown> | null | undefined,
): ParsedItemCatalog {
  const row = data ?? {}
  const item_category = inferItemCategory(row)
  const toolRaw = row.tool_type
  const wearExplicit = isWearSlot(row.wear_slot) ? row.wear_slot : null
  const stackableExplicit = row.stackable
  const stackable =
    typeof stackableExplicit === 'boolean'
      ? stackableExplicit
      : item_category !== 'pack' && item_category !== 'tool'

  return {
    schema_version: readSchemaVersion(row),
    weight_lb: readWeightLb(row),
    cost: parseGearCost(row.cost ?? row.price),
    description_ru: readString(row.description_ru) ?? readString(row.description) ?? '',
    source_book: readString(row.source_book) ?? '',
    item_category,
    tool_type: isToolType(toolRaw) ? toolRaw : null,
    stackable,
    contents: parseContents(row.contents ?? row.includes ?? row.contains),
    container_capacity_lb: readFiniteNumber(row.container_capacity_lb ?? row.capacity_lb),
    rarity: readRarity(row),
    requires_attunement: readBool(row.requires_attunement ?? row.attunement),
    wear_slot: wearExplicit ?? 'none',
    charges: parseCharges(row.charges),
    effects: parseEffects(row.effects),
  }
}

/** Weight from any gear kind (legacy-safe). */
export function readGearWeightLb(data: Record<string, unknown> | null | undefined): number | null {
  return readWeightLb(data ?? {})
}

/**
 * Dex cap used in AC math: null = uncapped (light), 0 = no dex (heavy), N = cap.
 * Falls back by armor_kind when field absent.
 */
export function armorMaxDexBonus(parsed: Pick<ParsedArmorCatalog, 'armor_kind' | 'max_dex_bonus'>):
  | number
  | null {
  return defaultMaxDex(parsed.armor_kind, parsed.max_dex_bonus)
}

/** Whether catalog armor row looks like usable body armor / shield (not empty magic stub). */
export function isUsableArmorCatalog(parsed: ParsedArmorCatalog): boolean {
  if (parsed.armor_kind === 'shield') return true
  if (parsed.armor_kind === 'none') return false
  return parsed.base_ac != null
}

/** Whether catalog weapon row has combat dice (mundane / filled magic). */
export function isUsableWeaponCatalog(parsed: ParsedWeaponCatalog): boolean {
  return Boolean(parsed.damage && parsed.damage !== '—' && parsed.damage !== '-')
}
