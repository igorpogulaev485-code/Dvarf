/** Session log + undo helpers for Play Desk consumable spends. */

export const MAX_CONSUMABLE_SPEND_LOG = 8

export type ConsumableSpendLogEntry = {
  id: string
  itemId: string
  name: string
  amount: number
  atMs: number
  /** Soft-undone (qty restored); kept in log for clarity. */
  undone: boolean
}

export type ConsumableUndoSession = {
  token: number
  itemId: string
  name: string
  amount: number
  logId: string
}

export function formatConsumableSpendToast(
  name: string,
  amount: number,
  remaining: number,
): string {
  const spent = amount === 1 ? `−1 «${name}»` : `−${amount} «${name}»`
  return remaining > 0 ? `${spent} · осталось ${remaining}` : `${spent} · кончилось`
}

export function formatConsumableUndoToast(name: string, amount: number): string {
  return amount === 1
    ? `Вернули 1 «${name}»`
    : `Вернули ${amount} «${name}»`
}

export function appendConsumableSpendLog(
  log: ConsumableSpendLogEntry[],
  entry: Omit<ConsumableSpendLogEntry, 'undone'> & { undone?: boolean },
): ConsumableSpendLogEntry[] {
  const next: ConsumableSpendLogEntry = {
    ...entry,
    undone: entry.undone ?? false,
  }
  return [next, ...log].slice(0, MAX_CONSUMABLE_SPEND_LOG)
}

export function markConsumableSpendUndone(
  log: ConsumableSpendLogEntry[],
  logId: string,
): ConsumableSpendLogEntry[] {
  return log.map((row) => (row.id === logId ? { ...row, undone: true } : row))
}

export function newConsumableSpendId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `spend-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
