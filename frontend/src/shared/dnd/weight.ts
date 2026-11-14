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

/** Entire purse as copper pieces (cp) for exact spend math. */
export function coinsToCp(coins: CoinPurse): number {
  return (
    Math.floor(clampNonNegative(coins.pp)) * 1000 +
    Math.floor(clampNonNegative(coins.gp)) * 100 +
    Math.floor(clampNonNegative(coins.ep)) * 50 +
    Math.floor(clampNonNegative(coins.sp)) * 10 +
    Math.floor(clampNonNegative(coins.cp))
  )
}

/** Rebuild purse from copper (greedy pp → gp → ep → sp → cp). */
export function cpToCoins(totalCp: number): CoinPurse {
  let cp = Math.max(0, Math.floor(totalCp))
  const pp = Math.floor(cp / 1000)
  cp %= 1000
  const gp = Math.floor(cp / 100)
  cp %= 100
  const ep = Math.floor(cp / 50)
  cp %= 50
  const sp = Math.floor(cp / 10)
  cp %= 10
  return { pp, gp, ep, sp, cp }
}

export type SpendGpResult =
  | {
      ok: true
      coins: CoinPurse
      paidGp: number
      haveGpBefore: number
      haveGpAfter: number
      message: string
    }
  | {
      ok: false
      coins: CoinPurse
      paidGp: 0
      needGp: number
      haveGp: number
      message: string
    }

/**
 * Spend a gold-piece cost from the purse (auto-converts denominations).
 * Cost 0 → no-op success. Insufficient funds → ok:false with RU message.
 */
export function spendGpFromPurse(coins: CoinPurse, gpCost: number): SpendGpResult {
  const needGp = Math.max(0, Number(gpCost) || 0)
  const haveGpBefore = coinsToGp(coins)
  if (needGp <= 0) {
    return {
      ok: true,
      coins: { ...coins },
      paidGp: 0,
      haveGpBefore,
      haveGpAfter: haveGpBefore,
      message: '',
    }
  }
  const needCp = Math.round(needGp * 100)
  const haveCp = coinsToCp(coins)
  if (haveCp < needCp) {
    return {
      ok: false,
      coins: { ...coins },
      paidGp: 0,
      needGp,
      haveGp: haveGpBefore,
      message: `Недостаточно золота: нужно ${formatGpTotal(needGp)} зм, есть ${formatGpTotal(haveGpBefore)} зм`,
    }
  }
  const next = cpToCoins(haveCp - needCp)
  const haveGpAfter = coinsToGp(next)
  return {
    ok: true,
    coins: next,
    paidGp: needGp,
    haveGpBefore,
    haveGpAfter,
    message: `−${formatGpTotal(needGp)} зм · осталось ≈ ${formatGpTotal(haveGpAfter)} зм`,
  }
}

/** Exact GP amount with thin-space thousands (tooltip / coin pad / inventory). */
export function formatGpExact(total: number): string {
  if (!Number.isFinite(total)) return '0'
  const neg = total < 0
  const abs = Math.abs(total)
  if (Number.isInteger(abs)) {
    const digits = String(Math.trunc(abs)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return neg ? `−${digits}` : digits
  }
  const fixed = abs.toFixed(2).replace(/\.?0+$/, '')
  const [whole, frac] = fixed.split('.')
  const spaced = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const out = frac ? `${spaced},${frac}` : spaced
  return neg ? `−${out}` : out
}

/**
 * Floor to at most `sig` significant digits (truncate toward zero, never round up).
 * Returns a Russian decimal string (comma) without trailing zeros.
 */
export function formatSigDigitsFloor(value: number, sig = 3): string {
  if (!Number.isFinite(value) || value === 0) return '0'
  const neg = value < 0
  const abs = Math.abs(value)
  const exp = Math.floor(Math.log10(abs))
  const scale = 10 ** (exp - (sig - 1))
  const truncated = Math.floor(abs / scale) * scale
  // Avoid float dust (e.g. 1.2300000001).
  const normalized = Number(truncated.toPrecision(sig + 2))
  let text: string
  if (Number.isInteger(normalized) || exp >= sig - 1) {
    text = String(Math.trunc(normalized))
  } else {
    const decimals = Math.max(0, sig - 1 - exp)
    text = normalized
      .toFixed(decimals)
      .replace(/\.?0+$/, '')
      .replace('.', ',')
  }
  return neg ? `−${text}` : text
}

/**
 * Compact gold face for the desk/mobile header chip.
 * ≤9999 → exact with spaces («1 234»); else «12,3 тыс» / «1,23 млн» / «1,2 млрд»
 * (≤3 significant digits, floor). Exact amount stays in tooltip / coin pad.
 */
export function formatGpCompact(total: number): string {
  if (!Number.isFinite(total)) return '0'
  const neg = total < 0
  const abs = Math.abs(total)
  if (abs < 10_000) {
    const exact = formatGpExact(abs)
    return neg ? `−${exact}` : exact
  }
  let scaled: number
  let unit: string
  if (abs < 1_000_000) {
    scaled = abs / 1_000
    unit = 'тыс'
  } else if (abs < 1_000_000_000) {
    scaled = abs / 1_000_000
    unit = 'млн'
  } else {
    scaled = abs / 1_000_000_000
    unit = 'млрд'
  }
  const body = formatSigDigitsFloor(scaled, 3)
  return neg ? `−${body} ${unit}` : `${body} ${unit}`
}

/** @deprecated Prefer formatGpExact — kept as the shared exact face. */
export function formatGpTotal(total: number): string {
  return formatGpExact(total)
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

/** PHB variant «Нагрузка»: пороги 5×Сил / 10×Сил. */
export type EncumbranceTier = 'none' | 'encumbered' | 'heavily'

export function encumbranceTier(
  strengthScore: number,
  carriedLb: number,
): { tier: EncumbranceTier; speedPenalty: number; disadvantage: boolean } {
  const str = Math.max(0, Math.floor(strengthScore))
  if (carriedLb > str * 10) {
    return { tier: 'heavily', speedPenalty: 20, disadvantage: true }
  }
  if (carriedLb > str * 5) {
    return { tier: 'encumbered', speedPenalty: 10, disadvantage: false }
  }
  return { tier: 'none', speedPenalty: 0, disadvantage: false }
}

/** Effective speed with optional PHB encumbrance variant. */
export function speedWithEncumbrance(
  baseSpeed: number | null | undefined,
  strengthScore: number,
  carriedLb: number,
  useVariant: boolean,
): number | null {
  if (baseSpeed == null || !Number.isFinite(baseSpeed)) return baseSpeed ?? null
  if (!useVariant) return baseSpeed
  const { speedPenalty } = encumbranceTier(strengthScore, carriedLb)
  return Math.max(0, baseSpeed - speedPenalty)
}

export function formatLb(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '0'
  const rounded = Number(value.toFixed(digits))
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}
