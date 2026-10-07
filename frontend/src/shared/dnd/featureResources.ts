/** Sync class-feature pools into sheet.resources (H3). */

import type { SheetResource } from './rest'
import { clampResource } from './rest'
import {
  proficiencyBonusForTotalLevel,
  recoverPoolId,
  resolveClassFeatureSlug,
  type UnlockedFeature,
} from './classFeatures'

export const FEATURE_RESOURCE_PREFIX = 'feat:'

export type DesiredFeatureResource = {
  id: string
  name: string
  max: number
  reset: SheetResource['reset']
  /** spend = used counts expended; stock = used counts current holdings */
  track: 'spend' | 'stock'
  /** When unlocked at this level, grant 1 stock on long rest if empty. */
  grantStockOnLongRestIfEmpty?: boolean
}

export function isFeatureManagedResourceId(id: string): boolean {
  return id.startsWith(FEATURE_RESOURCE_PREFIX)
}

export function featureResourceId(
  classSlug: string,
  poolId: string,
  classEntryId: string,
): string {
  return `${FEATURE_RESOURCE_PREFIX}${classSlug}:${poolId}:${classEntryId}`
}

export function desiredResourcesFromFeatures(input: {
  features: UnlockedFeature[]
  characterLevel: number
  classSlugByEntryId?: Record<string, string | null | undefined>
}): DesiredFeatureResource[] {
  const pb = proficiencyBonusForTotalLevel(input.characterLevel)
  const byId = new Map<string, DesiredFeatureResource>()

  for (const feature of input.features) {
    const resource = feature.resource
    if (!resource?.pool_id) continue
    const classSlug =
      input.classSlugByEntryId?.[feature.classEntryId] ||
      resolveClassFeatureSlug(feature.className) ||
      'class'
    const id = featureResourceId(classSlug, resource.pool_id, feature.classEntryId)

    const max =
      resource.uses_from === 'twice_proficiency_bonus'
        ? pb * 2
        : resource.uses_from === 'proficiency_bonus'
          ? pb
          : feature.resourceUses ?? resource.uses

    const next: DesiredFeatureResource = {
      id,
      name: resource.pool_name_ru || feature.name_ru,
      max: Math.max(0, Math.floor(max)),
      reset:
        resource.recharge === 'short_rest'
          ? 'short'
          : resource.recharge === 'manual'
            ? 'manual'
            : 'long',
      track: resource.track === 'stock' ? 'stock' : 'spend',
      grantStockOnLongRestIfEmpty: Boolean(resource.grant_stock_on_long_rest_if_empty),
    }

    const prev = byId.get(id)
    if (prev) {
      byId.set(id, {
        ...prev,
        // Prefer explicit pool label; keep higher max; OR the long-rest grant flag.
        name: resource.pool_name_ru || prev.name,
        max: Math.max(prev.max, next.max),
        grantStockOnLongRestIfEmpty:
          prev.grantStockOnLongRestIfEmpty || next.grantStockOnLongRestIfEmpty,
      })
    } else {
      byId.set(id, next)
    }

    // Auxiliary 1× recover pool (Soulknife bonus-action regain).
    if (resource.recover_one) {
      const recoverId = featureResourceId(
        classSlug,
        recoverPoolId(resource.pool_id),
        feature.classEntryId,
      )
      if (!byId.has(recoverId)) {
        byId.set(recoverId, {
          id: recoverId,
          name: resource.recover_one.label_ru,
          max: 1,
          reset: resource.recover_one.recharge === 'long_rest' ? 'long' : 'short',
          track: 'spend',
        })
      }
    }
  }

  return [...byId.values()]
}

/** Upsert feature pools; keep manual resources; drop obsolete feat: pools. */
export function syncFeatureResources(
  existing: SheetResource[],
  desired: DesiredFeatureResource[],
): SheetResource[] {
  const desiredById = new Map(desired.map((row) => [row.id, row]))
  const next: SheetResource[] = []

  for (const raw of existing) {
    const item = clampResource(raw)
    if (!isFeatureManagedResourceId(item.id)) {
      next.push(item)
      continue
    }
    const want = desiredById.get(item.id)
    if (!want) continue
    desiredById.delete(item.id)
    if (want.track === 'stock') {
      // used = current holdings
      next.push(
        clampResource({
          ...item,
          name: want.name,
          max: want.max,
          used: Math.min(want.max, item.used),
          reset: want.reset,
        }),
      )
    } else {
      next.push(
        clampResource({
          ...item,
          name: want.name,
          max: want.max,
          used: Math.min(want.max, item.used),
          reset: want.reset,
        }),
      )
    }
  }

  for (const want of desiredById.values()) {
    next.push(
      clampResource({
        id: want.id,
        name: want.name,
        max: want.max,
        // stock starts empty; spend starts fully available (used=0)
        used: 0,
        reset: want.reset,
      }),
    )
  }

  return next
}

export function findFeatureResource(
  resources: SheetResource[],
  classSlug: string,
  poolId: string,
  classEntryId: string,
): SheetResource | null {
  const id = featureResourceId(classSlug, poolId, classEntryId)
  return resources.find((row) => row.id === id) ?? null
}

/** Remaining uses for a spend pool (max - used). */
export function spendRemaining(resource: SheetResource | null | undefined): number {
  if (!resource) return 0
  return Math.max(0, resource.max - resource.used)
}

/** Current holdings for a stock pool (used field). */
export function stockCurrent(resource: SheetResource | null | undefined): number {
  if (!resource) return 0
  return Math.max(0, Math.min(resource.max, resource.used))
}

export type SpendFeatureResult = {
  resources: SheetResource[]
  ok: boolean
  via: 'pool' | 'linked_stock' | null
  message: string
}

/**
 * Spend one use from a spend-pool. If empty and feature has linked_spend stock,
 * consume one stock token instead (Phantom Wails + soul trinket).
 */
export function spendFeatureUse(input: {
  resources: SheetResource[]
  feature: UnlockedFeature
  classSlug: string
}): SpendFeatureResult {
  const resource = input.feature.resource
  if (!resource?.pool_id) {
    return {
      resources: input.resources,
      ok: false,
      via: null,
      message: 'У умения нет пула',
    }
  }

  const pool = findFeatureResource(
    input.resources,
    input.classSlug,
    resource.pool_id,
    input.feature.classEntryId,
  )
  if (!pool) {
    return {
      resources: input.resources,
      ok: false,
      via: null,
      message: 'Пул не синхронизирован',
    }
  }

  if (resource.track === 'stock') {
    if (pool.used >= pool.max) {
      return {
        resources: input.resources,
        ok: false,
        via: null,
        message: `Лимит: ${pool.name}`,
      }
    }
    return {
      resources: input.resources.map((row) =>
        row.id === pool.id ? clampResource({ ...row, used: row.used + 1 }) : row,
      ),
      ok: true,
      via: 'pool',
      message: `+1 ${pool.name}`,
    }
  }

  if (spendRemaining(pool) > 0) {
    return {
      resources: input.resources.map((row) =>
        row.id === pool.id ? clampResource({ ...row, used: row.used + 1 }) : row,
      ),
      ok: true,
      via: 'pool',
      message: `${pool.name}: −1`,
    }
  }

  const linked = resource.linked_spend
  if (linked?.pool_id) {
    const alt = findFeatureResource(
      input.resources,
      input.classSlug,
      linked.pool_id,
      input.feature.classEntryId,
    )
    if (alt) {
      const mode = linked.mode === 'spend' ? 'spend' : 'stock'
      if (mode === 'stock' && stockCurrent(alt) > 0) {
        return {
          resources: input.resources.map((row) =>
            row.id === alt.id
              ? clampResource({ ...row, used: Math.max(0, row.used - 1) })
              : row,
          ),
          ok: true,
          via: 'linked_stock',
          message: linked.label_ru || `Сжигаем ${alt.name}`,
        }
      }
      if (mode === 'spend' && spendRemaining(alt) > 0) {
        return {
          resources: input.resources.map((row) =>
            row.id === alt.id
              ? clampResource({ ...row, used: row.used + 1 })
              : row,
          ),
          ok: true,
          via: 'linked_stock',
          message: linked.label_ru || `${alt.name}: −1`,
        }
      }
    }
  }

  return {
    resources: input.resources,
    ok: false,
    via: null,
    message: linked
      ? `Нет использований и нет запаса (${linked.label_ru})`
      : 'Нет использований',
  }
}

/** Regain one spent die via recover_one auxiliary pool (Soulknife). */
export function recoverOneFromPool(input: {
  resources: SheetResource[]
  feature: UnlockedFeature
  classSlug: string
}): SpendFeatureResult {
  const resource = input.feature.resource
  if (!resource?.pool_id || !resource.recover_one) {
    return {
      resources: input.resources,
      ok: false,
      via: null,
      message: 'Нет восстановления',
    }
  }
  const pool = findFeatureResource(
    input.resources,
    input.classSlug,
    resource.pool_id,
    input.feature.classEntryId,
  )
  const recover = findFeatureResource(
    input.resources,
    input.classSlug,
    recoverPoolId(resource.pool_id),
    input.feature.classEntryId,
  )
  if (!pool || !recover) {
    return {
      resources: input.resources,
      ok: false,
      via: null,
      message: 'Пул не синхронизирован',
    }
  }
  if (pool.used <= 0) {
    return {
      resources: input.resources,
      ok: false,
      via: null,
      message: 'Все кости уже доступны',
    }
  }
  if (spendRemaining(recover) <= 0) {
    return {
      resources: input.resources,
      ok: false,
      via: null,
      message: 'Восстановление уже использовано (до отдыха)',
    }
  }
  return {
    resources: input.resources.map((row) => {
      if (row.id === pool.id) {
        return clampResource({ ...row, used: Math.max(0, row.used - 1) })
      }
      if (row.id === recover.id) {
        return clampResource({ ...row, used: row.used + 1 })
      }
      return row
    }),
    ok: true,
    via: 'pool',
    message: resource.recover_one.label_ru,
  }
}

/** Relentless / similar: if spend pool empty, regain 1 at initiative. */
export function grantOneOnInitiativeIfEmpty(input: {
  resources: SheetResource[]
  feature: UnlockedFeature
  classSlug: string
}): SpendFeatureResult {
  const resource = input.feature.resource
  if (!resource?.pool_id || !resource.grant_one_on_initiative_if_empty) {
    return {
      resources: input.resources,
      ok: false,
      via: null,
      message: 'Нет правила инициативы',
    }
  }
  const pool = findFeatureResource(
    input.resources,
    input.classSlug,
    resource.pool_id,
    input.feature.classEntryId,
  )
  if (!pool) {
    return {
      resources: input.resources,
      ok: false,
      via: null,
      message: 'Пул не синхронизирован',
    }
  }
  if (spendRemaining(pool) > 0) {
    return {
      resources: input.resources,
      ok: false,
      via: null,
      message: 'Ещё есть кости — Relentless не срабатывает',
    }
  }
  if (pool.used <= 0) {
    return {
      resources: input.resources,
      ok: false,
      via: null,
      message: 'Нечего возвращать',
    }
  }
  return {
    resources: input.resources.map((row) =>
      row.id === pool.id
        ? clampResource({ ...row, used: Math.max(0, row.used - 1) })
        : row,
    ),
    ok: true,
    via: 'pool',
    message: `${pool.name}: +1 на инициативе`,
  }
}

/** Consume one stock (e.g. destroy soul trinket for question). */
export function consumeStock(input: {
  resources: SheetResource[]
  classSlug: string
  poolId: string
  classEntryId: string
}): SpendFeatureResult {
  const stock = findFeatureResource(
    input.resources,
    input.classSlug,
    input.poolId,
    input.classEntryId,
  )
  if (!stock || stockCurrent(stock) <= 0) {
    return {
      resources: input.resources,
      ok: false,
      via: null,
      message: `Нет запаса (${input.poolId})`,
    }
  }
  return {
    resources: input.resources.map((row) =>
      row.id === stock.id
        ? clampResource({ ...row, used: Math.max(0, row.used - 1) })
        : row,
    ),
    ok: true,
    via: 'pool',
    message: `${stock.name}: −1`,
  }
}

/** Death's Friend: if stock empty after long rest, grant 1. */
export function grantStockOnLongRestIfEmpty(
  resources: SheetResource[],
  desired: DesiredFeatureResource[],
): SheetResource[] {
  const grants = new Set(
    desired.filter((row) => row.grantStockOnLongRestIfEmpty).map((row) => row.id),
  )
  if (grants.size === 0) return resources
  return resources.map((row) => {
    if (!grants.has(row.id)) return row
    if (stockCurrent(row) > 0) return row
    return clampResource({ ...row, used: 1 })
  })
}
