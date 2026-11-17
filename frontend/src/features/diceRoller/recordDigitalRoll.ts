import { postSheetRollToSession } from '../characters/postSheetRollToSession'
import type { SessionEvent } from '../../shared/api/lobbies'
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
  /** Клиентский итог — только вне сессии / «Только себе». За столом игнор. */
  total?: number
  dice?: DieFaceResult[]
  modifierTotal?: number
  advantageMode?: AdvantageMode
  toastText?: string
  breakdown?: string | null
  /** Session feed category. Free panel → `roll`; sheet clicks → `sheet`. */
  category?: 'sheet' | 'roll'
  source?: 'panel' | 'sheet'
  /** When true — only personal journal (caller posts to session itself). */
  skipSession?: boolean
  masterHidden?: boolean
  isHidden?: boolean
  /** Rider die captions for session digital rolls. */
  dieLabels?: Array<{ sides: number; label: string }> | null
}

export type RecordDigitalRollOk = {
  ok: true
  entry: DiceLogEntry
  event?: SessionEvent
}

export type RecordDigitalRollErr = {
  ok: false
  error: string
}

function facesFromEvent(event: SessionEvent): DieFaceResult[] {
  const raw = event.payload?.dice
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const sides = Number(row.sides)
      const value = Number(row.value)
      if (!Number.isFinite(sides) || !Number.isFinite(value)) return null
      const nat = row.nat === '20' || row.nat === '1' ? row.nat : undefined
      const label =
        typeof row.label === 'string' && row.label.trim() ? row.label.trim() : undefined
      return {
        sides,
        value,
        dropped: Boolean(row.dropped),
        ...(nat ? { nat } : {}),
        ...(label ? { label } : {}),
      } satisfies DieFaceResult
    })
    .filter((x): x is DieFaceResult => x != null)
}

function modeFromEvent(event: SessionEvent, fallback: AdvantageMode): AdvantageMode {
  const raw = event.payload?.advantage_mode
  if (raw === 'advantage' || raw === 'disadvantage' || raw === 'none') return raw
  if (event.payload?.advantage) return 'advantage'
  return fallback
}

function entryFromEvent(
  event: SessionEvent,
  input: RecordDigitalRollInput,
): DiceLogEntry {
  const dice = facesFromEvent(event)
  const modifierTotal =
    typeof event.payload?.modifier_total === 'number'
      ? event.payload.modifier_total
      : input.modifierTotal ?? 0
  const expression = event.formula || input.expression
  const total = event.total ?? 0
  const title = event.title || input.title
  return {
    id: event.id || newLogId(),
    at: Date.parse(event.created_at) || Date.now(),
    expression,
    advantageMode: modeFromEvent(event, input.advantageMode ?? 'none'),
    total,
    dice,
    modifierTotal,
    title,
    toastText: input.toastText ?? `${title}: ${total} (${expression})`,
    source: input.source ?? 'sheet',
    repeatable: true,
  }
}

function entryFromClient(input: RecordDigitalRollInput): DiceLogEntry {
  const advantageMode = input.advantageMode ?? 'none'
  return {
    id: newLogId(),
    at: Date.now(),
    expression: input.expression,
    advantageMode,
    total: input.total ?? 0,
    dice: input.dice ?? [],
    modifierTotal: input.modifierTotal ?? 0,
    title: input.title,
    toastText: input.toastText,
    source: input.source ?? 'sheet',
    repeatable: true,
  }
}

/**
 * Единый путь цифрового броска.
 * За открытым столом (и не «Только себе») — сервер считает итог; в журнал
 * пишем только после ответа. Вне сессии — клиентский fairRandom как в 02a.
 */
export async function recordDigitalRoll(
  input: RecordDigitalRollInput,
): Promise<RecordDigitalRollOk | RecordDigitalRollErr> {
  const advantageMode = input.advantageMode ?? 'none'
  const onlyMe =
    input.onlyMe != null ? input.onlyMe : readOnlyMePref(input.characterId)
  const sessionId = input.openSessionId?.trim()
  const postToSession = Boolean(sessionId && !onlyMe && !input.skipSession)

  if (postToSession && sessionId) {
    const posted = await postSheetRollToSession({
      openSessionId: sessionId,
      characterId: input.characterId,
      title: input.title,
      formula: input.expression,
      breakdown: input.breakdown ?? input.toastText ?? null,
      advantage: advantageMode === 'advantage',
      mode: advantageMode,
      category: input.category ?? 'sheet',
      masterHidden: input.masterHidden,
      isHidden: input.isHidden,
      dieLabels: input.dieLabels,
      swallowErrors: false,
    })
    if (!posted || !posted.ok) {
      return {
        ok: false,
        error:
          posted && !posted.ok
            ? posted.error
            : 'Не удалось бросить — проверьте связь',
      }
    }
    const entry = entryFromEvent(posted.event, input)
    const current = readDiceLog(input.characterId)
    prependLogEntry(input.characterId, entry, current)
    notifyDiceLogChanged(input.characterId)
    return { ok: true, entry, event: posted.event }
  }

  if (input.total == null) {
    return { ok: false, error: 'Нет результата броска' }
  }
  const entry = entryFromClient(input)
  const current = readDiceLog(input.characterId)
  prependLogEntry(input.characterId, entry, current)
  notifyDiceLogChanged(input.characterId)
  return { ok: true, entry }
}

/**
 * Синхронная запись только в личный журнал (уже посчитанный итог).
 * Для атак с отдельным постом в ленту / offline.
 */
export function recordDigitalRollLocal(input: RecordDigitalRollInput): DiceLogEntry {
  const entry = entryFromClient({
    ...input,
    total: input.total ?? 0,
    dice: input.dice ?? [],
  })
  const current = readDiceLog(input.characterId)
  prependLogEntry(input.characterId, entry, current)
  notifyDiceLogChanged(input.characterId)
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
