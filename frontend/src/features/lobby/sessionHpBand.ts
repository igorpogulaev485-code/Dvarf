/** S-03: четыре подписи полоски хитов. Пороги: >50% / ≤50% / ≤1/3 / 0. */

export type HpBand = 'ok' | 'warn' | 'critical' | 'down' | 'unknown'

export const HP_WARN_RATIO = 0.5
export const HP_CRITICAL_RATIO = 1 / 3

export function hpBand(current: number | null | undefined, max: number | null | undefined): HpBand {
  if (max == null || max <= 0 || current == null) return 'unknown'
  if (current <= 0) return 'down'
  const ratio = current / max
  if (ratio <= HP_CRITICAL_RATIO) return 'critical'
  if (ratio <= HP_WARN_RATIO) return 'warn'
  return 'ok'
}

export function hpRatio(current: number | null | undefined, max: number | null | undefined): number {
  if (max == null || max <= 0 || current == null) return 0
  return Math.max(0, Math.min(1, current / max))
}

/** Герой: Здоров / Ранен / Тяжело ранен / Без сознания */
export function hpLabelHero(band: HpBand): string {
  if (band === 'ok') return 'Здоров'
  if (band === 'warn') return 'Ранен'
  if (band === 'critical') return 'Тяжело ранен'
  if (band === 'down') return 'Без сознания'
  return '—'
}

/** Враг (G12): Цел / Ранен / Тяжело ранен / Без сознания */
export function hpLabelEnemy(band: HpBand): string {
  if (band === 'ok') return 'Цел'
  if (band === 'warn') return 'Ранен'
  if (band === 'critical') return 'Тяжело ранен'
  if (band === 'down') return 'Без сознания'
  return '—'
}

export function bandFromRatio(ratio: number | null | undefined): HpBand {
  if (ratio == null || Number.isNaN(ratio)) return 'unknown'
  if (ratio <= 0) return 'down'
  if (ratio <= HP_CRITICAL_RATIO) return 'critical'
  if (ratio <= HP_WARN_RATIO) return 'warn'
  return 'ok'
}
