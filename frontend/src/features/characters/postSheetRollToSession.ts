import { createSessionRoll } from '../../shared/api/lobbies'

/**
 * S-04 / T-01: если персонаж сидит за столом открытой сессии — пишем бросок с листа в ленту.
 * Сессии нет — молча no-op (бросок листа не ломаем).
 * physical_dice / «кубик на столе» — пометка в ленте (🎲).
 */
export async function postSheetRollToSession(opts: {
  openSessionId?: string | null
  characterId: string
  title: string
  total: number
  formula?: string | null
  breakdown?: string | null
  physicalDice?: boolean
  /** Цель для строки журнала (имя). */
  targetName?: string | null
  advantage?: boolean
}): Promise<void> {
  const sessionId = opts.openSessionId?.trim()
  if (!sessionId) return
  const physical = Boolean(opts.physicalDice)
  const titleParts = [opts.title]
  if (opts.targetName?.trim()) titleParts.push(`→ ${opts.targetName.trim()}`)
  if (physical) titleParts.push('кубик на столе')
  try {
    await createSessionRoll(sessionId, {
      character_id: opts.characterId,
      title: titleParts.join(' · '),
      total: opts.total,
      formula: opts.formula ?? null,
      breakdown: opts.breakdown ?? null,
      physical_dice: physical,
      category: 'sheet',
      ...(opts.advantage ? { advantage: true } : {}),
    })
  } catch {
    // Лента — побочный эффект; ошибка сети не должна ломать бросок на листе.
  }
}
