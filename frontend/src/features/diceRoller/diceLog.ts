import { LOG_MAX, type DiceLogEntry } from './types'

export function diceLogStorageKey(characterId: string): string {
  return `dvarf.diceRoller.v1.${characterId}`
}

export function readDiceLog(characterId: string): DiceLogEntry[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(diceLogStorageKey(characterId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isLogEntry).slice(0, LOG_MAX)
  } catch {
    return []
  }
}

export function writeDiceLog(characterId: string, entries: DiceLogEntry[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      diceLogStorageKey(characterId),
      JSON.stringify(entries.slice(0, LOG_MAX)),
    )
  } catch {
    // Quota / private mode — ignore; UI still shows in-memory list.
  }
}

export function clearDiceLog(characterId: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(diceLogStorageKey(characterId))
  } catch {
    // ignore
  }
}

export function prependLogEntry(
  characterId: string,
  entry: DiceLogEntry,
  current: DiceLogEntry[],
): DiceLogEntry[] {
  const next = [entry, ...current].slice(0, LOG_MAX)
  writeDiceLog(characterId, next)
  return next
}

function isLogEntry(value: unknown): value is DiceLogEntry {
  if (!value || typeof value !== 'object') return false
  const e = value as DiceLogEntry
  if (
    typeof e.id !== 'string' ||
    typeof e.at !== 'number' ||
    typeof e.expression !== 'string' ||
    typeof e.total !== 'number' ||
    !Array.isArray(e.dice)
  ) {
    return false
  }
  return true
}

export function newLogId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const buf = new Uint32Array(2)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(buf)
  }
  return `roll-${Date.now()}-${buf[0]}-${buf[1]}`
}
