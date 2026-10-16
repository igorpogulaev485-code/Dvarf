/** PHB 2014 point buy + standard array helpers. */

import type { AbilityScores } from './multiclassRules'

export type AbilityKey = keyof AbilityScores

export const ABILITY_ORDER: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export const ABILITY_LABEL_RU: Record<AbilityKey, string> = {
  str: 'Сила',
  dex: 'Ловкость',
  con: 'Телосложение',
  int: 'Интеллект',
  wis: 'Мудрость',
  cha: 'Харизма',
}

/** PHB standard array. */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const

export const POINT_BUY_BUDGET = 27
export const POINT_BUY_MIN = 8
export const POINT_BUY_MAX = 15

/** Cost to raise a score from 8 to `score` (PHB point-buy table). */
export function pointBuyCostForScore(score: number): number {
  const clamped = Math.max(POINT_BUY_MIN, Math.min(POINT_BUY_MAX, Math.floor(score)))
  // 8→0, 9→1, 10→2, 11→3, 12→4, 13→5, 14→7, 15→9
  if (clamped <= 13) return clamped - 8
  if (clamped === 14) return 7
  return 9
}

export function pointBuyTotalCost(scores: AbilityScores): number {
  return ABILITY_ORDER.reduce((sum, key) => sum + pointBuyCostForScore(scores[key] ?? 8), 0)
}

export function pointBuyRemaining(scores: AbilityScores): number {
  return POINT_BUY_BUDGET - pointBuyTotalCost(scores)
}

export function emptyBaseScores(fill = 8): AbilityScores {
  return { str: fill, dex: fill, con: fill, int: fill, wis: fill, cha: fill }
}

export function standardArrayUnassigned(): AbilityScores {
  return emptyBaseScores(0)
}

export function isStandardArrayComplete(scores: AbilityScores): boolean {
  const values = ABILITY_ORDER.map((key) => scores[key]).sort((a, b) => b - a)
  if (values.some((v) => !v)) return false
  const expected = [...STANDARD_ARRAY].sort((a, b) => b - a)
  return values.every((v, i) => v === expected[i])
}

export function isPointBuyValid(scores: AbilityScores): boolean {
  for (const key of ABILITY_ORDER) {
    const v = scores[key]
    if (!Number.isFinite(v) || v < POINT_BUY_MIN || v > POINT_BUY_MAX) return false
  }
  return pointBuyRemaining(scores) === 0
}

export function isManualScoresValid(scores: AbilityScores): boolean {
  return ABILITY_ORDER.every((key) => {
    const v = scores[key]
    return Number.isFinite(v) && v >= 1 && v <= 30
  })
}

/** Suggested priority order for assigning array / buy (primary first). */
export const CLASS_ABILITY_PRIORITIES: Record<string, AbilityKey[]> = {
  artificer: ['int', 'con', 'dex', 'wis', 'cha', 'str'],
  barbarian: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
  bard: ['cha', 'dex', 'con', 'wis', 'int', 'str'],
  cleric: ['wis', 'con', 'str', 'dex', 'cha', 'int'],
  druid: ['wis', 'con', 'dex', 'int', 'cha', 'str'],
  fighter: ['str', 'con', 'dex', 'wis', 'cha', 'int'],
  monk: ['dex', 'wis', 'con', 'str', 'cha', 'int'],
  paladin: ['str', 'cha', 'con', 'wis', 'dex', 'int'],
  ranger: ['dex', 'wis', 'con', 'str', 'cha', 'int'],
  rogue: ['dex', 'con', 'cha', 'wis', 'int', 'str'],
  sorcerer: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
  warlock: ['cha', 'con', 'dex', 'wis', 'int', 'str'],
  wizard: ['int', 'con', 'dex', 'wis', 'cha', 'str'],
}

export function applyStandardArrayByPriority(
  classSlug: string | null | undefined,
): AbilityScores {
  const priorities =
    (classSlug && CLASS_ABILITY_PRIORITIES[classSlug.toLowerCase()]) || ABILITY_ORDER
  const next = emptyBaseScores(8)
  STANDARD_ARRAY.forEach((score, index) => {
    const key = priorities[index] ?? ABILITY_ORDER[index]
    if (key) next[key] = score
  })
  return next
}

export function applyPointBuyByPriority(
  classSlug: string | null | undefined,
): AbilityScores {
  // Cheap heuristic: mirror standard array via priority (valid 27-point spend).
  return applyStandardArrayByPriority(classSlug)
}

export type AbilityMethod = 'manual' | 'standard_array' | 'point_buy'

export function mergeRacialBonuses(
  base: AbilityScores,
  bonuses: Partial<AbilityScores> | null | undefined,
): AbilityScores {
  const next = { ...base }
  if (!bonuses) return next
  for (const key of ABILITY_ORDER) {
    const bonus = bonuses[key]
    if (typeof bonus === 'number' && Number.isFinite(bonus)) {
      next[key] = (next[key] ?? 10) + bonus
    }
  }
  return next
}
