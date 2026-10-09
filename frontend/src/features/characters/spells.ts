import {
  parseSpellCatalogData,
  type SpellComponents,
  type SpellScaleTable,
} from '../../shared/dnd/spellCatalog'
import {
  clampPactSlots,
  clampSlot,
  countsTowardPrepareLimit,
  isSpellcastingAbility,
  type PactSlotState,
  type SpellSlotState,
  type SpellcastingAbility,
} from '../../shared/dnd/spells'
import { asRecord, readNullableNumber, readNumber } from './sheetTypes'

export type SpellSourceKind =
  | 'catalog'
  | 'custom'
  | 'race'
  | 'feat'
  | 'subclass'
  | 'feature'

export type SheetSpell = {
  id: string
  name: string
  catalog_id: string | null
  level: number
  prepared: boolean
  notes: string
  casting_time: string
  range: string
  attack_or_save: string
  damage: string
  concentration: boolean
  duration?: string
  ritual?: boolean
  school?: string
  source_book?: string
  /** Snapshot for UI / later cast scaling; full description stays in catalog. */
  components?: SpellComponents
  damage_at_character_level?: SpellScaleTable
  damage_at_slot_level?: SpellScaleTable
  higher_levels?: string
  /**
   * Who put this row on the sheet (race / feat / subclass domain…).
   * Manual adds stay `catalog` / `custom` / unset.
   */
  source_kind?: SpellSourceKind
  /**
   * Race grant mode mirrored from catalog.
   * innate: free racial cast, does not count toward prepare cap.
   * spell_list: mark/class-list expansion; player prepares like class spells.
   */
  race_grant?: 'innate' | 'spell_list'
  /** Feat grant mode (same semantics as race_grant). */
  feat_grant?: 'innate' | 'spell_list'
  /**
   * Always-prepared / granted: cannot unprepare; excluded from max_prepared.
   * Used for domain/oath lists, feat innate, class features, etc.
   */
  prepared_locked?: boolean
  /** Short RU reason for the lock chip («Домен жизни», «Fey Touched», …). */
  prepare_source_label?: string
  /**
   * Limited free casts from race/feat/feature (1/long rest, PB/long rest…).
   * Cast picker can spend this instead of a slot/pact; rest recovers `used`.
   */
  grant_cast?: SpellGrantCast
}

/** Free cast charge from a grant source (race innate, Fey Touched, …). */
export type SpellGrantCast = {
  max: number
  used: number
  reset: 'short' | 'long'
  /** Chip label in cast picker («Раса», «Черта», …). */
  label: string
}

export type SpellsState = {
  casting_ability: SpellcastingAbility | null
  /** Null = no hard prepare cap (set manually until class tables exist). */
  max_prepared: number | null
  slots: Record<string, SpellSlotState>
  pact_slots: PactSlotState | null
  known: SheetSpell[]
  /**
   * Derived from inventory (sync on inventory change — not at every cast).
   * Free material components covered by focus / component pouch.
   */
  has_spell_focus?: boolean
  has_component_pouch?: boolean
  /** Last applied gear spell_slots deltas — unequip restores base max. */
  gear_slot_deltas?: Record<string, number>
}

const EMPTY_SLOTS: Record<string, SpellSlotState> = Object.fromEntries(
  Array.from({ length: 9 }, (_, i) => [String(i + 1), { max: 0, used: 0 }]),
)

export function createSheetSpell(): SheetSpell {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `spell-${Date.now()}`,
    name: '',
    catalog_id: null,
    level: 1,
    prepared: true,
    notes: '',
    casting_time: '',
    range: '',
    attack_or_save: '',
    damage: '',
    concentration: false,
  }
}

function readSlot(raw: unknown): SpellSlotState {
  const row = asRecord(raw)
  return clampSlot({
    max: readNumber(row.max, 0),
    used: readNumber(row.used, 0),
  })
}

function readSpellSourceKind(raw: unknown, id: string): SpellSourceKind | undefined {
  if (
    raw === 'race' ||
    raw === 'feat' ||
    raw === 'subclass' ||
    raw === 'feature' ||
    raw === 'catalog' ||
    raw === 'custom'
  ) {
    return raw
  }
  if (id.startsWith('race-spell:')) return 'race'
  if (id.startsWith('feat-spell:')) return 'feat'
  if (id.startsWith('subclass-spell:')) return 'subclass'
  if (id.startsWith('feature-spell:')) return 'feature'
  return undefined
}

function readGrantMode(raw: unknown): 'innate' | 'spell_list' | undefined {
  if (raw === 'innate' || raw === 'spell_list') return raw
  return undefined
}

function readScaleTable(raw: unknown): SpellScaleTable | undefined {
  const row = asRecord(raw)
  const out: SpellScaleTable = {}
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'string' && value.trim()) out[key] = value
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function readComponents(raw: unknown): SpellComponents | undefined {
  if (raw == null) return undefined
  if (Array.isArray(raw) || (typeof raw === 'object' && raw)) {
    return parseSpellCatalogData({ components: raw }).components
  }
  return undefined
}

function readSpell(raw: unknown, index: number): SheetSpell {
  const row = asRecord(raw)
  const level = Math.max(0, Math.min(9, Math.floor(readNumber(row.level, 0))))
  const id = typeof row.id === 'string' ? row.id : `spell-${index}`
  const sourceKind = readSpellSourceKind(row.source_kind ?? row.sourceKind, id)
  const raceGrant = readGrantMode(row.race_grant ?? row.raceGrant)
  const featGrant = readGrantMode(row.feat_grant ?? row.featGrant)
  const preparedLocked =
    row.prepared_locked === true ||
    row.preparedLocked === true ||
    raceGrant === 'innate' ||
    featGrant === 'innate' ||
    sourceKind === 'subclass'
  const prepareSourceLabel =
    typeof row.prepare_source_label === 'string'
      ? row.prepare_source_label
      : typeof row.prepareSourceLabel === 'string'
        ? row.prepareSourceLabel
        : undefined
  const components = readComponents(row.components)
  const damageAtCharacter = readScaleTable(row.damage_at_character_level)
  const damageAtSlot = readScaleTable(row.damage_at_slot_level)
  const grantCast = readGrantCast(row.grant_cast ?? row.grantCast)
  return {
    id,
    name: typeof row.name === 'string' ? row.name : '',
    catalog_id: typeof row.catalog_id === 'string' ? row.catalog_id : null,
    level,
    prepared: row.prepared !== false || preparedLocked,
    notes: typeof row.notes === 'string' ? row.notes : '',
    casting_time: typeof row.casting_time === 'string' ? row.casting_time : '',
    range: typeof row.range === 'string' ? row.range : '',
    attack_or_save:
      typeof row.attack_or_save === 'string'
        ? row.attack_or_save
        : typeof row.save === 'string'
          ? row.save
          : '',
    damage: typeof row.damage === 'string' ? row.damage : '',
    concentration: Boolean(row.concentration),
    ...(typeof row.duration === 'string' && row.duration
      ? { duration: row.duration }
      : {}),
    ...(row.ritual === true ? { ritual: true } : {}),
    ...(typeof row.school === 'string' && row.school ? { school: row.school } : {}),
    ...(typeof row.source_book === 'string' && row.source_book
      ? { source_book: row.source_book }
      : {}),
    ...(components ? { components } : {}),
    ...(damageAtCharacter ? { damage_at_character_level: damageAtCharacter } : {}),
    ...(damageAtSlot ? { damage_at_slot_level: damageAtSlot } : {}),
    ...(typeof row.higher_levels === 'string' && row.higher_levels
      ? { higher_levels: row.higher_levels }
      : {}),
    ...(sourceKind ? { source_kind: sourceKind } : {}),
    ...(raceGrant ? { race_grant: raceGrant } : {}),
    ...(featGrant ? { feat_grant: featGrant } : {}),
    ...(preparedLocked ? { prepared_locked: true } : {}),
    ...(prepareSourceLabel ? { prepare_source_label: prepareSourceLabel } : {}),
    ...(grantCast ? { grant_cast: grantCast } : {}),
  }
}

function readGrantCast(raw: unknown): SpellGrantCast | undefined {
  const row = asRecord(raw)
  const max = Math.floor(readNumber(row.max, 0))
  if (max <= 0) return undefined
  const resetRaw = row.reset
  const reset: 'short' | 'long' = resetRaw === 'short' ? 'short' : 'long'
  const label =
    typeof row.label === 'string' && row.label.trim() ? row.label.trim() : 'Грант'
  return {
    max,
    used: Math.min(max, Math.max(0, Math.floor(readNumber(row.used, 0)))),
    reset,
    label,
  }
}

/** Proficiency bonus for character level (PHB 2014). */
export function proficiencyBonusForLevel(level: number): number {
  const lvl = Math.max(1, Math.floor(level))
  return Math.max(2, Math.min(6, 2 + Math.floor((lvl - 1) / 4)))
}

/**
 * Parse free-cast limit from grant notes («1/длинный отдых», «ПБ раз / длинный отдых»).
 * Returns null when notes don't describe a limited free cast.
 */
export function parseGrantCastLimitFromNotes(
  notes: string | null | undefined,
  proficiencyBonus: number,
): { max: number; reset: 'short' | 'long' } | null {
  const text = (notes ?? '').toLowerCase()
  if (!text.trim()) return null
  const reset: 'short' | 'long' = /коротк/.test(text) ? 'short' : 'long'
  const pb = Math.max(1, Math.floor(proficiencyBonus))
  if (/пб\s*раз|пб\s*\/|prof(?:iciency)?\s*bonus/i.test(text)) {
    return { max: pb, reset }
  }
  const numbered = text.match(/(\d+)\s*\/\s*(?:длинн|коротк|день|long|short)/)
  if (numbered) {
    return { max: Math.max(1, Math.floor(Number(numbered[1]))), reset }
  }
  if (/без\s+ячейк|без\s+слота|once\s+per|1\s*раз/.test(text)) {
    return { max: 1, reset }
  }
  return null
}

/** Whether this sheet spell is an innate race/feat grant that can get free casts. */
export function isInnateGrantSpell(spell: SheetSpell): boolean {
  if (spell.level <= 0) return false
  if (spell.race_grant === 'innate') return true
  if (spell.feat_grant === 'innate') return true
  return false
}

export function grantCastRemaining(spell: SheetSpell): number {
  const grant = spell.grant_cast
  if (!grant || grant.max <= 0) return 0
  return Math.max(0, grant.max - grant.used)
}

export function canSpendGrantCast(spell: SheetSpell): boolean {
  return grantCastRemaining(spell) > 0
}

/** Build / refresh grant_cast for an innate leveled grant spell. Preserves used. */
export function withInnateGrantCast(
  spell: SheetSpell,
  options: { proficiencyBonus: number; label?: string },
): SheetSpell {
  if (!isInnateGrantSpell(spell)) {
    if (!spell.grant_cast) return spell
    const { grant_cast: _drop, ...rest } = spell
    return rest
  }
  const parsed = parseGrantCastLimitFromNotes(spell.notes, options.proficiencyBonus)
  const max = parsed?.max ?? 1
  const reset = parsed?.reset ?? 'long'
  const label =
    options.label ??
    spell.prepare_source_label ??
    (spell.source_kind === 'feat'
      ? 'Черта'
      : spell.source_kind === 'race'
        ? 'Раса'
        : 'Грант')
  const prevUsed = spell.grant_cast?.used ?? 0
  return {
    ...spell,
    grant_cast: {
      max,
      used: Math.min(max, Math.max(0, prevUsed)),
      reset,
      label,
    },
  }
}

/** Ensure innate race/feat leveled spells carry grant_cast charges. */
export function ensureInnateGrantCasts(
  known: SheetSpell[],
  proficiencyBonus: number,
): SheetSpell[] {
  let changed = false
  const next = known.map((spell) => {
    if (!isInnateGrantSpell(spell)) return spell
    const updated = withInnateGrantCast(spell, { proficiencyBonus })
    if (
      updated.grant_cast?.max !== spell.grant_cast?.max ||
      updated.grant_cast?.reset !== spell.grant_cast?.reset ||
      updated.grant_cast?.label !== spell.grant_cast?.label ||
      (spell.grant_cast == null && updated.grant_cast != null)
    ) {
      changed = true
      return updated
    }
    return spell
  })
  return changed ? next : known
}

export function spendGrantCast(known: SheetSpell[], spellId: string): SheetSpell[] {
  return known.map((spell) => {
    if (spell.id !== spellId || !spell.grant_cast) return spell
    if (grantCastRemaining(spell) <= 0) return spell
    return {
      ...spell,
      grant_cast: {
        ...spell.grant_cast,
        used: Math.min(spell.grant_cast.max, spell.grant_cast.used + 1),
      },
    }
  })
}

/** Recover grant_cast.used on short/long rest (long also clears short). */
export function recoverGrantCastsOnRest(
  known: SheetSpell[],
  kind: 'short' | 'long',
): SheetSpell[] {
  let changed = false
  const next = known.map((spell) => {
    const grant = spell.grant_cast
    if (!grant || grant.used <= 0) return spell
    if (kind === 'short' && grant.reset !== 'short') return spell
    changed = true
    return { ...spell, grant_cast: { ...grant, used: 0 } }
  })
  return changed ? next : known
}

export function raceSpellId(raceSlug: string, spellId: string): string {
  return `race-spell:${raceSlug}:${spellId}`
}

export function featSpellId(grantId: string, spellId: string): string {
  return `feat-spell:${grantId}:${spellId}`
}

export function subclassSpellId(
  classEntryId: string,
  subclassSlug: string,
  spellKey: string,
): string {
  return `subclass-spell:${classEntryId}:${subclassSlug}:${spellKey}`
}

export function featureSpellId(featureId: string, spellKey: string): string {
  return `feature-spell:${featureId}:${spellKey}`
}

export function spellKeyFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}

export function isRaceSheetSpell(spell: SheetSpell): boolean {
  return spell.source_kind === 'race' || spell.id.startsWith('race-spell:')
}

export function isFeatSheetSpell(spell: SheetSpell): boolean {
  return spell.source_kind === 'feat' || spell.id.startsWith('feat-spell:')
}

export function isSubclassSheetSpell(spell: SheetSpell): boolean {
  return spell.source_kind === 'subclass' || spell.id.startsWith('subclass-spell:')
}

/** Always-prepared from any source: race innate, feat innate, domain/oath, feature. */
export function isPreparedLocked(spell: SheetSpell): boolean {
  if (spell.prepared_locked) return true
  if (spell.race_grant === 'innate') return true
  if (spell.feat_grant === 'innate') return true
  return false
}

export function preparedLockChip(spell: SheetSpell): {
  label: string
  title: string
} | null {
  if (!isPreparedLocked(spell)) return null
  if (spell.prepare_source_label) {
    return {
      label: spell.prepare_source_label,
      title: `Всегда подготовлено · ${spell.prepare_source_label} — вне лимита подготовки`,
    }
  }
  if (spell.feat_grant === 'innate' || spell.source_kind === 'feat') {
    return {
      label: 'Черта',
      title: 'Заклинание от черты — всегда подготовлено, вне лимита',
    }
  }
  if (spell.race_grant === 'innate' || spell.source_kind === 'race') {
    return {
      label: 'Врождённое',
      title: 'Врождённый расовый каст — вне лимита подготовки',
    }
  }
  if (spell.source_kind === 'subclass') {
    return {
      label: 'Архетип',
      title: 'Заклинание домена/клятвы — всегда подготовлено, вне лимита',
    }
  }
  if (spell.source_kind === 'feature') {
    return {
      label: 'Умение',
      title: 'Заклинание от классового умения — всегда подготовлено, вне лимита',
    }
  }
  return {
    label: 'Всегда',
    title: 'Всегда подготовлено — вне лимита подготовки',
  }
}

/** Mark a sheet row as always-prepared from a grant source (subclass / feat / feature). */
export function asAlwaysPreparedSpell(
  spell: SheetSpell,
  input: {
    source_kind: Extract<SpellSourceKind, 'subclass' | 'feat' | 'feature'>
    label: string
    feat_grant?: 'innate' | 'spell_list'
  },
): SheetSpell {
  return {
    ...spell,
    prepared: true,
    prepared_locked: true,
    source_kind: input.source_kind,
    prepare_source_label: input.label,
    notes: spell.notes?.trim()
      ? spell.notes
      : `Всегда подготовлено · ${input.label}`,
    ...(input.feat_grant ? { feat_grant: input.feat_grant } : {}),
  }
}

export function stripRaceSheetSpells(known: SheetSpell[]): SheetSpell[] {
  return known.filter((spell) => !isRaceSheetSpell(spell))
}

export function stripFeatSheetSpells(known: SheetSpell[]): SheetSpell[] {
  return known.filter((spell) => !isFeatSheetSpell(spell))
}

/** Drop sheet rows for one applied feat grant (keep other feats). */
export function stripFeatSheetSpellsForGrant(
  known: SheetSpell[],
  grantId: string,
): SheetSpell[] {
  const prefix = `feat-spell:${grantId}:`
  return known.filter(
    (spell) => !(isFeatSheetSpell(spell) && spell.id.startsWith(prefix)),
  )
}

export function readSpells(sheet: Record<string, unknown>): SpellsState {
  const spells = asRecord(sheet.spells)
  const slotsRaw = asRecord(spells.slots)
  const slots: Record<string, SpellSlotState> = { ...EMPTY_SLOTS }
  for (let level = 1; level <= 9; level += 1) {
    const key = String(level)
    if (slotsRaw[key] != null) slots[key] = readSlot(slotsRaw[key])
  }

  const knownRaw = Array.isArray(spells.known)
    ? spells.known
    : Array.isArray(spells.prepared)
      ? spells.prepared
      : []

  const pactRaw = asRecord(spells.pact_slots)
  const hasPactKeys =
    pactRaw.max != null || pactRaw.used != null || pactRaw.level != null || pactRaw.enabled === true
  const pact_slots = hasPactKeys
    ? clampPactSlots({
        max: readNumber(pactRaw.max, 0),
        used: readNumber(pactRaw.used, 0),
        level: readNumber(pactRaw.level, 1),
      })
    : null
  const pactNormalized =
    pact_slots && pact_slots.max <= 0 && pactRaw.enabled !== true ? null : pact_slots

  const gearDeltasRaw = asRecord(spells.gear_slot_deltas)
  const gear_slot_deltas: Record<string, number> = {}
  for (const [key, value] of Object.entries(gearDeltasRaw)) {
    if (typeof value === 'number' && Number.isFinite(value) && value !== 0) {
      gear_slot_deltas[key] = Math.floor(value)
    }
  }

  return {
    casting_ability: isSpellcastingAbility(spells.casting_ability)
      ? spells.casting_ability
      : null,
    max_prepared: readNullableNumber(spells.max_prepared),
    slots,
    pact_slots: pactNormalized,
    known: knownRaw.map((item, index) => readSpell(item, index)),
    has_spell_focus: Boolean(spells.has_spell_focus),
    has_component_pouch: Boolean(spells.has_component_pouch),
    ...(Object.keys(gear_slot_deltas).length > 0 ? { gear_slot_deltas } : {}),
  }
}

export function spellsToSheet(state: SpellsState): Record<string, unknown> {
  const slots: Record<string, SpellSlotState> = {}
  for (let level = 1; level <= 9; level += 1) {
    const key = String(level)
    const slot = clampSlot(state.slots[key] ?? { max: 0, used: 0 })
    if (slot.max > 0 || slot.used > 0) slots[key] = slot
  }

  return {
    spells: {
      casting_ability: state.casting_ability,
      max_prepared: state.max_prepared,
      slots,
      pact_slots: state.pact_slots,
      has_spell_focus: Boolean(state.has_spell_focus),
      has_component_pouch: Boolean(state.has_component_pouch),
      ...(state.gear_slot_deltas && Object.keys(state.gear_slot_deltas).length > 0
        ? { gear_slot_deltas: state.gear_slot_deltas }
        : {}),
      known: state.known.map((spell) => ({
        id: spell.id,
        name: spell.name,
        catalog_id: spell.catalog_id,
        level: spell.level,
        prepared: spell.level <= 0 ? true : spell.prepared,
        notes: spell.notes,
        casting_time: spell.casting_time,
        range: spell.range,
        attack_or_save: spell.attack_or_save,
        damage: spell.damage,
        concentration: spell.concentration,
        ...(spell.duration ? { duration: spell.duration } : {}),
        ...(spell.ritual ? { ritual: true } : {}),
        ...(spell.school ? { school: spell.school } : {}),
        ...(spell.source_book ? { source_book: spell.source_book } : {}),
        ...(spell.components ? { components: spell.components } : {}),
        ...(spell.damage_at_character_level
          ? { damage_at_character_level: spell.damage_at_character_level }
          : {}),
        ...(spell.damage_at_slot_level
          ? { damage_at_slot_level: spell.damage_at_slot_level }
          : {}),
        ...(spell.higher_levels ? { higher_levels: spell.higher_levels } : {}),
        ...(spell.source_kind ? { source_kind: spell.source_kind } : {}),
        ...(spell.race_grant ? { race_grant: spell.race_grant } : {}),
        ...(spell.feat_grant ? { feat_grant: spell.feat_grant } : {}),
        ...(spell.prepared_locked || isPreparedLocked(spell)
          ? { prepared_locked: true }
          : {}),
        ...(spell.prepare_source_label
          ? { prepare_source_label: spell.prepare_source_label }
          : {}),
        ...(spell.grant_cast
          ? {
              grant_cast: {
                max: spell.grant_cast.max,
                used: spell.grant_cast.used,
                reset: spell.grant_cast.reset,
                label: spell.grant_cast.label,
              },
            }
          : {}),
      })),
      prepared: state.known
        .filter((spell) => spell.level <= 0 || spell.prepared)
        .map((spell) => spell.id),
    },
  }
}

export function readCatalogSpellFields(data: Record<string, unknown>): Partial<SheetSpell> {
  const parsed = parseSpellCatalogData(data)
  return {
    level: parsed.level,
    casting_time: parsed.casting_time_label,
    range: parsed.range,
    attack_or_save: parsed.attack_or_save,
    damage: parsed.damage,
    concentration: parsed.concentration,
    duration: parsed.duration,
    ritual: parsed.ritual,
    school: parsed.school,
    source_book: parsed.source_book,
    components: parsed.components,
    ...(parsed.damage_at_character_level
      ? { damage_at_character_level: parsed.damage_at_character_level }
      : {}),
    ...(parsed.damage_at_slot_level
      ? { damage_at_slot_level: parsed.damage_at_slot_level }
      : {}),
    ...(parsed.higher_levels ? { higher_levels: parsed.higher_levels } : {}),
  }
}

export function groupSpellsByLevel(spells: SheetSpell[]): Array<{ level: number; spells: SheetSpell[] }> {
  const map = new Map<number, SheetSpell[]>()
  for (const spell of spells) {
    const list = map.get(spell.level) ?? []
    list.push(spell)
    map.set(spell.level, list)
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([level, grouped]) => ({ level, spells: grouped }))
}

/**
 * Class prepare budget: leveled + prepared, excluding locked grants
 * (race/feat innate, domain/oath, class-feature always-prepared).
 */
export function spellCountsTowardPrepareCap(spell: SheetSpell): boolean {
  if (!countsTowardPrepareLimit(spell.level)) return false
  if (!spell.prepared) return false
  if (isPreparedLocked(spell)) return false
  return true
}

export function countPreparedLeveled(known: SheetSpell[]): number {
  return known.filter((spell) => spellCountsTowardPrepareCap(spell)).length
}

/** Player-chosen cantrips (excludes racial / feat / locked grants). */
export function countLearnedCantrips(known: SheetSpell[]): number {
  return known.filter((spell) => spell.level <= 0 && canRemoveSheetSpell(spell)).length
}

/** Player-chosen leveled spells on the known list / in the spellbook. */
export function countLearnedLeveled(known: SheetSpell[]): number {
  return known.filter((spell) => spell.level > 0 && canRemoveSheetSpell(spell)).length
}

/** Combat list: cantrips + prepared leveled spells. */
export function isReadyInCombat(spell: SheetSpell): boolean {
  return spell.level <= 0 || spell.prepared
}

export function canPrepareSpell(
  known: SheetSpell[],
  spell: SheetSpell,
  maxPrepared: number | null,
): boolean {
  if (isPreparedLocked(spell)) return true
  if (!countsTowardPrepareLimit(spell.level)) return true
  if (spell.prepared) return true
  if (maxPrepared == null) return true
  return countPreparedLeveled(known) < maxPrepared
}

export function setSpellPrepared(
  known: SheetSpell[],
  spellId: string,
  prepared: boolean,
  maxPrepared: number | null,
): SheetSpell[] {
  return known.map((spell) => {
    if (spell.id !== spellId) return spell
    if (spell.level <= 0 || isPreparedLocked(spell)) {
      return { ...spell, prepared: true }
    }
    if (prepared && !canPrepareSpell(known, spell, maxPrepared)) return spell
    return { ...spell, prepared }
  })
}

/** Drop locked grant rows (player cannot delete them from the list). */
export function canRemoveSheetSpell(spell: SheetSpell): boolean {
  return !isPreparedLocked(spell) && !isRaceSheetSpell(spell) && !isFeatSheetSpell(spell)
}

/**
 * Known casters (bard / sorcerer / warlock / ranger / EK / AT): no daily prepare
 * budget — spells on the list are always available. Prepared casters
 * (cleric / druid / paladin / wizard / artificer) use max_prepared.
 */
export function isKnownSpellcastingMode(input: {
  maxPrepared: number | null
  /** From suggestSpellcasting; omit when unknown. */
  hasCasterSuggestion?: boolean
}): boolean {
  if (input.maxPrepared != null) return false
  if (input.hasCasterSuggestion === false) return false
  return true
}

/** Ensure known-list spells are combat-ready (prepared=true). */
export function ensureKnownSpellsReady(known: SheetSpell[]): SheetSpell[] {
  let changed = false
  const next = known.map((spell) => {
    if (spell.level > 0 && !spell.prepared) {
      changed = true
      return { ...spell, prepared: true }
    }
    return spell
  })
  return changed ? next : known
}

export function sheetSpellFromCatalog(entry: {
  id: string
  name_ru: string
  data?: Record<string, unknown>
}): SheetSpell {
  const fields = readCatalogSpellFields(entry.data ?? {})
  const level = fields.level ?? 0
  return {
    ...createSheetSpell(),
    name: entry.name_ru,
    catalog_id: entry.id,
    level,
    prepared: level <= 0,
    casting_time: fields.casting_time ?? '',
    range: fields.range ?? '',
    attack_or_save: fields.attack_or_save ?? '',
    damage: fields.damage ?? '',
    concentration: Boolean(fields.concentration),
    ...(fields.duration ? { duration: fields.duration } : {}),
    ...(fields.ritual ? { ritual: true } : {}),
    ...(fields.school ? { school: fields.school } : {}),
    ...(fields.source_book ? { source_book: fields.source_book } : {}),
    ...(fields.components ? { components: fields.components } : {}),
    ...(fields.damage_at_character_level
      ? { damage_at_character_level: fields.damage_at_character_level }
      : {}),
    ...(fields.damage_at_slot_level
      ? { damage_at_slot_level: fields.damage_at_slot_level }
      : {}),
    ...(fields.higher_levels ? { higher_levels: fields.higher_levels } : {}),
  }
}

export function knownHasCatalogId(known: SheetSpell[], catalogId: string): boolean {
  return known.some((spell) => spell.catalog_id === catalogId)
}

export function addCatalogSpellToKnown(
  known: SheetSpell[],
  entry: { id: string; name_ru: string; data?: Record<string, unknown> },
  options?: { prepare?: boolean; maxPrepared?: number | null },
): SheetSpell[] {
  if (knownHasCatalogId(known, entry.id)) return known
  const spell = sheetSpellFromCatalog(entry)
  const prepare = options?.prepare ?? spell.level <= 0
  const maxPrepared = options?.maxPrepared ?? null
  let next = [...known, spell]
  if (prepare && spell.level > 0) {
    next = setSpellPrepared(next, spell.id, true, maxPrepared)
  }
  return next
}
