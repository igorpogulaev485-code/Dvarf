/** Per-class hit-dice pools (PHB multiclass). */

import type { ClassLevelEntry } from './classLevels'
import {
  clampHitDiceCurrent,
  isHitDie,
  type HitDie,
} from './hitDice'
import { hitDieForClass } from './multiclassRules'

export type ClassHitDicePool = {
  classEntryId: string
  className: string
  die: HitDie
  max: number
  current: number
}

export function totalHitDiceMax(pools: ClassHitDicePool[]): number {
  return pools.reduce((sum, pool) => sum + Math.max(0, pool.max), 0)
}

export function totalHitDiceCurrent(pools: ClassHitDicePool[]): number {
  return pools.reduce((sum, pool) => sum + Math.max(0, pool.current), 0)
}

export function primaryHitDie(pools: ClassHitDicePool[]): HitDie | null {
  return pools[0]?.die ?? null
}

export function syncHitDicePools(input: {
  classes: ClassLevelEntry[]
  previous?: ClassHitDicePool[]
  catalogDataByEntryId?: Record<string, Record<string, unknown> | null | undefined>
}): ClassHitDicePool[] {
  const prevById = new Map((input.previous ?? []).map((pool) => [pool.classEntryId, pool]))
  const next: ClassHitDicePool[] = []
  for (const row of input.classes) {
    if (!row.name.trim() || row.level <= 0) continue
    const die =
      hitDieForClass({
        className: row.name,
        catalogData: input.catalogDataByEntryId?.[row.id] ?? null,
      }) ?? prevById.get(row.id)?.die ?? 'd8'
    const max = Math.max(0, Math.floor(row.level))
    const prev = prevById.get(row.id)
    let current: number
    if (!prev) {
      current = max
    } else if (max > prev.max) {
      current = clampHitDiceCurrent(prev.current + (max - prev.max), max)
    } else if (max < prev.max) {
      const lost = prev.max - max
      current = clampHitDiceCurrent(prev.current - lost, max)
    } else {
      current = clampHitDiceCurrent(prev.current, max)
    }
    next.push({
      classEntryId: row.id,
      className: row.name.trim(),
      die: isHitDie(die) ? die : 'd8',
      max,
      current,
    })
  }
  return next
}

/** Migrate legacy single-pool sheet into per-class pools. */
export function migrateLegacyHitDice(input: {
  classes: ClassLevelEntry[]
  legacyDie: HitDie | null
  legacyCurrent: number
  catalogDataByEntryId?: Record<string, Record<string, unknown> | null | undefined>
}): ClassHitDicePool[] {
  const synced = syncHitDicePools({
    classes: input.classes,
    catalogDataByEntryId: input.catalogDataByEntryId,
  })
  const totalMax = totalHitDiceMax(synced)
  if (totalMax <= 0) return synced
  let remainingSpent = Math.max(0, totalMax - Math.max(0, Math.floor(input.legacyCurrent)))
  return synced.map((pool, index) => {
    if (remainingSpent <= 0) return pool
    const take = Math.min(pool.max, remainingSpent)
    remainingSpent -= take
    const die =
      index === 0 && input.legacyDie && isHitDie(input.legacyDie)
        ? input.legacyDie
        : pool.die
    return {
      ...pool,
      die,
      current: clampHitDiceCurrent(pool.max - take, pool.max),
    }
  })
}

export function spendHitDieFromPool(
  pools: ClassHitDicePool[],
  classEntryId: string,
): ClassHitDicePool[] | null {
  const index = pools.findIndex((pool) => pool.classEntryId === classEntryId)
  if (index < 0) return null
  const pool = pools[index]
  if (!pool || pool.current <= 0) return null
  const next = pools.slice()
  next[index] = { ...pool, current: pool.current - 1 }
  return next
}

/** PHB long rest: regain ⌊total/2⌋ (min 1) spent dice — fill pools with deficit first (largest die first). */
export function recoverHitDicePoolsOnLongRest(
  pools: ClassHitDicePool[],
): ClassHitDicePool[] {
  const totalMax = totalHitDiceMax(pools)
  if (totalMax <= 0) return pools
  const totalCurrent = totalHitDiceCurrent(pools)
  const spent = totalMax - totalCurrent
  if (spent <= 0) return pools
  let regain = Math.min(spent, Math.max(1, Math.floor(totalMax / 2)))
  const order = pools
    .map((pool, index) => ({ pool, index, deficit: pool.max - pool.current }))
    .filter((row) => row.deficit > 0)
    .sort((a, b) => {
      const dieDiff = Number(b.pool.die.slice(1)) - Number(a.pool.die.slice(1))
      if (dieDiff !== 0) return dieDiff
      return b.deficit - a.deficit
    })
  const next = pools.map((pool) => ({ ...pool }))
  for (const row of order) {
    if (regain <= 0) break
    const take = Math.min(row.deficit, regain)
    const pool = next[row.index]
    if (!pool) continue
    pool.current = clampHitDiceCurrent(pool.current + take, pool.max)
    regain -= take
  }
  return next
}

export function readHitDicePools(raw: unknown): ClassHitDicePool[] | null {
  if (!Array.isArray(raw)) return null
  const out: ClassHitDicePool[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (typeof row.classEntryId !== 'string') continue
    if (!isHitDie(row.die)) continue
    out.push({
      classEntryId: row.classEntryId,
      className: typeof row.className === 'string' ? row.className : '',
      die: row.die,
      max: Math.max(0, Math.floor(Number(row.max) || 0)),
      current: clampHitDiceCurrent(Number(row.current) || 0, Number(row.max) || 0),
    })
  }
  return out
}
