/** Pure coin-pad preview helpers (UX-18 / B18). */

import { coinsToGp, type CoinPurse } from '../../shared/dnd/weight'

export type CoinKey = keyof CoinPurse

export const COIN_META: Array<{ key: CoinKey; label: string; short: string }> = [
  { key: 'gp', label: 'Золото', short: 'З' },
  { key: 'sp', label: 'Серебро', short: 'С' },
  { key: 'cp', label: 'Медь', short: 'М' },
  { key: 'pp', label: 'Платина', short: 'П' },
  { key: 'ep', label: 'Электрум', short: 'Э' },
]

export function coinLabel(key: CoinKey): string {
  return COIN_META.find((row) => row.key === key)?.label ?? key
}

export function previewCoinApply(
  coins: CoinPurse,
  coin: CoinKey,
  delta: number,
  sign: 1 | -1,
): {
  before: number
  after: number
  next: CoinPurse
  totalBeforeGp: number
  totalAfterGp: number
} {
  const amount = Math.max(0, Math.floor(delta))
  const before = Math.max(0, Math.floor(coins[coin]))
  const after = Math.max(0, before + sign * amount)
  const next = { ...coins, [coin]: after }
  return {
    before,
    after,
    next,
    totalBeforeGp: coinsToGp(coins),
    totalAfterGp: coinsToGp(next),
  }
}

/** Player-facing preview line before «Взять / Отдать». */
export function formatCoinApplyPreview(
  coins: CoinPurse,
  coin: CoinKey,
  delta: number,
  sign: 1 | -1,
): string | null {
  if (!(delta > 0)) return null
  const { before, after, totalBeforeGp, totalAfterGp } = previewCoinApply(
    coins,
    coin,
    delta,
    sign,
  )
  const label = coinLabel(coin)
  const verb = sign > 0 ? 'взять' : 'отдать'
  const totalSame = totalBeforeGp === totalAfterGp
  const totalPart = totalSame
    ? ''
    : ` · всего ${formatGpShort(totalBeforeGp)} → ${formatGpShort(totalAfterGp)} зм`
  return `${label}: ${before} → ${after} (${verb} ${delta})${totalPart}`
}

function formatGpShort(total: number): string {
  if (!Number.isFinite(total)) return '0'
  if (Number.isInteger(total)) return String(total)
  return total.toFixed(2).replace(/\.?0+$/, '')
}
