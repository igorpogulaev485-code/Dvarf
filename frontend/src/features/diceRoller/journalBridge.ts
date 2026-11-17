/** Lightweight bridge: «броски» on the sheet opens the d20 panel journal. */

export type DiceJournalTab = 'mine' | 'table'

export type DiceJournalOpenRequest = {
  characterId: string
  /** «Мои» или «Стол» (общий лог партии). */
  tab?: DiceJournalTab
}

type Listener = (req: DiceJournalOpenRequest) => void

const listeners = new Set<Listener>()

export function openDiceJournal(
  characterId: string,
  tab: DiceJournalTab = 'mine',
): void {
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

/** Stroke of Luck spend — sheet registers; panel journal calls. */
export type StrokeOfLuckRequest = {
  characterId: string
  entryId: string
  text: string
}

export type StrokeOfLuckResult =
  | { ok: true; nextText: string; kind: 'check' | 'attack' }
  | { ok: false; message: string }

type StrokeOfLuckHandler = (req: StrokeOfLuckRequest) => StrokeOfLuckResult

let strokeOfLuckHandler: StrokeOfLuckHandler | null = null

export function registerStrokeOfLuckHandler(
  handler: StrokeOfLuckHandler | null,
): void {
  strokeOfLuckHandler = handler
}

export function requestStrokeOfLuck(req: StrokeOfLuckRequest): StrokeOfLuckResult {
  if (!strokeOfLuckHandler) {
    return { ok: false, message: 'Удача доступна плуту 20-го уровня' }
  }
  try {
    return strokeOfLuckHandler(req)
  } catch {
    return { ok: false, message: 'Не удалось применить Удачу' }
  }
}

/**
 * Whether the sheet currently has Stroke of Luck unlocked + a remaining use.
 * Panel hides «Удача» when false (wizard / spent until rest).
 */
type LuckAvailableListener = (characterId: string, available: boolean) => void

const luckAvailableByChar = new Map<string, boolean>()
const luckAvailableListeners = new Set<LuckAvailableListener>()

export function setStrokeOfLuckAvailable(
  characterId: string,
  available: boolean,
): void {
  const prev = luckAvailableByChar.get(characterId)
  luckAvailableByChar.set(characterId, available)
  if (prev === available) return
  luckAvailableListeners.forEach((fn) => {
    try {
      fn(characterId, available)
    } catch {
      // ignore
    }
  })
}

export function isStrokeOfLuckAvailable(characterId: string): boolean {
  return luckAvailableByChar.get(characterId) === true
}

export function subscribeStrokeOfLuckAvailable(
  listener: LuckAvailableListener,
): () => void {
  luckAvailableListeners.add(listener)
  return () => {
    luckAvailableListeners.delete(listener)
  }
}
