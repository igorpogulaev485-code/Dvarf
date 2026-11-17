import { postSheetRollToSession } from '../characters/postSheetRollToSession'
import { newLogId, prependLogEntry, readDiceLog } from './diceLog'
import { notifyDiceLogChanged } from './journalBridge'
import { readOnlyMePref } from './onlyMePref'
import type { AdvantageMode, DiceLogEntry, DieFaceResult } from './types'

export type RecordDigitalRollInput = {
  characterId: string
  openSessionId?: string | null
  /** Override «Только себе»; default = pref for this character. */
  onlyMe?: boolean
  title: string
  expression: string
  total: number
  dice: DieFaceResult[]
  modifierTotal: number
  advantageMode?: AdvantageMode
  toastText?: string
  breakdown?: string | null
  /** Session feed category. Free panel → `roll`; sheet clicks → `sheet`. */
  category?: 'sheet' | 'roll'
  source?: 'panel' | 'sheet'
  /** When true — only personal journal (caller posts to session itself). */
  skipSession?: boolean
}

/**
 * Single client path for digital rolls: personal journal + optional session feed.
 * 02b will swap the feed path to server-side resolution here.
 */
export function recordDigitalRoll(input: RecordDigitalRollInput): DiceLogEntry {
  const advantageMode = input.advantageMode ?? 'none'
  const entry: DiceLogEntry = {
    id: newLogId(),
    at: Date.now(),
    expression: input.expression,
    advantageMode,
    total: input.total,
    dice: input.dice,
    modifierTotal: input.modifierTotal,
    title: input.title,
    toastText: input.toastText,
    source: input.source ?? 'sheet',
    repeatable: true,
  }
  const current = readDiceLog(input.characterId)
  prependLogEntry(input.characterId, entry, current)
  notifyDiceLogChanged(input.characterId)

  if (!input.skipSession) {
    const onlyMe =
      input.onlyMe != null ? input.onlyMe : readOnlyMePref(input.characterId)
    const sessionId = input.openSessionId?.trim()
    if (sessionId && !onlyMe) {
      void postSheetRollToSession({
        openSessionId: sessionId,
        characterId: input.characterId,
        title: input.title,
        total: input.total,
        formula: input.expression,
        breakdown: input.breakdown ?? input.toastText ?? null,
        advantage: advantageMode === 'advantage',
        category: input.category ?? 'sheet',
      })
    }
  }
  return entry
}

/** Gate for existing `postSheetRollToSession` call sites (attacks / table). */
export function shouldPostRollToSession(
  characterId: string | null | undefined,
  onlyMeOverride?: boolean,
): boolean {
  if (!characterId) return false
  const onlyMe =
    onlyMeOverride != null ? onlyMeOverride : readOnlyMePref(characterId)
  return !onlyMe
}
