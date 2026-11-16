/**
 * 2024 caster budgets come from the class table (cantrips / prepared per level),
 * not from the 2014 «ability mod + level» prepare formula.
 */
import type { ClassLevelEntry } from './classLevels'
import type { SpellLearnBudget } from './casterProgression'
import { computeProgression2024 } from './edition2024Classes'

export function is2024Edition(edition: string | null | undefined): boolean {
  return String(edition ?? '2014').trim() === '2024'
}

type PreparedRow = { cantrips: number; prepared_spells: number }

function tableByClass2024(classes: ClassLevelEntry[]): Map<string, PreparedRow> {
  const rows = classes.filter((row) => row.name.trim() && row.level > 0)
  const out = new Map<string, PreparedRow>()
  if (rows.length === 0) return out
  const snap = computeProgression2024({ classes: rows })
  for (const block of snap.spellcasting) {
    out.set(block.class_slug, {
      cantrips: block.cantrips,
      prepared_spells: block.prepared_spells,
    })
  }
  return out
}

/**
 * Overlay 2024 table cantrips / prepare cap.
 * PHB 2024 prepared casters (sorcerer, …) still resolve as 2014 `known` in the
 * base tables — flip them to `prepared_list` when the 2024 row has prepared_spells.
 */
export function overlayLearnBudgets2024(
  budgets: SpellLearnBudget[],
  classes: ClassLevelEntry[],
): SpellLearnBudget[] {
  const table = tableByClass2024(classes)
  if (table.size === 0) return budgets
  return budgets.map((row) => {
    const hit = table.get(row.slug)
    if (!hit) return row
    if (hit.prepared_spells > 0 && row.mode === 'known') {
      return {
        ...row,
        mode: 'prepared_list' as const,
        cantrips: hit.cantrips,
        leveledKnown: null,
        maxPrepared: hit.prepared_spells,
      }
    }
    if (row.mode === 'known') return row
    return {
      ...row,
      cantrips: hit.cantrips,
      maxPrepared: hit.prepared_spells > 0 ? hit.prepared_spells : row.maxPrepared,
    }
  })
}

export function overlayLearnBudget2024(
  budget: SpellLearnBudget | null,
  classes: ClassLevelEntry[],
): SpellLearnBudget | null {
  if (!budget) return budget
  return overlayLearnBudgets2024([budget], classes)[0] ?? budget
}
