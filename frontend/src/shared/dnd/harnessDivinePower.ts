/**
 * TCE Harness Divine Power (Праведное восстановление).
 *
 * Action: expend ONE Channel Divinity use (class pool or item free charge)
 * AND one daily HDP use to regain one expended spell slot of level ≤ ceil(PB/2).
 *
 * Daily uses by class level (owner table for this product):
 * - Cleric: 1 at 2nd, 2 at 6th, 3 at 18th
 * - Paladin: 1 at 3rd, 2 at 7th, 3 at 15th
 */

import type { UnlockedFeature } from './classFeatures'
import {
  findFeatureResource,
  spendFeatureUse,
  spendRemaining,
} from './featureResources'
import type { SheetResource } from './rest'
import { clampResource } from './rest'
import type { SpellSlotState } from './spells'

export const HARNESS_DIVINE_POWER_FEATURE_ID = 'cd_harness_divine_power'
export const HARNESS_DIVINE_POWER_POOL_ID = 'harness_divine_power'

/** Cleric daily uses by class level thresholds. */
const CLERIC_DAILY: Array<[number, number]> = [
  [18, 3],
  [6, 2],
  [2, 1],
]

/** Paladin daily uses by class level thresholds. */
const PALADIN_DAILY: Array<[number, number]> = [
  [15, 3],
  [7, 2],
  [3, 1],
]

export function isHarnessDivinePowerFeature(
  feature: Pick<UnlockedFeature, 'id'> | string,
): boolean {
  const id = typeof feature === 'string' ? feature : feature.id
  return id === HARNESS_DIVINE_POWER_FEATURE_ID
}

/** Daily HDP pool id in sheet.resources (`feat:…:harness_divine_power:…`). */
export function isHarnessDivinePowerResourceId(id: string): boolean {
  return id.includes(`:${HARNESS_DIVINE_POWER_POOL_ID}:`)
}

/**
 * Direct desk spend surfaces (hot bar, abilities compact) must not expose the
 * daily HDP counter — spend only via Channel Divinity dialog / item CD view.
 */
export function resourceShowsAsDirectSpend(resource: {
  id: string
  max: number
  name: string
  onHot?: boolean
  unlimited?: boolean
}): boolean {
  if (isHarnessDivinePowerResourceId(resource.id)) return false
  if (resource.onHot === false) return false
  if (resource.unlimited) return Boolean(resource.name.trim())
  return resource.max > 0 && Boolean(resource.name.trim())
}

export function harnessDivinePowerSlotCap(proficiencyBonus: number): number {
  const pb = Math.max(1, Math.floor(proficiencyBonus))
  return Math.max(1, Math.ceil(pb / 2))
}

/**
 * Daily HDP uses for a class at the given class level.
 * Returns 0 if the class does not have the feature at that level.
 */
export function harnessDivinePowerDailyUses(
  classSlug: string,
  classLevel: number,
): number {
  const level = Math.max(0, Math.floor(classLevel))
  const table =
    classSlug === 'cleric' ? CLERIC_DAILY : classSlug === 'paladin' ? PALADIN_DAILY : null
  if (!table) return 0
  for (const [minLevel, uses] of table) {
    if (level >= minLevel) return uses
  }
  return 0
}

export function spentSlotLevels(
  slots: Record<string, SpellSlotState | undefined>,
  cap: number,
): number[] {
  const limit = Math.max(1, Math.floor(cap))
  const levels: number[] = []
  for (let level = 1; level <= limit; level += 1) {
    const row = slots[String(level)]
    if (row && row.used > 0 && row.max > 0) levels.push(level)
  }
  return levels
}

export function restoreOneSpentSlot(
  slots: Record<string, SpellSlotState | undefined>,
  level: number,
  cap: number,
): { ok: true; slots: Record<string, SpellSlotState> } | { ok: false; reason: string } {
  const lvl = Math.floor(level)
  if (lvl < 1 || lvl > cap) {
    return {
      ok: false,
      reason: `Круг ячейки не выше ${cap} (половина бонуса мастерства, вверх)`,
    }
  }
  const row = slots[String(lvl)]
  if (!row || row.used <= 0) {
    return { ok: false, reason: `Нет потраченной ячейки ${lvl} круга` }
  }
  const next: Record<string, SpellSlotState> = {}
  for (const [key, value] of Object.entries(slots)) {
    if (value) next[key] = { max: value.max, used: value.used }
  }
  next[String(lvl)] = { max: row.max, used: Math.max(0, row.used - 1) }
  return { ok: true, slots: next }
}

export type ApplyHarnessDivinePowerInput = {
  resources: SheetResource[]
  slots: Record<string, SpellSlotState | undefined>
  /** Class or gear Channel Divinity resource id to spend. */
  channelResourceId: string
  feature: UnlockedFeature
  classSlug: string
  slotLevel: number
  proficiencyBonus: number
}

export type ApplyHarnessDivinePowerResult =
  | {
      ok: true
      resources: SheetResource[]
      slots: Record<string, SpellSlotState>
      message: string
    }
  | { ok: false; reason: string }

/**
 * Atomically: require ≥1 CD on the opened pool, ≥1 HDP daily, and an expended
 * slot ≤ ceil(PB/2); then spend both charges and restore the slot.
 * On any failure, returns original state via ok:false (no partial apply).
 */
export function applyHarnessDivinePower(
  input: ApplyHarnessDivinePowerInput,
): ApplyHarnessDivinePowerResult {
  if (!isHarnessDivinePowerFeature(input.feature)) {
    return { ok: false, reason: 'Это не Праведное восстановление' }
  }

  const channel = input.resources.find((row) => row.id === input.channelResourceId) ?? null
  if (!channel) {
    return { ok: false, reason: 'Пул Божественного канала не найден' }
  }
  if (spendRemaining(channel) < 1) {
    return { ok: false, reason: 'Нет использований Божественного канала' }
  }

  const daily = findFeatureResource(
    input.resources,
    input.classSlug,
    HARNESS_DIVINE_POWER_POOL_ID,
    input.feature.classEntryId,
  )
  if (!daily) {
    return { ok: false, reason: 'Дневной пул Праведного восстановления ещё не синхронизирован' }
  }
  if (spendRemaining(daily) < 1) {
    return { ok: false, reason: 'Нет дневных применений Праведного восстановления' }
  }

  const cap = harnessDivinePowerSlotCap(input.proficiencyBonus)
  if (spentSlotLevels(input.slots, cap).length === 0) {
    return { ok: false, reason: `Нет потраченных ячеек круга 1–${cap}` }
  }

  const restored = restoreOneSpentSlot(input.slots, input.slotLevel, cap)
  if (!restored.ok) {
    return { ok: false, reason: restored.reason }
  }

  const spentDaily = spendFeatureUse({
    resources: input.resources,
    feature: input.feature,
    classSlug: input.classSlug,
  })
  if (!spentDaily.ok) {
    return { ok: false, reason: spentDaily.message }
  }

  const channelAfter = spentDaily.resources.find((row) => row.id === input.channelResourceId)
  if (!channelAfter || spendRemaining(channelAfter) < 1) {
    // Daily was only computed locally; do not publish partial state.
    return { ok: false, reason: 'Нет использований Божественного канала' }
  }

  const resources = spentDaily.resources.map((row) =>
    row.id === input.channelResourceId
      ? clampResource({ ...row, used: row.used + 1 })
      : row,
  )

  return {
    ok: true,
    resources,
    slots: restored.slots,
    message: `Праведное восстановление: ячейка ${Math.floor(input.slotLevel)} круга возвращена. Канал и дневной заряд потрачены.`,
  }
}
