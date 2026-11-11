/**
 * PHB Bestow Curse upcast: 9th lasts until dispelled and does not require concentration.
 * 5th+ also drops concentration (8 hours / 24 hours).
 */

export type CastTiming = {
  duration: string
  concentration: boolean
}

function isBestowCurse(input: {
  name?: string | null
  catalogId?: string | null
  slug?: string | null
}): boolean {
  const catalog = (input.catalogId ?? input.slug ?? '').trim().toLowerCase().replace(/-/g, '_')
  if (catalog === 'bestow_curse' || catalog.endsWith('bestow_curse')) return true
  const name = (input.name ?? '').trim().toLowerCase()
  return name === 'bestow curse' || name === 'проклятие'
}

export function resolveCastTiming(input: {
  name?: string | null
  catalogId?: string | null
  slug?: string | null
  duration?: string | null
  concentration?: boolean | null
  slotLevel: number
}): CastTiming {
  const base: CastTiming = {
    duration: input.duration?.trim() || '',
    concentration: Boolean(input.concentration),
  }
  if (!isBestowCurse(input)) return base
  const slot = Math.floor(input.slotLevel)
  if (slot >= 9) return { duration: 'Пока не развеют', concentration: false }
  if (slot >= 7) return { duration: '24 часа', concentration: false }
  if (slot >= 5) return { duration: '8 часов', concentration: false }
  if (slot >= 4) return { duration: 'Концентрация, вплоть до 10 минут', concentration: true }
  return {
    duration: base.duration || 'Концентрация, вплоть до 1 минуты',
    concentration: true,
  }
}
