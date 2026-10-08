/**
 * Sync companions / charge resources / grant spells / bonus slots from active gear.
 * Rows are keyed `gear-*` so unequipping cleanly removes them without touching manual data.
 */

import type { AggregatedGearEffects } from './gearEffects'
import {
  createCompanion,
  type CompanionEntry,
  type CompanionKind,
} from './companions'
import { createResource } from './play'
import type { SheetResource } from '../../shared/dnd/rest'
import type { SpellsState, SheetSpell } from './spells'
import { clampSlot } from '../../shared/dnd/spells'

const GEAR_RES_PREFIX = 'gear-res:'
const GEAR_COMPANION_PREFIX = 'gear-companion:'
const GEAR_SPELL_PREFIX = 'gear-spell:'

function asCompanionKind(value: string): CompanionKind {
  if (
    value === 'beast_companion' ||
    value === 'steel_defender' ||
    value === 'eldritch_cannon' ||
    value === 'drake' ||
    value === 'primal_companion' ||
    value === 'familiar' ||
    value === 'other'
  ) {
    return value
  }
  if (value === 'familiar' || /familiar|фамилиар/i.test(value)) return 'familiar'
  return 'other'
}

export function isGearResourceId(id: string): boolean {
  return id.startsWith(GEAR_RES_PREFIX)
}

export function isGearCompanionId(id: string): boolean {
  return id.startsWith(GEAR_COMPANION_PREFIX)
}

export function isGearSpellId(id: string): boolean {
  return id.startsWith(GEAR_SPELL_PREFIX)
}

export function syncGearResources(
  resources: SheetResource[],
  gear: AggregatedGearEffects,
): SheetResource[] {
  const previous = new Map(
    resources.filter((row) => isGearResourceId(row.id)).map((row) => [row.id, row]),
  )
  const without = resources.filter((row) => !isGearResourceId(row.id))
  const nextGear = gear.resources.map((spec) => {
    const prev = previous.get(spec.key)
    return createResource({
      id: spec.key,
      name: spec.name,
      max: spec.max,
      used: prev ? Math.min(prev.used, spec.max) : 0,
      reset: spec.reset,
    })
  })
  return [...without, ...nextGear]
}

export function syncGearCompanions(
  companions: CompanionEntry[],
  gear: AggregatedGearEffects,
): CompanionEntry[] {
  const previous = new Map(
    companions.filter((row) => isGearCompanionId(row.id)).map((row) => [row.id, row]),
  )
  const without = companions.filter((row) => !isGearCompanionId(row.id))
  const nextGear = gear.companions.map((spec) => {
    const prev = previous.get(spec.key)
    return createCompanion({
      id: spec.key,
      kind: asCompanionKind(spec.kind),
      name: prev?.name?.trim() ? prev.name : spec.nameRu,
      catalog_ref: prev?.catalog_ref ?? null,
      source: null,
      stats: prev?.stats ?? { hp: null, ac: null, speed: null },
      notes: prev?.notes?.trim()
        ? prev.notes
        : `Из предмета (снаряжение)`,
    })
  })
  return [...without, ...nextGear]
}

/** Placeholder spell rows from grant_spell — catalog hydrate fills name/level later if needed. */
export function syncGearGrantSpells(
  spells: SpellsState,
  gear: AggregatedGearEffects,
): SpellsState {
  const previous = new Map(
    spells.known.filter((row) => isGearSpellId(row.id)).map((row) => [row.id, row]),
  )
  const without = spells.known.filter((row) => !isGearSpellId(row.id))
  const nextRows: SheetSpell[] = gear.grantSpells.map((spec) => {
    const prev = previous.get(spec.key)
    const grantCast =
      spec.uses != null
        ? {
            max: spec.uses,
            used: prev?.grant_cast
              ? Math.min(prev.grant_cast.used, spec.uses)
              : 0,
            reset: spec.reset,
            label: spec.itemName,
          }
        : prev?.grant_cast
    return {
      id: spec.key,
      name: prev?.name?.trim() ? prev.name : spec.slug.replace(/_/g, ' '),
      catalog_id: prev?.catalog_id ?? null,
      level: prev?.level ?? 0,
      prepared: true,
      notes: prev?.notes || `Предмет: ${spec.itemName}`,
      casting_time: prev?.casting_time ?? '',
      range: prev?.range ?? '',
      attack_or_save: prev?.attack_or_save ?? '',
      damage: prev?.damage ?? '',
      concentration: prev?.concentration ?? false,
      source_kind: 'feature' as const,
      prepared_locked: true,
      prepare_source_label: spec.itemName,
      ...(grantCast ? { grant_cast: grantCast } : {}),
    }
  })

  let slots = { ...spells.slots }
  // Apply spell_slots deltas relative to base = current max − previously applied gear delta.
  const prevDeltas = readPrevDeltas(spells)
  const nextDeltas = { ...gear.spellSlotDeltas }
  for (let level = 1; level <= 9; level += 1) {
    const key = String(level)
    const cur = clampSlot(slots[key] ?? { max: 0, used: 0 })
    const baseMax = Math.max(0, cur.max - (prevDeltas[level] ?? 0))
    const delta = nextDeltas[level] ?? 0
    const max = Math.max(0, baseMax + delta)
    slots[key] = clampSlot({ max, used: Math.min(cur.used, max) })
  }
  const nextSpells = {
    ...spells,
    known: [...without, ...nextRows],
    slots,
  }
  return writePrevDeltas(nextSpells, nextDeltas)
}

function readPrevDeltas(spells: SpellsState): Record<number, number> {
  const raw = spells.gear_slot_deltas
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<number, number> = {}
  for (const [k, v] of Object.entries(raw)) {
    const level = Number(k)
    if (!Number.isFinite(level) || typeof v !== 'number') continue
    out[level] = Math.floor(v)
  }
  return out
}

function writePrevDeltas(
  spells: SpellsState,
  deltas: Record<number, number>,
): SpellsState {
  const serial: Record<string, number> = {}
  for (const [level, value] of Object.entries(deltas)) {
    if (!value) continue
    serial[String(level)] = value
  }
  const next: SpellsState = { ...spells }
  if (Object.keys(serial).length === 0) {
    delete next.gear_slot_deltas
  } else {
    next.gear_slot_deltas = serial
  }
  return next
}
