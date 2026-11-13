/**
 * T-01: базовая экономика хода (действие / бонусное / реакция / взаимодействие).
 * Хранится в sheet.combat.turn_economy через PlayState.
 */

import { parseSpellCastingTime, type SpellCastingTimeUnit } from './spellCatalog'

export type TurnEconomyMarkKey =
  | 'action'
  | 'bonus'
  | 'reaction'
  | 'object_interaction'

export type ActionSpentAs = 'attack' | 'cast' | 'feature' | 'search' | null

export type TurnCastTiming = 'action' | 'bonus' | 'reaction'

export type TurnCastRecord = {
  id: string
  name: string
  level: number
  timing: TurnCastTiming
  /** T-02: метамагия «Ускоренное». */
  quickened?: boolean
}

export type TurnEconomyState = {
  action: boolean
  bonus: boolean
  reaction: boolean
  objectInteraction: boolean
  /** Неиспользованные доп. действия (Всплеск — T-02). */
  extraActions: number
  /** Чем потратили основное действие в этот ход. */
  actionSpentAs: ActionSpentAs
  castsThisTurn: TurnCastRecord[]
}

export type TurnSpendBlock = {
  ok: false
  reason: string
  mark: TurnEconomyMarkKey
}

export type TurnSpendOk = { ok: true }

export type TurnSpendResult = TurnSpendOk | TurnSpendBlock

export function emptyTurnEconomy(): TurnEconomyState {
  return {
    action: false,
    bonus: false,
    reaction: false,
    objectInteraction: false,
    extraActions: 0,
    actionSpentAs: null,
    castsThisTurn: [],
  }
}

/** Сброс в начале своего хода / «Новый ход». */
export function resetTurnEconomy(_prev?: TurnEconomyState | null): TurnEconomyState {
  return emptyTurnEconomy()
}

export function readTurnEconomy(raw: unknown): TurnEconomyState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyTurnEconomy()
  }
  const row = raw as Record<string, unknown>
  const castsRaw = Array.isArray(row.casts_this_turn)
    ? row.casts_this_turn
    : Array.isArray(row.castsThisTurn)
      ? row.castsThisTurn
      : []
  const castsThisTurn: TurnCastRecord[] = []
  for (const item of castsRaw) {
    if (!item || typeof item !== 'object') continue
    const c = item as Record<string, unknown>
    const timing =
      c.timing === 'bonus' || c.timing === 'reaction' || c.timing === 'action'
        ? c.timing
        : null
    if (!timing) continue
    const name = typeof c.name === 'string' ? c.name : ''
    const id =
      typeof c.id === 'string' && c.id.trim()
        ? c.id
        : `cast-${castsThisTurn.length}`
    const level =
      typeof c.level === 'number' && Number.isFinite(c.level)
        ? Math.max(0, Math.floor(c.level))
        : 0
    castsThisTurn.push({
      id,
      name,
      level,
      timing,
      ...(c.quickened === true ? { quickened: true } : {}),
    })
  }
  const spent = row.action_spent_as ?? row.actionSpentAs
  const actionSpentAs: ActionSpentAs =
    spent === 'attack' ||
    spent === 'cast' ||
    spent === 'feature' ||
    spent === 'search'
      ? spent
      : null
  const extraRaw = row.extra_actions ?? row.extraActions
  const extraActions =
    typeof extraRaw === 'number' && Number.isFinite(extraRaw)
      ? Math.max(0, Math.floor(extraRaw))
      : 0
  return {
    action: Boolean(row.action),
    bonus: Boolean(row.bonus),
    reaction: Boolean(row.reaction),
    objectInteraction: Boolean(
      row.object_interaction ?? row.objectInteraction,
    ),
    extraActions,
    actionSpentAs,
    castsThisTurn,
  }
}

export function serializeTurnEconomy(
  state: TurnEconomyState,
): Record<string, unknown> {
  return {
    action: Boolean(state.action),
    bonus: Boolean(state.bonus),
    reaction: Boolean(state.reaction),
    object_interaction: Boolean(state.objectInteraction),
    extra_actions: Math.max(0, Math.floor(state.extraActions || 0)),
    action_spent_as: state.actionSpentAs,
    casts_this_turn: state.castsThisTurn.map((c) => ({
      id: c.id,
      name: c.name,
      level: c.level,
      timing: c.timing,
      ...(c.quickened ? { quickened: true } : {}),
    })),
  }
}

export function markIsSpent(
  state: TurnEconomyState,
  mark: TurnEconomyMarkKey,
): boolean {
  if (mark === 'action') return state.action
  if (mark === 'bonus') return state.bonus
  if (mark === 'reaction') return state.reaction
  return state.objectInteraction
}

export function toggleTurnMark(
  state: TurnEconomyState,
  mark: TurnEconomyMarkKey,
): TurnEconomyState {
  const next = { ...state, castsThisTurn: [...state.castsThisTurn] }
  if (mark === 'action') {
    next.action = !state.action
    if (!next.action) next.actionSpentAs = null
  } else if (mark === 'bonus') {
    next.bonus = !state.bonus
  } else if (mark === 'reaction') {
    next.reaction = !state.reaction
  } else {
    next.objectInteraction = !state.objectInteraction
  }
  return next
}

export function setTurnMark(
  state: TurnEconomyState,
  mark: TurnEconomyMarkKey,
  spent: boolean,
): TurnEconomyState {
  const next = { ...state, castsThisTurn: [...state.castsThisTurn] }
  if (mark === 'action') {
    next.action = spent
    if (!spent) next.actionSpentAs = null
  } else if (mark === 'bonus') {
    next.bonus = spent
  } else if (mark === 'reaction') {
    next.reaction = spent
  } else {
    next.objectInteraction = spent
  }
  return next
}

const SPENT_HINT =
  'уже потрачено — сними отметку вручную'

function block(mark: TurnEconomyMarkKey, reason = SPENT_HINT): TurnSpendBlock {
  return { ok: false, reason, mark }
}

/**
 * Атака: первая в ход тратит действие; следующие атаки, если действие
 * потрачено атакой, не блокируются (Дополнительная атака).
 */
export function canSpendAttack(state: TurnEconomyState): TurnSpendResult {
  if (!state.action) return { ok: true }
  if (state.actionSpentAs === 'attack') return { ok: true }
  if (state.extraActions > 0) return { ok: true }
  return block('action')
}

export function applyAttackSpend(state: TurnEconomyState): TurnEconomyState {
  if (!state.action) {
    return { ...state, action: true, actionSpentAs: 'attack' }
  }
  if (state.actionSpentAs === 'attack') {
    return state
  }
  if (state.extraActions > 0) {
    return {
      ...state,
      extraActions: state.extraActions - 1,
      actionSpentAs: state.actionSpentAs ?? 'attack',
    }
  }
  return state
}

/**
 * Время каста → отметка. Ритуал/минута/час → null (не тратит боевую отметку).
 */
export function castingTimeToEconomyMark(
  raw: unknown,
): TurnCastTiming | null {
  if (raw == null) return 'action'
  const text =
    typeof raw === 'string'
      ? raw
      : typeof raw === 'object' && raw && 'condition' in (raw as object)
        ? String((raw as { condition?: string }).condition ?? '')
        : ''
  const lower = text.toLowerCase()
  if (/бонус/.test(lower)) return 'bonus'
  if (/реакц/.test(lower)) return 'reaction'
  if (/минut|минут|час|hour|ритуал|ritual/i.test(lower) && !/действ/.test(lower)) {
    const parsedEarly = parseSpellCastingTime(raw)
    if (parsedEarly.unit === 'minute' || parsedEarly.unit === 'hour') return null
  }
  const parsed = parseSpellCastingTime(raw)
  if (parsed.unit === 'bonus') return 'bonus'
  if (parsed.unit === 'reaction') return 'reaction'
  if (parsed.unit === 'action') return 'action'
  if (parsed.unit === 'minute' || parsed.unit === 'hour') return null
  if (/действ/.test(lower)) return 'action'
  if (parsed.unit === 'special') {
    if (/бонус/.test(lower)) return 'bonus'
    if (/реакц/.test(lower)) return 'reaction'
    if (/действ/.test(lower)) return 'action'
    return null
  }
  return 'action'
}

export function canSpendCast(
  state: TurnEconomyState,
  timing: TurnCastTiming | null,
): TurnSpendResult {
  if (timing == null) return { ok: true }
  if (timing === 'bonus') {
    return state.bonus ? block('bonus') : { ok: true }
  }
  if (timing === 'reaction') {
    return state.reaction ? block('reaction') : { ok: true }
  }
  if (!state.action) return { ok: true }
  if (state.extraActions > 0) return { ok: true }
  return block('action')
}

/**
 * Э6: правило бонусного заклинания (PHB 2014).
 * Реакция не входит. Заговор = уровень 0.
 * — если бонусным уже было заклинание → действием только заговор;
 * — если действием уже было заклинание → бонусно только заговор.
 * Второе заклинание действием через доп. действие (Всплеск) — ок, если бонусного каста не было.
 */
export const BONUS_SPELL_RULE_ACTION_HINT =
  'В этот ход бонусным уже было заклинание — действием можно только заговор'

export const BONUS_SPELL_RULE_BONUS_HINT =
  'После заклинания действием бонусно можно только заговор'

export function canCastByBonusSpellRule(
  state: TurnEconomyState,
  input: { timing: TurnCastTiming | null; level: number },
): TurnSpendResult {
  const timing = input.timing
  if (timing == null || timing === 'reaction') return { ok: true }
  const prior = state.castsThisTurn.filter((c) => c.timing !== 'reaction')
  const hadBonus = prior.some((c) => c.timing === 'bonus')
  const hadAction = prior.some((c) => c.timing === 'action')
  const isCantrip = Math.max(0, Math.floor(input.level)) <= 0
  if (timing === 'bonus') {
    if (hadAction && !isCantrip) {
      return { ok: false, reason: BONUS_SPELL_RULE_BONUS_HINT, mark: 'bonus' }
    }
    return { ok: true }
  }
  // action
  if (hadBonus && !isCantrip) {
    return { ok: false, reason: BONUS_SPELL_RULE_ACTION_HINT, mark: 'action' }
  }
  return { ok: true }
}

/** Отметка + правило двух заклинаний (для каста и режима «только списать»). */
export function canCastSpell(
  state: TurnEconomyState,
  input: { timing: TurnCastTiming | null; level: number },
): TurnSpendResult {
  const markGate = canSpendCast(state, input.timing)
  if (!markGate.ok) return markGate
  return canCastByBonusSpellRule(state, input)
}

/** Э7: «Всплеск действий» — +1 доп. действие, само умение отметку не тратит. */
export function applyActionSurge(state: TurnEconomyState): TurnEconomyState {
  return {
    ...state,
    extraActions: state.extraActions + 1,
  }
}

export type HideSpendTiming = 'action' | 'bonus'

/**
 * Э9: «Засада» — действие; при «Хитром действии» и свободном бонусном — бонусное;
 * если бонусное занято, а действие свободно — действием.
 */
export function resolveHideTiming(
  state: TurnEconomyState,
  hasCunningAction: boolean,
): TurnSpendResult & { timing?: HideSpendTiming } {
  if (hasCunningAction && !state.bonus) {
    return { ok: true, timing: 'bonus' }
  }
  if (!state.action || state.extraActions > 0) {
    return { ok: true, timing: 'action' }
  }
  return block('action')
}

export function canSpendSearch(state: TurnEconomyState): TurnSpendResult {
  if (!state.action || state.extraActions > 0) return { ok: true }
  return block('action')
}

export function applySearchSpend(state: TurnEconomyState): TurnEconomyState {
  if (!state.action) {
    return { ...state, action: true, actionSpentAs: 'search' }
  }
  if (state.extraActions > 0) {
    return { ...state, extraActions: state.extraActions - 1 }
  }
  return state
}

export function applyHideSpend(
  state: TurnEconomyState,
  timing: HideSpendTiming,
): TurnEconomyState {
  if (timing === 'bonus') {
    return { ...state, bonus: true }
  }
  return applySearchSpend(state)
}

export function applyCastSpend(
  state: TurnEconomyState,
  input: {
    timing: TurnCastTiming | null
    id?: string
    name: string
    level: number
    quickened?: boolean
  },
): TurnEconomyState {
  const timing = input.timing
  if (timing == null) return state
  const next: TurnEconomyState = {
    ...state,
    castsThisTurn: [
      ...state.castsThisTurn,
      {
        id:
          input.id ??
          (typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `cast-${Date.now()}`),
        name: input.name,
        level: Math.max(0, Math.floor(input.level)),
        timing,
        ...(input.quickened ? { quickened: true } : {}),
      },
    ],
  }
  if (timing === 'bonus') {
    next.bonus = true
    return next
  }
  if (timing === 'reaction') {
    next.reaction = true
    return next
  }
  if (!next.action) {
    next.action = true
    next.actionSpentAs = 'cast'
    return next
  }
  if (next.extraActions > 0) {
    next.extraActions -= 1
    return next
  }
  return next
}

/**
 * Умение: из текста «действием / бонусным / реакцией», иначе действие.
 */
export function inferFeatureTiming(
  summaryRu?: string | null,
  explicit?: SpellCastingTimeUnit | TurnCastTiming | null,
): TurnCastTiming {
  if (explicit === 'bonus' || explicit === 'reaction' || explicit === 'action') {
    return explicit
  }
  const text = (summaryRu ?? '').toLowerCase()
  if (/бонусн/.test(text) && /действ/.test(text) === false) {
    // «бонусным действием» without claiming main action
  }
  if (/как бонусн|бонусным действием|бонусное действие|за бонусн/.test(text)) {
    return 'bonus'
  }
  if (/как реакц|реакцией|реакцию|за реакц/.test(text)) {
    return 'reaction'
  }
  if (/бонусн/.test(text) && !/действи/.test(text)) return 'bonus'
  if (/реакц/.test(text) && !/действи/.test(text)) return 'reaction'
  return 'action'
}

export function canSpendFeature(
  state: TurnEconomyState,
  timing: TurnCastTiming,
): TurnSpendResult {
  return canSpendCast(state, timing)
}

export function applyFeatureSpend(
  state: TurnEconomyState,
  timing: TurnCastTiming,
): TurnEconomyState {
  if (timing === 'bonus') {
    return { ...state, bonus: true }
  }
  if (timing === 'reaction') {
    return { ...state, reaction: true }
  }
  if (!state.action) {
    return { ...state, action: true, actionSpentAs: 'feature' }
  }
  if (state.extraActions > 0) {
    return { ...state, extraActions: state.extraActions - 1 }
  }
  return state
}

export const TURN_MARK_LABELS: Record<TurnEconomyMarkKey, string> = {
  action: 'Действие',
  bonus: 'Бонусное',
  reaction: 'Реакция',
  object_interaction: 'Взаимодействие',
}

/** Сколько ходов до своей очереди (0 = сейчас). */
export function turnsUntilOwn(
  entries: Array<{ kind?: string; ref_id?: string; initiative_pending?: boolean }>,
  activeIndex: number,
  characterId: string,
): number | null {
  if (!entries.length) return null
  const n = entries.length
  const start = ((activeIndex % n) + n) % n
  for (let i = 0; i < n; i += 1) {
    const idx = (start + i) % n
    const e = entries[idx]
    if (e?.kind === 'pc' && e.ref_id === characterId) return i
  }
  return null
}
