/**
 * SRD 5.2.1 Heroic Inspiration — reroll any die after rolling; keep the new result.
 * At most one at a time (unless homebrew stack). Extra grant may be given to an ally.
 * Not 2014 advantage Inspiration. Not Bardic Inspiration.
 */

export const HEROIC_INSPIRATION_HINT =
  'Героическое вдохновение: сразу после броска перебросить любой кубик и оставить новый результат'

export const HEROIC_INSPIRATION_TRANSFER_HINT =
  'Если героическое вдохновение уже есть — можно отдать союзнику в той же группе, у кого его нет'

export type HeroicInspirationGrantResult =
  | { ok: true; has: true; transferred?: false }
  | { ok: true; has: true; transferred: true; allyId: string }
  | { ok: false; reason: string }

export type HeroicInspirationSpendResult =
  | { ok: true; has: false }
  | { ok: false; reason: string }

export type HeroicRerollResult = {
  previous: number
  next: number
  sides: number
}

/** Cap for homebrew stack (lobby inspiration_stack on). Book default max is 1. */
export function heroicInspirationMax(stackEnabled: boolean, stackMax: number): number {
  if (!stackEnabled) return 1
  const n = Math.floor(stackMax)
  if (!Number.isFinite(n)) return 3
  return Math.max(1, Math.min(20, n))
}

export function canSpendHeroicInspiration(has: boolean | number): boolean {
  if (typeof has === 'number') return has > 0
  return Boolean(has)
}

/** Spend one charge (bool → false; number → −1). */
export function spendHeroicInspiration(
  current: boolean | number,
): HeroicInspirationSpendResult & { next: boolean | number } {
  if (typeof current === 'number') {
    if (current <= 0) return { ok: false, reason: 'нет героического вдохновения', next: 0 }
    return { ok: true, has: false, next: current - 1 }
  }
  if (!current) return { ok: false, reason: 'нет героического вдохновения', next: false }
  return { ok: true, has: false, next: false }
}

/**
 * Grant one charge. With book rules (max 1): if already held, optionally transfer to ally.
 * With stack homebrew: accumulate up to max.
 */
export function grantHeroicInspiration(input: {
  current: boolean | number
  stackEnabled?: boolean
  stackMax?: number
  /** Ally without inspiration — used when already at max under book rules. */
  allyIdWithout?: string | null
}): HeroicInspirationGrantResult & { next: boolean | number } {
  const max = heroicInspirationMax(Boolean(input.stackEnabled), input.stackMax ?? 3)
  const cur =
    typeof input.current === 'number'
      ? Math.max(0, Math.floor(input.current))
      : input.current
        ? 1
        : 0

  if (cur < max) {
    const next = cur + 1
    return {
      ok: true,
      has: true,
      next: typeof input.current === 'number' || max > 1 ? next : true,
    }
  }

  if (input.allyIdWithout) {
    return {
      ok: true,
      has: true,
      transferred: true,
      allyId: input.allyIdWithout,
      next: input.current,
    }
  }

  return {
    ok: false,
    reason: max <= 1
      ? 'уже есть героическое вдохновение — отдайте союзнику или включите стопку в правилах лобби'
      : `уже максимум героического вдохновения (${max})`,
    next: input.current,
  }
}

/** Reroll one die (1…sides); must use the new face. */
export function resolveHeroicReroll(input: {
  previous: number
  sides: number
  rng?: () => number
}): HeroicRerollResult {
  const sides = Math.max(2, Math.floor(input.sides))
  const rng = input.rng ?? Math.random
  const next = 1 + Math.floor(rng() * sides)
  return {
    previous: Math.floor(input.previous),
    next,
    sides,
  }
}

/** True when rules_edition is 2024 — UI shows reroll chip, not advantage arm. */
export function usesHeroicInspiration(edition: string | null | undefined): boolean {
  return String(edition ?? '2014').trim() === '2024'
}
