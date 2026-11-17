import type { RollHistoryEntry } from '../characters/playDeskUi'
import { clearDiceLog, readDiceLog, writeDiceLog } from './diceLog'
import { LOG_MAX, type DiceLogEntry } from './types'

export function mergeFlagKey(characterId: string): string {
  return `dvarf.diceRoller.merged.v1.${characterId}`
}

function legacyToastEntry(row: RollHistoryEntry): DiceLogEntry {
  const atMs = (() => {
    const t = Date.parse(row.at)
    return Number.isFinite(t) ? t : Date.now()
  })()
  const totalMatch = row.text.match(/:\s*(-?\d+)\s*\(/)
  const total = totalMatch ? Number(totalMatch[1]) : 0
  return {
    id: row.id.startsWith('roll-') ? row.id : `sheet-${row.id}`,
    at: atMs,
    expression: row.text,
    advantageMode: /преим/i.test(row.text)
      ? 'advantage'
      : /помех/i.test(row.text)
        ? 'disadvantage'
        : 'none',
    total: Number.isFinite(total) ? total : 0,
    dice: [],
    modifierTotal: 0,
    title: undefined,
    toastText: row.text,
    source: 'sheet',
    repeatable: false,
  }
}

/**
 * One-time merge of panel localStorage log + sheet `rollHistory` into the panel log.
 * Never drops either side; newest first, cap LOG_MAX.
 */
export function ensureUnifiedJournal(
  characterId: string,
  rollHistory: RollHistoryEntry[] | null | undefined,
): DiceLogEntry[] {
  if (typeof localStorage === 'undefined') {
    return readDiceLog(characterId)
  }
  let already = false
  try {
    already = localStorage.getItem(mergeFlagKey(characterId)) === '1'
  } catch {
    already = false
  }
  if (already) return readDiceLog(characterId)

  const fromPanel = readDiceLog(characterId)
  const fromSheet = (rollHistory ?? []).map(legacyToastEntry)
  const byId = new Map<string, DiceLogEntry>()
  for (const entry of [...fromPanel, ...fromSheet]) {
    if (!byId.has(entry.id)) byId.set(entry.id, entry)
  }
  const merged = [...byId.values()]
    .sort((a, b) => b.at - a.at)
    .slice(0, LOG_MAX)
  writeDiceLog(characterId, merged)
  try {
    localStorage.setItem(mergeFlagKey(characterId), '1')
  } catch {
    // ignore
  }
  return merged
}

/** Clear the unified journal (panel store + merge flag stays set). */
export function clearUnifiedJournal(characterId: string): void {
  clearDiceLog(characterId)
}

/** Project journal entries back to legacy rollHistory shape (badge / stroke of luck). */
export function journalAsRollHistory(entries: DiceLogEntry[]): RollHistoryEntry[] {
  return entries.slice(0, LOG_MAX).map((entry) => ({
    id: entry.id,
    text:
      entry.toastText?.trim() ||
      (entry.title ? `${entry.title}: ${entry.total}` : entry.expression),
    at: new Date(entry.at).toISOString(),
  }))
}
