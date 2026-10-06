import {
  clampSlot,
  isSpellcastingAbility,
  type SpellSlotState,
  type SpellcastingAbility,
} from '../../shared/dnd/spells'
import { asRecord, readNumber } from './sheetTypes'

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
}

export type SpellsState = {
  casting_ability: SpellcastingAbility | null
  slots: Record<string, SpellSlotState>
  pact_slots: { max: number; used: number; level: number } | null
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

function readSpell(raw: unknown, index: number): SheetSpell {
  const row = asRecord(raw)
  const level = Math.max(0, Math.min(9, Math.floor(readNumber(row.level, 0))))
  return {
    id: typeof row.id === 'string' ? row.id : `spell-${index}`,
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
  }
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
  const pactMax = readNumber(pactRaw.max, 0)
  const pact_slots =
    pactMax > 0
      ? {
          max: pactMax,
          used: Math.min(pactMax, readNumber(pactRaw.used, 0)),
          level: Math.max(1, Math.min(9, Math.floor(readNumber(pactRaw.level, 1)))),
        }
      : null

  return {
    casting_ability: isSpellcastingAbility(spells.casting_ability)
      ? spells.casting_ability
      : null,
    slots,
    pact_slots,
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
      slots,
      pact_slots: state.pact_slots,
      known: state.known.map((spell) => ({
        id: spell.id,
        name: spell.name,
        catalog_id: spell.catalog_id,
        level: spell.level,
        prepared: spell.prepared,
        notes: spell.notes,
        casting_time: spell.casting_time,
        range: spell.range,
        attack_or_save: spell.attack_or_save,
        damage: spell.damage,
        concentration: spell.concentration,
      })),
      prepared: state.known.filter((spell) => spell.prepared).map((spell) => spell.id),
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
