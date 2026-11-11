/** Как часто клиент шлёт текст `ping`, пока сокет открыт. */
export const WS_PING_INTERVAL_MS = 20_000

/** Сколько ping подряд без `pong` терпим. На следующем тике сокет закрываем. */
export const WS_MISSED_PONGS_LIMIT = 2

/** Сколько сокет может быть не открыт, прежде чем начать рефетч. */
export const WS_OFFLINE_GRACE_MS = 10_000

/** Как часто звать onReconnect, пока сокет так и не открыт. */
export const WS_OFFLINE_POLL_MS = 15_000

export function nextPingState(unanswered: number): { unanswered: number; close: boolean } {
  if (unanswered >= WS_MISSED_PONGS_LIMIT) {
    return { unanswered, close: true }
  }
  return { unanswered: unanswered + 1, close: false }
}

export function offlinePollDue(offlineForMs: number): boolean {
  return offlineForMs >= WS_OFFLINE_GRACE_MS
}
