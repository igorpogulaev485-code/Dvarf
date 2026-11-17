/**
 * Stroke of Luck against the unified dice journal (DICE-02a).
 * Finds a miss / failed check line and treats the d20 as 20 (or marks attack hit).
 */
import { applyStrokeOfLuck, strokeOfLuckKind } from '../../shared/dnd/strokeOfLuck'
import { readDiceLog, writeDiceLog } from './diceLog'
import { notifyDiceLogChanged } from './journalBridge'
import type { DiceLogEntry } from './types'

export function journalEntryLuckText(entry: DiceLogEntry): string {
  return (
    entry.toastText?.trim() ||
    (entry.title ? `${entry.title}: ${entry.total}` : entry.expression)
  )
}

export function entryAllowsStrokeOfLuck(entry: DiceLogEntry): boolean {
  return strokeOfLuckKind(journalEntryLuckText(entry)) != null
}

/** Apply luck to one journal entry: toast text + d20 faces + total. */
export function applyStrokeOfLuckToEntry(entry: DiceLogEntry): DiceLogEntry | null {
  const text = journalEntryLuckText(entry)
  const nextText = applyStrokeOfLuck(text)
  if (!nextText) return null
  const kind = strokeOfLuckKind(text)
  const nextDice = entry.dice.map((die) => {
    if (die.sides !== 20 || die.dropped) return die
    if (kind === 'check' && die.value !== 20) {
      return { ...die, value: 20, nat: '20' as const }
    }
    return die
  })
  let nextTotal = entry.total
  if (kind === 'check') {
    const kept = nextDice.find((d) => d.sides === 20 && !d.dropped)
    if (kept) nextTotal = kept.value + entry.modifierTotal
  }
  return {
    ...entry,
    toastText: nextText,
    expression: entry.title ? entry.expression : nextText,
    dice: nextDice,
    total: nextTotal,
  }
}

export function applyStrokeOfLuckInJournal(
  characterId: string,
  entryId: string,
): { ok: true; entry: DiceLogEntry } | { ok: false; message: string } {
  const current = readDiceLog(characterId)
  const idx = current.findIndex((row) => row.id === entryId)
  if (idx < 0) return { ok: false, message: 'Запись не найдена в журнале' }
  const nextEntry = applyStrokeOfLuckToEntry(current[idx]!)
  if (!nextEntry) {
    return { ok: false, message: 'Этот бросок уже нельзя заменить Удачей' }
  }
  const next = current.slice()
  next[idx] = nextEntry
  writeDiceLog(characterId, next)
  notifyDiceLogChanged(characterId)
  return { ok: true, entry: nextEntry }
}
