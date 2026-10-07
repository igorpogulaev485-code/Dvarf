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

export type SpellSourceKind = 'catalog' | 'custom' | 'race'

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
  /** Race innate / granted spells; stripped on race revoke. */
  source_kind?: SpellSourceKind
  /**
   * Race grant mode mirrored from catalog.
   * innate: free racial cast, does not count toward prepare cap.
   * spell_list: mark/class-list expansion; player prepares like class spells.
   */
  race_grant?: 'innate' | 'spell_list'
}

export type SpellsState = {
  casting_ability: SpellcastingAbility | null
  /** Null = no hard prepare cap (set manually until class tables exist). */
  max_prepared: number | null
  slots: Record<string, SpellSlotState>
  pact_slots: PactSlotState | null
  known: SheetSpell[]
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
  if (raw === 'race' || raw === 'catalog' || raw === 'custom') return raw
  if (id.startsWith('race-spell:')) return 'race'
  return undefined
}

function readRaceGrantMode(raw: unknown): 'innate' | 'spell_list' | undefined {
  if (raw === 'innate' || raw === 'spell_list') return raw
  return undefined
}

function readSpell(raw: unknown, index: number): SheetSpell {
  const row = asRecord(raw)
  const level = Math.max(0, Math.min(9, Math.floor(readNumber(row.level, 0))))
  const id = typeof row.id === 'string' ? row.id : `spell-${index}`
  const sourceKind = readSpellSourceKind(row.source_kind ?? row.sourceKind, id)
  const raceGrant = readRaceGrantMode(row.race_grant ?? row.raceGrant)
  return {
    id,
    name: typeof row.name === 'string' ? row.name : '',
    catalog_id: typeof row.catalog_id === 'string' ? row.catalog_id : null,
    level,
    prepared: row.prepared !== false,
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
    ...(sourceKind ? { source_kind: sourceKind } : {}),
    ...(raceGrant ? { race_grant: raceGrant } : {}),
  }
}

export function raceSpellId(raceSlug: string, spellId: string): string {
  return `race-spell:${raceSlug}:${spellId}`
}

export function isRaceSheetSpell(spell: SheetSpell): boolean {
  return spell.source_kind === 'race' || spell.id.startsWith('race-spell:')
}

export function stripRaceSheetSpells(known: SheetSpell[]): SheetSpell[] {
  return known.filter((spell) => !isRaceSheetSpell(spell))
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

  return {
    casting_ability: isSpellcastingAbility(spells.casting_ability)
      ? spells.casting_ability
      : null,
    max_prepared: readNullableNumber(spells.max_prepared),
    slots,
    pact_slots: pactNormalized,
    known: knownRaw.map((item, index) => readSpell(item, index)),
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
        ...(spell.source_kind ? { source_kind: spell.source_kind } : {}),
        ...(spell.race_grant ? { race_grant: spell.race_grant } : {}),
      })),
      prepared: state.known
        .filter((spell) => spell.level <= 0 || spell.prepared)
        .map((spell) => spell.id),
    },
  }
}

export function readCatalogSpellFields(data: Record<string, unknown>): Partial<SheetSpell> {
  const level = Math.max(0, Math.min(9, Math.floor(readNumber(data.level, 0))))
  return {
    level,
    casting_time: typeof data.casting_time === 'string' ? data.casting_time : '',
    range: typeof data.range === 'string' ? data.range : '',
    attack_or_save:
      typeof data.attack_or_save === 'string'
        ? data.attack_or_save
        : typeof data.save === 'string'
          ? data.save
          : '',
    damage: typeof data.damage === 'string' ? data.damage : '',
    concentration: Boolean(data.concentration),
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

/** Innate racial casts do not consume the class prepare budget. */
export function spellCountsTowardPrepareCap(spell: SheetSpell): boolean {
  if (!countsTowardPrepareLimit(spell.level)) return false
  if (!spell.prepared) return false
  if (spell.race_grant === 'innate') return false
  return true
}

export function countPreparedLeveled(known: SheetSpell[]): number {
  return known.filter((spell) => spellCountsTowardPrepareCap(spell)).length
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
  if (spell.race_grant === 'innate') return true
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
    if (spell.level <= 0 || spell.race_grant === 'innate') {
      return { ...spell, prepared: true }
    }
    if (prepared && !canPrepareSpell(known, spell, maxPrepared)) return spell
    return { ...spell, prepared }
  })
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
