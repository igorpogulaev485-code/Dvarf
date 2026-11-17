/** Sync racial trait pools into sheet.play.resources (race-res:*). */

import { clampResource, type ResourceReset, type SheetResource } from './rest'
import type { RaceRacialResourceDef } from './raceGrants'

export const RACE_RESOURCE_PREFIX = 'race-res:'

export function isRaceManagedResourceId(id: string): boolean {
  return id.startsWith(RACE_RESOURCE_PREFIX)
}

export function raceResourceId(poolId: string): string {
  return `${RACE_RESOURCE_PREFIX}${poolId}`
}

export type DesiredRaceResource = {
  id: string
  name: string
  max: number
  reset: ResourceReset
  track: 'spend'
}

export function desiredRaceResources(input: {
  racialResources: RaceRacialResourceDef[]
  proficiencyBonus: number
}): DesiredRaceResource[] {
  const out: DesiredRaceResource[] = []
  for (const row of input.racialResources) {
    const max =
      row.maxFrom === 'proficiency_bonus'
        ? Math.max(0, Math.floor(input.proficiencyBonus))
        : Math.max(0, Math.floor(row.maxFixed ?? 0))
    if (row.maxFrom !== 'proficiency_bonus' && max <= 0) continue
    const reset: ResourceReset = row.reset === 'short' ? 'short' : 'long'
    out.push({
      id: raceResourceId(row.id),
      name: row.nameRu,
      max,
      reset,
      track: 'spend',
    })
  }
  return out
}

/** Upsert race-res pools; keep manual and feat/class resources; drop stale race-res. */
export function syncRaceResources(
  existing: SheetResource[],
  desired: DesiredRaceResource[],
): SheetResource[] {
  const desiredById = new Map(desired.map((row) => [row.id, row]))
  const next: SheetResource[] = []
  const preserved = new Map<string, number>()

  for (const raw of existing) {
    const item = clampResource(raw)
    if (!isRaceManagedResourceId(item.id)) {
      next.push(item)
      continue
    }
    const want = desiredById.get(item.id)
    if (!want) continue
    preserved.set(item.id, item.used)
    desiredById.delete(item.id)
  }

  for (const want of desired) {
    const used = Math.min(want.max, Math.max(0, preserved.get(want.id) ?? 0))
    next.push({
      id: want.id,
      name: want.name,
      max: want.max,
      used,
      reset: want.reset,
      track: want.track,
    })
  }

  return next
}