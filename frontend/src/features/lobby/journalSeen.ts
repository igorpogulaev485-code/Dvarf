/** L-06: last-seen метка для точки «новое» на вкладке Дневник. */

function key(lobbyId: string, userKey: string): string {
  return `dvarf.journal.seen.${lobbyId}.${userKey}`
}

export function readJournalSeenAt(lobbyId: string, userKey: string): string | null {
  try {
    return localStorage.getItem(key(lobbyId, userKey))
  } catch {
    return null
  }
}

export function markJournalSeen(lobbyId: string, userKey: string, atIso?: string): void {
  try {
    localStorage.setItem(key(lobbyId, userKey), atIso || new Date().toISOString())
  } catch {
    // ignore quota / private mode
  }
}

export function journalHasNew(
  lastPublishedAt: string | null | undefined,
  seenAt: string | null,
): boolean {
  if (!lastPublishedAt) return false
  if (!seenAt) return true
  return new Date(lastPublishedAt).getTime() > new Date(seenAt).getTime()
}
