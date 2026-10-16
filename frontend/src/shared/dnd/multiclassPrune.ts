/** Drop multiclass rows that no longer meet PHB prerequisites. */

import {
  canTakeMulticlassLevel,
  type AbilityScores,
} from './multiclassRules'
import type { ClassLevelEntry } from './classLevels'

export type MulticlassPruneResult = {
  classes: ClassLevelEntry[]
  removed: ClassLevelEntry[]
  reasons: string[]
}

/**
 * Keep the primary (first) class always. For every other class row, require that
 * taking it as multiclass is still legal with current abilities + remaining names.
 */
export function pruneInvalidMulticlassRows(input: {
  classes: ClassLevelEntry[]
  abilities: AbilityScores
  /** Class entry id that must never be removed (origin / primary). */
  primaryClassEntryId?: string | null
}): MulticlassPruneResult {
  const primaryId =
    input.primaryClassEntryId ??
    input.classes.find((row) => row.name.trim())?.id ??
    null
  const kept: ClassLevelEntry[] = []
  const removed: ClassLevelEntry[] = []
  const reasons: string[] = []

  for (const row of input.classes) {
    if (!row.name.trim()) {
      kept.push(row)
      continue
    }
    if (primaryId && row.id === primaryId) {
      kept.push(row)
      continue
    }
    if (kept.length === 0) {
      // First named row becomes primary if primaryId missing.
      kept.push(row)
      continue
    }
    const check = canTakeMulticlassLevel({
      newClassName: row.name,
      currentClassNames: kept.map((item) => item.name),
      abilities: input.abilities,
    })
    if (check.ok) {
      kept.push(row)
    } else {
      removed.push(row)
      reasons.push(`${row.name}: ${check.reason}`)
    }
  }

  return { classes: kept, removed, reasons }
}
