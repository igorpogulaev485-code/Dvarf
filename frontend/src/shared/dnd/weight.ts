/** Pure 5e-oriented weight helpers — reusable on sheet and later party frame. */

export type CoinPurse = {
  cp: number
  sp: number
  ep: number
  gp: number
  pp: number
}

export const EMPTY_COINS: CoinPurse = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }

/** PHB: 50 coins weigh 1 pound. */
export const COINS_PER_POUND = 50

export type WeighableItem = {
  qty: number
  weight_lb: number | null
}

export function clampNonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return value
}

export function coinCount(coins: CoinPurse): number {
  return (
    clampNonNegative(coins.cp) +
    clampNonNegative(coins.sp) +
    clampNonNegative(coins.ep) +
    clampNonNegative(coins.gp) +
    clampNonNegative(coins.pp)
  )
}

/** PHB exchange → gold pieces (pp=10, ep=1/2, sp=1/10, cp=1/100). */
export function coinsToGp(coins: CoinPurse): number {
  return (
    clampNonNegative(coins.pp) * 10 +
    clampNonNegative(coins.gp) +
    clampNonNegative(coins.ep) * 0.5 +
    clampNonNegative(coins.sp) * 0.1 +
    clampNonNegative(coins.cp) * 0.01
  )
}

export function formatGpTotal(total: number): string {
  if (!Number.isFinite(total)) return '0'
  if (Number.isInteger(total)) return String(total)
  return total.toFixed(2).replace(/\.?0+$/, '')
}

/** Short purse breakdown for tooltips (omit zero piles). */
export function formatCoinBreakdown(coins: CoinPurse): string {
  const parts: string[] = []
  if (coins.pp) parts.push(`${coins.pp} пм`)
  if (coins.gp) parts.push(`${coins.gp} зм`)
  if (coins.ep) parts.push(`${coins.ep} эм`)
  if (coins.sp) parts.push(`${coins.sp} см`)
  if (coins.cp) parts.push(`${coins.cp} мм`)
  return parts.length > 0 ? parts.join(' · ') : 'пусто'
}

export function coinWeightLb(coins: CoinPurse): number {
  return coinCount(coins) / COINS_PER_POUND
}

export function itemLineWeightLb(item: WeighableItem): number {
  if (item.weight_lb == null) return 0
  return clampNonNegative(item.qty) * clampNonNegative(item.weight_lb)
}

export function itemsWeightLb(items: WeighableItem[]): number {
  return items.reduce((sum, item) => sum + itemLineWeightLb(item), 0)
}

export function totalCarriedLb(coins: CoinPurse, items: WeighableItem[]): number {
  return coinWeightLb(coins) + itemsWeightLb(items)
}

/** Basic PHB carrying capacity (not encumbrance variant). */
export function carryingCapacityLb(strengthScore: number): number {
  return Math.max(0, Math.floor(strengthScore)) * 15
}

export function formatLb(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Number(value.toFixed(digits))
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}
