/**
 * Pure rest preview lines (UX-18 / B19).
 * Numbers come from the same applyShortRest / applyLongRest as the real apply.
 */

import type { ActiveEffect } from '../../shared/dnd/activeEffects'
import type { ClassHitDicePool } from '../../shared/dnd/classHitDice'
import {
  applyLongRest,
  applyShortRest,
  resourceShownCurrent,
  type RestResult,
  type SheetResource,
} from '../../shared/dnd/rest'
import type { SpellSlotState } from '../../shared/dnd/spells'

export type RestSummaryLine = string

function slotsUsedTotal(slots: Record<string, SpellSlotState>): number {
  let used = 0
  for (const slot of Object.values(slots)) {
    used += Math.max(0, Math.floor(slot.used ?? 0))
  }
  return used
}

function slotsMaxTotal(slots: Record<string, SpellSlotState>): number {
  let max = 0
  for (const slot of Object.values(slots)) {
    max += Math.max(0, Math.floor(slot.max ?? 0))
  }
  return max
}

function shortResetSpentNames(resources: SheetResource[]): string[] {
  return resources
    .filter((row) => row.reset === 'short' && row.used > 0)
    .map((row) => row.name.trim() || row.id)
}

function resourceRecoverLines(
  before: SheetResource[],
  after: SheetResource[],
): string[] {
  const afterById = new Map(after.map((row) => [row.id, row]))
  const lines: string[] = []
  for (const prev of before) {
    const next = afterById.get(prev.id)
    if (!next) continue
    const from = resourceShownCurrent(prev)
    const to = resourceShownCurrent(next)
    if (from === to && prev.used === next.used) continue
    lines.push(`${prev.name.trim() || prev.id}: ${from} → ${to}`)
  }
  return lines
}

export function buildHitDieHealPreview(input: {
  hpCurrent: number | null
  hpMax: number | null
  healAmount: number
}): { before: number; after: number; amount: number; line: string } | null {
  if (input.hpMax == null) return null
  const amount = Math.max(0, Math.floor(input.healAmount))
  const before = Math.max(0, Math.floor(input.hpCurrent ?? 0))
  const after = Math.min(input.hpMax, before + amount)
  return {
    before,
    after,
    amount,
    line: `Хиты ${before} → ${after}/${input.hpMax} (+${amount})`,
  }
}

export function buildShortRestResourcesSummary(input: {
  resources: SheetResource[]
  pact_slots?: { max: number; used: number; level: number } | null
  effects?: ActiveEffect[]
}): { lines: RestSummaryLine[]; result: ReturnType<typeof applyShortRest> } {
  const result = applyShortRest({
    resources: input.resources,
    pact_slots: input.pact_slots,
    effects: input.effects,
  })
  const lines: RestSummaryLine[] = []
  const spent = shortResetSpentNames(input.resources)
  if (spent.length) {
    lines.push(`Ресурсы «короткий»: восстановятся (${spent.join(', ')})`)
  } else {
    lines.push('Ресурсы «короткий»: нечего сбрасывать')
  }
  const pact = input.pact_slots
  if (pact && pact.max > 0) {
    lines.push(
      `Ячейки договора: ${Math.max(0, pact.max - pact.used)}/${pact.max} → ${pact.max}/${pact.max}`,
    )
  }
  const removed = result.removed_effects?.length ?? 0
  if (removed) {
    lines.push(`Снимется эффектов: ${removed}`)
  }
  for (const row of resourceRecoverLines(input.resources, result.resources)) {
    if (!lines.some((line) => line.startsWith(row.split(':')[0]!))) {
      lines.push(row)
    }
  }
  return { lines, result }
}

export function buildLongRestSummary(input: {
  resources: SheetResource[]
  slots: Record<string, SpellSlotState>
  pact_slots: { max: number; used: number; level: number } | null
  exhaustion: number
  hp_current: number | null
  hp_max: number | null
  hp_temp: number
  hit_dice_current: number
  hit_dice_max: number
  hit_dice_by_class?: ClassHitDicePool[]
  effects?: ActiveEffect[]
  rng?: () => number
}): {
  lines: RestSummaryLine[]
  result: RestResult & { effects?: ActiveEffect[]; removed_effects?: ActiveEffect[] }
} {
  const result = applyLongRest({
    resources: input.resources,
    slots: input.slots,
    pact_slots: input.pact_slots,
    exhaustion: input.exhaustion,
    hp_max: input.hp_max,
    hit_dice_current: input.hit_dice_current,
    hit_dice_max: input.hit_dice_max,
    hit_dice_by_class: input.hit_dice_by_class,
    effects: input.effects,
    rng: input.rng,
  })
  const lines: RestSummaryLine[] = []
  if (input.hp_max != null) {
    const before = Math.max(0, Math.floor(input.hp_current ?? 0))
    const after = Math.max(0, Math.floor(result.hp_current ?? input.hp_max))
    lines.push(`Хиты ${before} → ${after}`)
  }
  if (input.hp_temp > 0) {
    lines.push(`Временные хиты ${input.hp_temp} → 0`)
  }
  const diceBefore = input.hit_dice_current
  const diceAfter = result.hit_dice_current ?? diceBefore
  lines.push(`Кости хитов ${diceBefore} → ${diceAfter}/${input.hit_dice_max}`)

  const slotUsed = slotsUsedTotal(input.slots)
  const slotMax = slotsMaxTotal(input.slots)
  if (slotMax > 0) {
    lines.push(`Ячейки заклинаний: потрачено ${slotUsed} → 0 (из ${slotMax})`)
  }
  const pact = input.pact_slots
  if (pact && pact.max > 0) {
    lines.push(
      `Ячейки договора: ${Math.max(0, pact.max - pact.used)}/${pact.max} → ${pact.max}/${pact.max}`,
    )
  }
  if (input.exhaustion > 0) {
    lines.push(`Истощение ${input.exhaustion} → ${result.exhaustion ?? 0}`)
  }
  const resourceLines = resourceRecoverLines(input.resources, result.resources)
  // Prefer dawn/midnight rechargeLines (with dice) when present; skip duplicate id lines.
  const recharge = result.rechargeLines ?? []
  for (const line of recharge) {
    lines.push(line)
  }
  for (const row of resourceLines) {
    const name = row.split(':')[0]!.trim()
    if (recharge.some((line) => line.startsWith(name))) continue
    // Skip dawn/midnight already covered by rechargeLines
    const before = input.resources.find((r) => (r.name.trim() || r.id) === name)
    if (before && (before.reset === 'dawn' || before.reset === 'midnight')) continue
    lines.push(row)
  }
  const removed = result.removed_effects?.length ?? 0
  if (removed) {
    lines.push(`Снимется эффектов: ${removed}`)
  }
  lines.push('Спасброски смерти и концентрация сбросятся')
  return { lines, result }
}
