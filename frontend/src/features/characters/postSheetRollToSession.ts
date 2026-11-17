import {
  createSessionDigitalRoll,
  createSessionRoll,
  type SessionEvent,
} from '../../shared/api/lobbies'

export type PostSheetRollResult = {
  ok: true
  event: SessionEvent
  /** Серверный цифровой бросок (не живой куб). */
  digital: boolean
} | {
  ok: false
  error: string
}

/**
 * Запись броска в ленту открытой сессии.
 * - Живой куб (`physicalDice`) — старый POST /rolls, total с клиента.
 * - Цифровой — POST /rolls/digital, итог считает сервер; total с клиента игнор.
 */
export async function postSheetRollToSession(opts: {
  openSessionId?: string | null
  characterId?: string | null
  title: string
  /** Только для живого куба — сервер доверяет числу. */
  total?: number
  formula?: string | null
  breakdown?: string | null
  physicalDice?: boolean
  /** Цель для строки журнала (имя). */
  targetName?: string | null
  advantage?: boolean
  mode?: 'none' | 'advantage' | 'disadvantage'
  /** Default `sheet`; free panel may use `roll`. */
  category?: 'sheet' | 'roll' | string | null
  masterHidden?: boolean
  isHidden?: boolean
  /** Rider die captions for digital rolls (mark d4 / Bless). */
  dieLabels?: Array<{ sides: number; label: string }> | null
  /**
   * Если true — ошибка сети глотается (старое поведение атак/диалогов).
   * Для единого цифрового пути лучше false, чтобы не писать ложный журнал.
   */
  swallowErrors?: boolean
}): Promise<PostSheetRollResult | void> {
  const sessionId = opts.openSessionId?.trim()
  if (!sessionId) return
  const physical = Boolean(opts.physicalDice)
  const titleParts = [opts.title]
  if (opts.targetName?.trim()) titleParts.push(`→ ${opts.targetName.trim()}`)
  if (physical) titleParts.push('кубик на столе')
  const title = titleParts.join(' · ')
  const characterId = opts.characterId?.trim() || null

  try {
    if (physical) {
      if (opts.total == null) {
        return { ok: false, error: 'Нет числа броска' }
      }
      const event = await createSessionRoll(sessionId, {
        character_id: characterId,
        title,
        total: opts.total,
        formula: opts.formula ?? null,
        breakdown: opts.breakdown ?? null,
        physical_dice: true,
        category: opts.category ?? 'sheet',
        ...(opts.advantage ? { advantage: true } : {}),
        ...(opts.isHidden ? { is_hidden: true } : {}),
        ...(opts.masterHidden ? { is_master_roll: true } : {}),
      })
      return { ok: true, event, digital: false }
    }

    const formula = (opts.formula ?? '').trim()
    if (!formula) {
      return { ok: false, error: 'Нет формулы броска' }
    }
    const mode =
      opts.mode ??
      (opts.advantage ? 'advantage' : 'none')
    const event = await createSessionDigitalRoll(sessionId, {
      character_id: characterId,
      title,
      formula,
      mode,
      advantage: mode === 'advantage',
      category: opts.category ?? 'sheet',
      ...(opts.masterHidden ? { master_hidden: true } : {}),
      ...(opts.isHidden ? { is_hidden: true } : {}),
      ...(opts.dieLabels?.length ? { die_labels: opts.dieLabels } : {}),
    })
    return { ok: true, event, digital: true }
  } catch (err) {
    if (opts.swallowErrors !== false && opts.swallowErrors !== true) {
      // default: for digital we surface; for physical legacy swallow
    }
    const swallow = opts.swallowErrors ?? physical
    if (swallow) return
    const message =
      err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Не удалось отправить бросок'
    return { ok: false, error: message || 'Не удалось отправить бросок' }
  }
}
