/** Lightweight bridge: «броски» on the sheet opens the d20 panel journal. */

export type DiceJournalOpenRequest = {
  characterId: string
  /** Personal journal tab (02b will add «Стол» beside it). */
  tab?: 'mine'
}

type Listener = (req: DiceJournalOpenRequest) => void

const listeners = new Set<Listener>()

export function openDiceJournal(characterId: string, tab: 'mine' = 'mine'): void {
  const req: DiceJournalOpenRequest = { characterId, tab }
  listeners.forEach((fn) => {
    try {
      fn(req)
    } catch {
      // ignore listener errors
    }
  })
}

export function subscribeDiceJournalOpen(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

type LogListener = (characterId: string) => void
const logListeners = new Set<LogListener>()

/** Notify open panels that the shared journal changed (sheet roll prepended). */
export function notifyDiceLogChanged(characterId: string): void {
  logListeners.forEach((fn) => {
    try {
      fn(characterId)
    } catch {
      // ignore
    }
  })
}

export function subscribeDiceLogChanged(listener: LogListener): () => void {
  logListeners.add(listener)
  return () => {
    logListeners.delete(listener)
  }
}

type ClearedListener = (characterId: string) => void
const clearedListeners = new Set<ClearedListener>()

export function notifyDiceLogCleared(characterId: string): void {
  clearedListeners.forEach((fn) => {
    try {
      fn(characterId)
    } catch {
      // ignore
    }
  })
}

export function subscribeDiceLogCleared(listener: ClearedListener): () => void {
  clearedListeners.add(listener)
  return () => {
    clearedListeners.delete(listener)
  }
}
