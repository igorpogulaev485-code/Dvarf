/** T5: дневник → активная сессия за столом. */

import type { JournalEntry, SessionSummary } from '../../shared/api/lobbies'

/** Открытая сессия лобби с тем же сеттингом, что у поста. */
export function resolveOpenSessionForEntry(
  entry: JournalEntry,
  sessions: SessionSummary[],
): SessionSummary | null {
  if (!entry.setting_id && !entry.page_id && !entry.from_session_id) {
    return null
  }
  const open = sessions.filter((s) => !s.closed_at)
  if (open.length === 0) return null

  if (entry.from_session_id) {
    const from = open.find((s) => s.id === entry.from_session_id)
    if (from) return from
  }

  if (entry.setting_id) {
    const matches = open.filter((s) => s.setting_id === entry.setting_id)
    if (matches.length === 0) return null
    return [...matches].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )[0]
  }

  // session_summary без setting_id — всё равно можно прыгнуть на from_session, если открыта
  return null
}

export function tableHrefForEntry(
  entry: JournalEntry,
  session: SessionSummary,
): string {
  if (entry.page_id) {
    return `/sessions/${session.id}?page=${entry.page_id}`
  }
  return `/sessions/${session.id}`
}

export function canOpenAtTable(entry: JournalEntry): boolean {
  return Boolean(
    entry.page_id ||
      entry.entry_type === 'setting_link' ||
      entry.entry_type === 'quest_status' ||
      entry.entry_type === 'session_summary',
  )
}
