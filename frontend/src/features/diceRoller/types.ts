/** Shared types for free dice roller (DICE-01). */

export const STANDARD_DICE = [4, 6, 8, 10, 12, 20, 100] as const
export type StandardDie = (typeof STANDARD_DICE)[number]

export type AdvantageMode = 'none' | 'advantage' | 'disadvantage'

export type DicePool = {
  /** Counts keyed by die sides (only standard dice in the clicker). */
  counts: Partial<Record<StandardDie, number>>
  modifier: number
}

export type ParsedDieGroup = {
  kind: 'dice'
  count: number
  sides: number
  /** Keep highest N (kh). */
  keepHighest?: number
  /** Keep lowest N (kl). */
  keepLowest?: number
  /** +1 or −1 from the leading operator. */
  sign: 1 | -1
}

export type ParsedModifier = {
  kind: 'mod'
  value: number
}

export type ParsedTerm = ParsedDieGroup | ParsedModifier

export type ParseOk = {
  ok: true
  terms: ParsedTerm[]
  /** Canonical formula without spaces, e.g. `2d6+3`. */
  canonical: string
  /** True when formula is only standard dice + one modifier (pool UI can sync). */
  simplePool: boolean
  pool: DicePool
  /** Total dice that will be rolled (before advantage doubling). */
  totalDice: number
  /** Count of d20 groups that contribute exactly one die to the pool (for advantage). */
  singleD20Eligible: boolean
}

export type ParseErr = {
  ok: false
  message: string
}

export type ParseResult = ParseOk | ParseErr

export type DieFaceResult = {
  sides: number
  value: number
  /** Dropped by kh/kl or the unused advantage/disadvantage die. */
  dropped: boolean
  /** Natural 20 / 1 highlight on a d20 face. */
  nat?: '20' | '1'
}

export type RollResult = {
  expression: string
  advantageMode: AdvantageMode
  total: number
  dice: DieFaceResult[]
  modifierTotal: number
}

export type DiceLogEntry = {
  id: string
  at: number
  expression: string
  advantageMode: AdvantageMode
  total: number
  dice: DieFaceResult[]
  modifierTotal: number
  /** Human title for sheet rolls («Акробатика», «Атака: меч»). */
  title?: string
  /** Full toast line — stroke of luck / legacy sheet history. */
  toastText?: string
  source?: 'panel' | 'sheet'
  /** When false, hide «Повторить» (legacy migrated toast without formula). */
  repeatable?: boolean
}

export const FORMULA_MAX_LEN = 200
export const DICE_MAX_COUNT = 100
export const SIDES_MIN = 2
export const SIDES_MAX = 1000
export const LOG_MAX = 50

export function emptyPool(): DicePool {
  return { counts: {}, modifier: 0 }
}
