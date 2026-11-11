/**
 * Catalog spell `data` contract (D&D 2014).
 * JSONB on catalog_entries — readers must accept legacy SRD shapes.
 */

import { summonCastPreview } from './summonSpellPreview'

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
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(9, Math.floor(value)))
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(9, Math.floor(parsed)))
  }
  return 0
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

/**
 * RAW list gate: spell is on a class list only if `classes` includes the caster
 * and, when `subclasses` is non-empty for that class, the character’s subclass matches.
 * Empty `subclasses` = unrestricted for every tagged class (PHB/XGE default).
 */
export function spellAvailableOnClassList(input: {
  classes: string[]
  subclasses?: SpellSubclassRef[] | null
  classSlug: string
  subclassSlug?: string | null
}): boolean {
  const classSlug = input.classSlug.trim().toLowerCase()
  if (!classSlug) return false
  const onClass = input.classes.some((c) => c.trim().toLowerCase() === classSlug)
  if (!onClass) return false
  const gates = (input.subclasses ?? []).filter(
    (ref) => ref.class.trim().toLowerCase() === classSlug,
  )
  if (gates.length === 0) return true
  const sub = (input.subclassSlug ?? '').trim().toLowerCase()
  if (!sub) return false
  return gates.some((ref) => ref.subclass.trim().toLowerCase() === sub)
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

export type CastEffectSpell = {
  level: number
  name?: string | null
  damage?: string | null
  damage_at_character_level?: SpellScaleTable
  damage_at_slot_level?: SpellScaleTable
  /** Optional prose used when scale tables are missing (e.g. Armor of Agathys). */
  description?: string | null
  higher_levels?: string | null
  duration?: string | null
}

/** Which half of a split upcast grows (Flame Strike: fire or radiant). */
export type DamageTypeChoice = 'first' | 'second'

export type CastEffectOptions = {
  characterLevel: number
  slotLevel: number
  /** Spellcasting ability modifier. Replaces a literal `MOD` in the effect. */
  spellMod?: number | null
  /** Short source, e.g. МУД — shown next to the number. */
  spellModLabel?: string | null
  /** Flame Strike and the same PHB pattern: which damage type the extra dice join. */
  damageChoice?: DamageTypeChoice
  /** Draconic Elemental Affinity: +CHA to one roll of this damage type. */
  affinity?: { damageType: string; amount: number } | null
}

const SPLIT_DAMAGE_RE =
  /^(\d+)\s*d\s*(\d+)\s+(\S+)\s*,\s*(\d+)\s*d\s*(\d+)\s+(\S+)$/i

/**
 * PHB Flame Strike: both damage types stay; above the base slot the caster
 * picks which type grows. Returns null when the spell is not that pattern.
 */
export function resolveTypedDamageChoice(
  spell: CastEffectSpell,
  slotLevel: number,
  choice: DamageTypeChoice = 'first',
): string | null {
  const higher = spell.higher_levels ?? ''
  if (!/на ваш выбор|your choice/i.test(higher)) return null
  const base = (spell.damage ?? '').trim()
  const match = base.match(SPLIT_DAMAGE_RE)
  if (!match) return null
  const die = match[2]
  if (die !== match[5]) return null
  const extra = Math.max(0, Math.floor(slotLevel) - Math.max(1, Math.floor(spell.level) || 1))
  const first = Number(match[1]) + (choice === 'first' ? extra : 0)
  const second = Number(match[4]) + (choice === 'second' ? extra : 0)
  return `${first}d${die} ${match[3]} + ${second}d${die} ${match[6]}`
}

export function spellOffersDamageTypeChoice(spell: CastEffectSpell): boolean {
  return resolveTypedDamageChoice(spell, spell.level, 'first') != null
}

export function damageTypeChoiceLabels(
  spell: CastEffectSpell,
): { first: string; second: string } | null {
  const match = (spell.damage ?? '').trim().match(SPLIT_DAMAGE_RE)
  if (!match || !spellOffersDamageTypeChoice(spell)) return null
  return { first: match[3] ?? 'первый', second: match[6] ?? 'второй' }
}

/**
 * PHB Elemental Affinity: add the Charisma modifier to one damage roll
 * of the draconic ancestry type. Other types in the same spell stay plain.
 */
export function applyElementalAffinityBonus(
  effect: string,
  damageType: string,
  amount: number,
): string {
  const type = damageType.trim()
  if (!effect.trim() || !type || !Number.isFinite(amount)) return effect
  const signed = amount >= 0 ? `+${Math.trunc(amount)}` : `${Math.trunc(amount)}`
  const escaped = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})(?!\\s*[+-]\\d)`, 'i')
  if (!re.test(effect)) return effect
  return effect.replace(re, `$1${signed}`)
}

/** `1d8 + MOD` → `1d8+3 (МУД)`. Leaves the text alone when the modifier is unknown. */
export function applySpellModPlaceholder(
  effect: string,
  spellMod: number | null | undefined,
  sourceLabel?: string | null,
): string {
  if (spellMod == null || !Number.isFinite(spellMod) || !/\bMOD\b/.test(effect)) {
    return effect
  }
  const n = Math.trunc(spellMod)
  const signed = n >= 0 ? `+${n}` : `${n}`
  const replaced = effect.replace(/\s*\+\s*MOD\b/g, signed).replace(/\bMOD\b/g, String(n))
  const label = sourceLabel?.trim()
  return label ? `${replaced} (${label})` : replaced
}

/**
 * Resolve effect dice/text for a cast.
 * Cantrips scale by character level; leveled spells by slot level (upcast).
 * If the scale table is bare `NdM` and `damage` has a type suffix (`8d6 огонь`),
 * keep the suffix.
 */
export function resolveCastEffect(
  spell: CastEffectSpell,
  options: CastEffectOptions,
): { effect: string; scaled: boolean } {
  const finish = (effect: string, scaled: boolean) => {
    const withMod = applySpellModPlaceholder(
      effect,
      options.spellMod,
      options.spellModLabel,
    )
    const affinity = options.affinity
    return {
      effect: affinity
        ? applyElementalAffinityBonus(withMod, affinity.damageType, affinity.amount)
        : withMod,
      scaled,
    }
  }
  const typed = resolveTypedDamageChoice(
    spell,
    options.slotLevel,
    options.damageChoice ?? 'first',
  )
  if (typed) {
    return finish(typed, Math.floor(options.slotLevel) > Math.max(1, spell.level))
  }

  const base = typeof spell.damage === 'string' ? spell.damage.trim() : ''
  const isCantrip = spell.level <= 0
  const scaledRaw = isCantrip
    ? scaleAtCharacterLevel(
        spell.damage_at_character_level,
        options.characterLevel,
        '',
      )
    : scaleAtSlotLevel(spell.damage_at_slot_level, options.slotLevel, '')

  if (!scaledRaw) {
    return finish(base, false)
  }

  const bareDice = /^\d+d\d+$/i.test(scaledRaw.trim())
  if (bareDice && base) {
    const suffix = base.match(/^\d+d\d+(\b.*)$/i)
    if (suffix) {
      return finish(`${scaledRaw.trim()}${suffix[1]}`, true)
    }
  }

  return finish(scaledRaw.trim(), true)
}

export type CastEffectSummary = {
  /** Primary one-line effect (dice / compact). */
  effect: string
  scaled: boolean
  /** Bullet lines for the cast dialog (temp HP, retaliation, duration…). */
  lines: string[]
}

/**
 * Armor of Agathys–style: N temporary HP + N cold damage, +N per slot above base.
 * Parsed from RU description + higher_levels when scale tables are absent.
 */
export function parseTempHpRetaliationScale(
  spell: CastEffectSpell,
  slotLevel: number,
): { tempHp: number; retaliation: number; step: number } | null {
  const desc = (spell.description ?? '').trim()
  if (!desc) return null
  const tempMatch = desc.match(
    /получаете\s+(\d+)\s+временн(?:ых|ые)\s+хит/i,
  )
  const retalMatch = desc.match(/получает\s+(\d+)\s+урона/i)
  if (!tempMatch || !retalMatch) return null
  const baseTemp = Number(tempMatch[1])
  const baseRetal = Number(retalMatch[1])
  if (!Number.isFinite(baseTemp) || !Number.isFinite(baseRetal)) return null
  const higher = (spell.higher_levels ?? '').trim()
  const stepMatch = higher.match(
    /увеличиваются\s+на\s+(\d+)\s+за\s+каждый\s+уровень/i,
  )
  const step = stepMatch ? Number(stepMatch[1]) : 0
  const baseLevel = Math.max(1, Math.floor(spell.level) || 1)
  const slot = Math.max(baseLevel, Math.floor(slotLevel) || baseLevel)
  const extra = step > 0 ? Math.max(0, slot - baseLevel) * step : 0
  return {
    tempHp: baseTemp + extra,
    retaliation: baseRetal + extra,
    step,
  }
}

/**
 * Full cast preview: scale tables first, then prose-derived temp-HP patterns.
 */
export function resolveCastEffectSummary(
  spell: CastEffectSpell,
  options: CastEffectOptions,
): CastEffectSummary {
  const summon = summonCastPreview(spell, options.slotLevel)
  if (summon) return summon
  const resolved = resolveCastEffect(spell, options)
  const lines: string[] = []
  const temp = parseTempHpRetaliationScale(spell, options.slotLevel)
  if (temp) {
    lines.push(`${temp.tempHp} временных хитов`)
    lines.push(`${temp.retaliation} урона холодом (ответ)`)
    const duration = spell.duration?.trim()
    if (duration) lines.push(`длительность: ${duration}`)
    const compact = `${temp.tempHp} врем. хитов · ${temp.retaliation} хол.`
    return {
      effect: resolved.effect || compact,
      scaled: temp.step > 0 || resolved.scaled,
      lines,
    }
  }
  if (resolved.effect) lines.push(resolved.effect)
  const duration = spell.duration?.trim()
  if (duration && resolved.effect) lines.push(`длительность: ${duration}`)
  return { effect: resolved.effect, scaled: resolved.scaled, lines }
}
