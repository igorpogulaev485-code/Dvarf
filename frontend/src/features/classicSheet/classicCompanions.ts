import type { CharacterDetail } from '../../shared/api/characters'
import {
  createCompanion,
  readCompanions,
  type CompanionEntry,
  type CompanionKind,
} from '../characters/companions'
import { asRecord } from '../characters/sheetTypes'
import type { ClassicPatch } from './fromApi'

/** How many companion slots to show on classic P4 (fill Letter page). */
export const CLASSIC_COMPANION_SLOTS = 6

export const COMPANION_KIND_LABELS: Record<CompanionKind, string> = {
  beast_companion: 'Зверь-спутник',
  steel_defender: 'Стальной защитник',
  eldritch_cannon: 'Мистическая пушка',
  drake: 'Дрейк',
  primal_companion: 'Первобытный спутник',
  familiar: 'Фамилиар',
  ally: 'Напарник / призыв',
  other: 'Спутник',
}

export function classicCompanions(character: CharacterDetail): CompanionEntry[] {
  return readCompanions(asRecord(character.sheet).companions)
}

/** Pad to fixed printable slots; empty slots are blank writing cards. */
export function paddedCompanionSlots(
  companions: CompanionEntry[],
): Array<CompanionEntry | null> {
  const rows: Array<CompanionEntry | null> = [...companions]
  while (rows.length < CLASSIC_COMPANION_SLOTS) rows.push(null)
  return rows.slice(0, Math.max(CLASSIC_COMPANION_SLOTS, companions.length))
}

function isBlank(row: CompanionEntry): boolean {
  return (
    !row.name.trim() &&
    !row.notes.trim() &&
    row.stats.hp == null &&
    row.stats.ac == null &&
    row.stats.speed == null
  )
}

function writeCompanions(
  character: CharacterDetail,
  companions: CompanionEntry[],
): ClassicPatch {
  const sheet = structuredClone(asRecord(character.sheet))
  sheet.companions = companions
    .filter((row) => !isBlank(row))
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      name: row.name,
      catalog_ref: row.catalog_ref,
      source: row.source,
      stats: { ...row.stats },
      notes: row.notes,
    }))
  return { sheet }
}

function parseStat(raw: string | undefined, fallback: number | null): number | null {
  if (raw === undefined) return fallback
  if (raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export function patchCompanionField(
  character: CharacterDetail,
  index: number,
  patch: {
    name?: string
    kind?: CompanionKind
    notes?: string
    hp?: string
    ac?: string
    speed?: string
  },
): ClassicPatch {
  const current = classicCompanions(character)
  const working = [...current]
  while (working.length <= index) {
    working.push(createCompanion({ kind: 'other', name: '' }))
  }
  const entry = working[index]
  working[index] = {
    ...entry,
    name: patch.name !== undefined ? patch.name : entry.name,
    kind: patch.kind ?? entry.kind,
    notes: patch.notes !== undefined ? patch.notes : entry.notes,
    stats: {
      hp: parseStat(patch.hp, entry.stats.hp),
      ac: parseStat(patch.ac, entry.stats.ac),
      speed: parseStat(patch.speed, entry.stats.speed),
    },
  }
  return writeCompanions(character, working)
}
