/**
 * Spell cards that spend a feature charge or ki instead of a spell slot.
 */

import {
  findFeatureResource,
  spendPoolUses,
  spendRemaining,
} from '../../shared/dnd/featureResources'
import type { SheetResource } from '../../shared/dnd/rest'
import type { SheetSpell } from './spells'

function poolForSpend(resources: SheetResource[], spell: SheetSpell): SheetResource | null {
  const spend = spell.feature_spend
  if (!spend) return null
  const direct = findFeatureResource(
    resources,
    spend.classSlug,
    spend.poolId,
    spend.classEntryId,
  )
  if (direct) return direct
  return (
    resources.find(
      (row) =>
        row.id.endsWith(`:${spend.poolId}:${spend.classEntryId}`) ||
        row.id.includes(`:${spend.poolId}:`),
    ) ?? null
  )
}

export function featureCastOffer(spell: SheetSpell | null | undefined): {
  cost: number
  label: string
} | null {
  if (!spell || spell.cast_access !== 'feature' || !spell.feature_spend) return null
  return {
    cost: Math.max(1, spell.feature_spend.cost),
    label: spell.feature_spend.label,
  }
}

export function featureCastRemaining(
  resources: SheetResource[] | undefined,
  spell: SheetSpell | null | undefined,
): number {
  if (!resources || !spell) return 0
  const pool = poolForSpend(resources, spell)
  return spendRemaining(pool)
}

export function spendFeatureCast(input: {
  resources: SheetResource[]
  spell: SheetSpell
}): { ok: boolean; resources: SheetResource[]; message: string } {
  const spend = input.spell.feature_spend
  if (input.spell.cast_access !== 'feature' || !spend) {
    return { ok: false, resources: input.resources, message: 'Это не каст умения' }
  }
  const pool = poolForSpend(input.resources, input.spell)
  if (!pool) {
    return {
      ok: false,
      resources: input.resources,
      message: `Нет пула «${spend.label}»`,
    }
  }
  const parsed = pool.id.split(':')
  const classSlug = parsed[1] || spend.classSlug
  const classEntryId = parsed[parsed.length - 1] || spend.classEntryId
  const result = spendPoolUses({
    resources: input.resources,
    classSlug,
    poolId: spend.poolId,
    classEntryId,
    amount: spend.cost,
    label: spend.label,
  })
  if (!result.ok) {
    return { ok: false, resources: input.resources, message: result.message }
  }
  return {
    ok: true,
    resources: result.resources,
    message: `−${spend.cost} ${spend.label}`,
  }
}
