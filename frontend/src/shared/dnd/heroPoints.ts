/**
 * O-04: очки героя — ресурс листа (play.resources).
 * При первом включении правила выдаём запас по формуле уровня; при левелапе — сброс и новый max.
 */
import {
  HERO_POINTS_RESOURCE_ID,
  heroPointsMaxForLevel,
} from './o04DmgAdvanced'
import { clampResource, type SheetResource } from './rest'

export { HERO_POINTS_RESOURCE_ID, heroPointsMaxForLevel }

export function findHeroPointsResource(
  resources: SheetResource[],
): SheetResource | null {
  return resources.find((r) => r.id === HERO_POINTS_RESOURCE_ID) ?? null
}

export function heroPointsRemaining(resources: SheetResource[]): number {
  const row = findHeroPointsResource(resources)
  if (!row) return 0
  return Math.max(0, row.max - row.used)
}

/** Выдать / синхронизировать ресурс при включённом правиле (не затирать spent без причины). */
export function ensureHeroPointsResource(
  resources: SheetResource[],
  level: number,
  enabled: boolean,
): SheetResource[] {
  if (!enabled) {
    // Не удаляем уже выбранное — только не показываем/не требуем. Оставляем как есть.
    return resources
  }
  const max = heroPointsMaxForLevel(level)
  const existing = findHeroPointsResource(resources)
  if (!existing) {
    return [
      ...resources,
      clampResource({
        id: HERO_POINTS_RESOURCE_ID,
        name: 'Очки героя',
        max,
        used: 0,
        reset: 'manual',
        onHot: true,
        track: 'spend',
      }),
    ]
  }
  // Если max совпадает с формулой — ок. Если уровень вырос — см. refreshHeroPointsOnLevelUp.
  if (existing.max === max) return resources
  // Первое включение на уже существующем персонаже без ресурса уже обработано.
  // Если ресурс есть, но max «с потолка» (0) — поправь.
  if (existing.max <= 0) {
    return resources.map((r) =>
      r.id === HERO_POINTS_RESOURCE_ID
        ? clampResource({ ...r, max, used: 0, name: 'Очки героя', onHot: true })
        : r,
    )
  }
  return resources
}

/** При повышении уровня: остаток сгорает, новый запас = формула. */
export function refreshHeroPointsOnLevelUp(
  resources: SheetResource[],
  newLevel: number,
  enabled: boolean,
): SheetResource[] {
  if (!enabled) return resources
  const max = heroPointsMaxForLevel(newLevel)
  const existing = findHeroPointsResource(resources)
  if (!existing) {
    return ensureHeroPointsResource(resources, newLevel, true)
  }
  return resources.map((r) =>
    r.id === HERO_POINTS_RESOURCE_ID
      ? clampResource({
          ...r,
          name: 'Очки героя',
          max,
          used: 0,
          reset: 'manual',
          onHot: true,
          track: 'spend',
        })
      : r,
  )
}

export function spendHeroPoint(resources: SheetResource[]): {
  resources: SheetResource[]
  ok: boolean
} {
  const row = findHeroPointsResource(resources)
  if (!row || row.used >= row.max) return { resources, ok: false }
  return {
    ok: true,
    resources: resources.map((r) =>
      r.id === HERO_POINTS_RESOURCE_ID
        ? clampResource({ ...r, used: r.used + 1 })
        : r,
    ),
  }
}
