/** W-01: last-seen для точки «что нового раскрыли» (localStorage, как L-03/L-06). */

function key(settingId: string, userKey: string): string {
  return `dvarf.wiki.reveal.seen.${settingId}.${userKey}`
}

export function readWikiRevealSeenAt(settingId: string, userKey: string): string | null {
  try {
    return localStorage.getItem(key(settingId, userKey))
  } catch {
    return null
  }
}

export function markWikiRevealSeen(settingId: string, userKey: string, atIso?: string): void {
  try {
    localStorage.setItem(key(settingId, userKey), atIso || new Date().toISOString())
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Первое открытие вкладки точку не показывает — только запоминает время.
 * Дальше точка, если есть revealed_at новее seenAt.
 */
export function wikiRevealHasNew(
  latestRevealedAt: string | null | undefined,
  seenAt: string | null,
): boolean {
  if (!latestRevealedAt) return false
  if (!seenAt) return false
  return new Date(latestRevealedAt).getTime() > new Date(seenAt).getTime()
}

export function latestRevealedAt(
  pages: { revealed_at?: string | null; revealed?: boolean }[],
): string | null {
  let best: string | null = null
  let bestTs = 0
  for (const p of pages) {
    const at = p.revealed_at
    if (!at) continue
    const ts = new Date(at).getTime()
    if (Number.isNaN(ts)) continue
    if (ts > bestTs) {
      bestTs = ts
      best = at
    }
  }
  return best
}

export function recentRevealedPages<T extends { revealed_at?: string | null; title: string }>(
  pages: T[],
  limit = 10,
): T[] {
  return [...pages]
    .filter((p) => Boolean(p.revealed_at))
    .sort(
      (a, b) =>
        new Date(b.revealed_at || 0).getTime() - new Date(a.revealed_at || 0).getTime(),
    )
    .slice(0, limit)
}
