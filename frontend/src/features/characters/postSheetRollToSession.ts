import { createSessionRoll } from '../../shared/api/lobbies'

/**
 * S-04: если персонаж сидит за столом открытой сессии — пишем бросок с листа в ленту.
 * Сессии нет — молча no-op (бросок листа не ломаем).
 */
export async function postSheetRollToSession(opts: {
  openSessionId?: string | null
  characterId: string
  title: string
  total: number
  formula?: string | null
  breakdown?: string | null
}): Promise<void> {
  const sessionId = opts.openSessionId?.trim()
  if (!sessionId) return
  try {
    await createSessionRoll(sessionId, {
      character_id: opts.characterId,
      title: opts.title,
      total: opts.total,
      formula: opts.formula ?? null,
      breakdown: opts.breakdown ?? null,
      physical_dice: false,
      category: 'sheet',
    })
  } catch {
    // Лента — побочный эффект; ошибка сети не должна ломать бросок на листе.
  }
}
