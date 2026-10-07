/**
 * Catalog spell `data` contract (D&D 2014).
 * JSONB on catalog_entries — readers must accept legacy SRD shapes.
 */

export const SPELL_DATA_SCHEMA_VERSION = 1 as const

export type SpellCastingTimeUnit =
  | 'action'
  | 'bonus'
  | 'reaction'
  | 'minute'
  | 'hour'
  | 'special'

export type SpellCastingTime = {
  unit: SpellCastingTimeUnit
  /** For minute/hour (and rare multi-action); default 1. */
  amount?: number
  /** Reaction trigger / special timing note (RU). */
  condition?: string
}

export type SpellComponents = {
  v: boolean
  s: boolean
  /** Material component text when M is required. */
  m?: string
}

export type SpellSubclassRef = {
  class: string
  subclass: string
}

/** Level-keyed dice/effect tables (string keys "1"…"20" or "0"…"9"). */
export type SpellScaleTable = Record<string, string>

/**
 * Canonical spell payload in catalog_entries.data for kind=spell (2014).
 * Optional keys may be absent on legacy rows until backfill.
 */
export type SpellCatalogData = {
  schema_version?: typeof SPELL_DATA_SCHEMA_VERSION
  level: number
  school: string
  casting_time: SpellCastingTime | string
  range: string
  components: SpellComponents | string[]
  duration?: string
  concentration: boolean
  ritual: boolean
  classes: string[]
  subclasses?: SpellSubclassRef[]
  attack_or_save?: string | null
  damage?: string | null
  damage_at_character_level?: SpellScaleTable
  damage_at_slot_level?: SpellScaleTable
  higher_levels?: string
  description?: string
  source_book?: string
  ritual_cast_without_prepare?: boolean
}

const CASTING_TIME_LABELS: Record<SpellCastingTimeUnit, string> = {
  action: '1 действие',
  bonus: '1 бонусное действие',
  reaction: '1 реакция',
  minute: 'минута',
  hour: 'час',
  special: 'особое',
}

const LEGACY_CASTING_TIME: Record<string, SpellCastingTime> = {
  Д: { unit: 'action', amount: 1 },
  д: { unit: 'action', amount: 1 },
  БД: { unit: 'bonus', amount: 1 },
  бд: { unit: 'bonus', amount: 1 },
  Р: { unit: 'reaction', amount: 1 },
  р: { unit: 'reaction', amount: 1 },
  '1 action': { unit: 'action', amount: 1 },
  '1 bonus action': { unit: 'bonus', amount: 1 },
  '1 reaction': { unit: 'reaction', amount: 1 },
}

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

function readLevel(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.min(9, Math.floor(value)))
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function readScaleTable(value: unknown): SpellScaleTable | undefined {
  const row = asRecord(value)
  const out: SpellScaleTable = {}
  for (const [key, raw] of Object.entries(row)) {
    if (typeof raw === 'string' && raw.trim()) out[key] = raw
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function readSubclasses(value: unknown): SpellSubclassRef[] | undefined {
  if (!Array.isArray(value)) return undefined
  const out: SpellSubclassRef[] = []
  for (const item of value) {
    const row = asRecord(item)
    const classSlug = readString(row.class)
    const subclassSlug = readString(row.subclass)
    if (classSlug && subclassSlug) out.push({ class: classSlug, subclass: subclassSlug })
  }
  return out.length > 0 ? out : undefined
}

/** Parse components from legacy ["V","S","M"] or canonical object. */
export function parseSpellComponents(raw: unknown): SpellComponents {
  if (Array.isArray(raw)) {
    const flags = new Set(
      raw
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().toUpperCase()),
    )
    return {
      v: flags.has('V'),
      s: flags.has('S'),
      m: flags.has('M') ? '' : undefined,
    }
  }
  const row = asRecord(raw)
  const material = readString(row.m)
  return {
    v: row.v === true,
    s: row.s === true,
    ...(material != null ? { m: material } : row.m === true || row.m === '' ? { m: '' } : {}),
  }
}

export function formatSpellComponents(components: SpellComponents): string {
  const parts: string[] = []
  if (components.v) parts.push('В')
  if (components.s) parts.push('С')
  if (components.m != null) {
    parts.push(components.m.trim() ? `М (${components.m.trim()})` : 'М')
  }
  return parts.join(', ') || '—'
}

/** Parse casting_time from legacy abbreviations / English / canonical object. */
export function parseSpellCastingTime(raw: unknown): SpellCastingTime {
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return { unit: 'special' }
    const legacy = LEGACY_CASTING_TIME[trimmed]
    if (legacy) return { ...legacy }

    const minute = trimmed.match(/^(\d+)\s*minutes?$/i)
    if (minute) return { unit: 'minute', amount: Number(minute[1]) }
    const hour = trimmed.match(/^(\d+)\s*hours?$/i)
    if (hour) return { unit: 'hour', amount: Number(hour[1]) }

    return { unit: 'special', condition: trimmed }
  }

  const row = asRecord(raw)
  const unitRaw = readString(row.unit)
  const unit: SpellCastingTimeUnit =
    unitRaw === 'action' ||
    unitRaw === 'bonus' ||
    unitRaw === 'reaction' ||
    unitRaw === 'minute' ||
    unitRaw === 'hour' ||
    unitRaw === 'special'
      ? unitRaw
      : 'special'
  const amount =
    typeof row.amount === 'number' && Number.isFinite(row.amount)
      ? Math.max(1, Math.floor(row.amount))
      : undefined
  const condition = readString(row.condition)
  return {
    unit,
    ...(amount != null ? { amount } : {}),
    ...(condition ? { condition } : {}),
  }
}

export function formatSpellCastingTime(time: SpellCastingTime): string {
  if (time.unit === 'minute' || time.unit === 'hour') {
    const n = time.amount ?? 1
    const unitLabel =
      time.unit === 'minute'
        ? n === 1
          ? 'минута'
          : n < 5
            ? 'минуты'
            : 'минут'
        : n === 1
          ? 'час'
          : n < 5
            ? 'часа'
            : 'часов'
    const base = `${n} ${unitLabel}`
    return time.condition ? `${base} (${time.condition})` : base
  }
  if (time.unit === 'reaction') {
    const base = CASTING_TIME_LABELS.reaction
    return time.condition ? `${base}, ${time.condition}` : base
  }
  if (time.unit === 'special') {
    return time.condition?.trim() || CASTING_TIME_LABELS.special
  }
  const base = CASTING_TIME_LABELS[time.unit]
  return time.condition ? `${base} (${time.condition})` : base
}

export type ParsedSpellCatalog = {
  schema_version: number
  level: number
  school: string
  casting_time: SpellCastingTime
  casting_time_label: string
  range: string
  components: SpellComponents
  components_label: string
  duration: string
  concentration: boolean
  ritual: boolean
  classes: string[]
  subclasses: SpellSubclassRef[]
  attack_or_save: string
  damage: string
  damage_at_character_level?: SpellScaleTable
  damage_at_slot_level?: SpellScaleTable
  higher_levels: string
  description: string
  source_book: string
  ritual_cast_without_prepare: boolean
}

/** Normalize catalog entry.data into the v1 contract (legacy-safe). */
export function parseSpellCatalogData(data: Record<string, unknown> | null | undefined): ParsedSpellCatalog {
  const row = data ?? {}
  const casting_time = parseSpellCastingTime(row.casting_time)
  const components = parseSpellComponents(row.components)
  const schemaRaw = row.schema_version
  const schema_version =
    typeof schemaRaw === 'number' && Number.isFinite(schemaRaw)
      ? Math.floor(schemaRaw)
      : 0

  return {
    schema_version,
    level: readLevel(row.level),
    school: readString(row.school) ?? '',
    casting_time,
    casting_time_label: formatSpellCastingTime(casting_time),
    range: readString(row.range) ?? '',
    components,
    components_label: formatSpellComponents(components),
    duration: readString(row.duration) ?? '',
    concentration: readBool(row.concentration),
    ritual: readBool(row.ritual),
    classes: readStringList(row.classes),
    subclasses: readSubclasses(row.subclasses) ?? [],
    attack_or_save: readString(row.attack_or_save) ?? readString(row.save) ?? '',
    damage: readString(row.damage) ?? '',
    damage_at_character_level: readScaleTable(row.damage_at_character_level),
    damage_at_slot_level: readScaleTable(row.damage_at_slot_level),
    higher_levels: readString(row.higher_levels) ?? readString(row.upper) ?? '',
    description: readString(row.description) ?? '',
    source_book: readString(row.source_book) ?? '',
    ritual_cast_without_prepare: readBool(row.ritual_cast_without_prepare),
  }
}

export function spellSchoolLabelRu(school: string): string {
  const map: Record<string, string> = {
    abjuration: 'ограждение',
    conjuration: 'вызов',
    divination: 'прорицание',
    enchantment: 'очарование',
    evocation: 'воплощение',
    illusion: 'иллюзия',
    necromancy: 'некромантия',
    transmutation: 'преобразование',
  }
  return map[school.toLowerCase()] ?? school
}

/** Pick damage/effect string for cantrip scaling by character level. */
export function scaleAtCharacterLevel(
  table: SpellScaleTable | undefined,
  characterLevel: number,
  fallback = '',
): string {
  if (!table) return fallback
  const level = Math.max(1, Math.floor(characterLevel))
  const thresholds = Object.keys(table)
    .map((key) => Number(key))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
  let chosen = fallback
  for (const threshold of thresholds) {
    if (level >= threshold) chosen = table[String(threshold)] ?? chosen
  }
  return chosen
}

/** Pick damage/effect string for slot upcast. */
export function scaleAtSlotLevel(
  table: SpellScaleTable | undefined,
  slotLevel: number,
  fallback = '',
): string {
  if (!table) return fallback
  const level = Math.max(0, Math.floor(slotLevel))
  if (table[String(level)]) return table[String(level)]
  const thresholds = Object.keys(table)
    .map((key) => Number(key))
    .filter((n) => Number.isFinite(n) && n <= level)
    .sort((a, b) => a - b)
  if (thresholds.length === 0) return fallback
  return table[String(thresholds[thresholds.length - 1])] ?? fallback
}
