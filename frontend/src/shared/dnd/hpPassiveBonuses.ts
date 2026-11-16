/**
 * PHB 2014 passive +HP-per-level traits:
 * - Draconic Resilience (Sorcerer): +1 max HP per sorcerer level
 * - Dwarven Toughness (Hill/Gold Dwarf): +1 max HP per character level
 *
 * These are tracked in sheet.passive_hp_bonuses so create / level-up / open
 * can stay in sync without double-counting or clobbering manual totals.
 */

import {
  buildMaxHpByLevels,
  isDraconicSorcererClass,
} from './multiclassRules'
import { type ClassLevelEntry } from './classLevels'
import { applyHpDelta } from './constitutionHp'

export type PassiveHpBonuses = {
  /** HP already baked from Draconic Resilience. */
  draconic: number
  /** HP already baked from Dwarven Toughness. */
  dwarven: number
}

export type HpLevelExtras = {
  draconicResilience?: boolean
  dwarvenToughness?: boolean
}

/** Hill Dwarf + SCAG Gold Dwarf (same toughness trait). */
export function hasDwarvenToughness(raceSlug?: string | null): boolean {
  const slug = (raceSlug || '').trim()
  return slug === 'hill_dwarf' || slug === 'gold_dwarf'
}

export function sorcererLevels(
  classes: Array<{ name: string; level: number }>,
): number {
  return classes.reduce((sum, row) => {
    if (!isDraconicSorcererClass(row.name)) return sum
    return sum + Math.max(0, Math.floor(row.level))
  }, 0)
}

export function expectedPassiveHpBonuses(input: {
  classes: Array<{ name: string; level: number }>
  draconicResilience: boolean
  raceSlug?: string | null
}): PassiveHpBonuses {
  const total = Math.max(
    0,
    input.classes.reduce((sum, row) => sum + Math.max(0, Math.floor(row.level)), 0),
  )
  return {
    draconic: input.draconicResilience ? sorcererLevels(input.classes) : 0,
    dwarven: hasDwarvenToughness(input.raceSlug) ? total : 0,
  }
}

export function passiveHpBonusTotal(bonuses: PassiveHpBonuses): number {
  return Math.max(0, Math.floor(bonuses.draconic)) + Math.max(0, Math.floor(bonuses.dwarven))
}

export function readPassiveHpBonuses(raw: unknown): PassiveHpBonuses | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const draconic = row.draconic ?? row.draconic_resilience
  const dwarven = row.dwarven ?? row.dwarven_toughness
  if (typeof draconic !== 'number' || typeof dwarven !== 'number') return null
  if (!Number.isFinite(draconic) || !Number.isFinite(dwarven)) return null
  return {
    draconic: Math.max(0, Math.floor(draconic)),
    dwarven: Math.max(0, Math.floor(dwarven)),
  }
}

export function passiveHpBonusesEqual(
  a: PassiveHpBonuses | null | undefined,
  b: PassiveHpBonuses | null | undefined,
): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  return a.draconic === b.draconic && a.dwarven === b.dwarven
}

/**
 * Safe open/bootstrap: only auto-bump when current max HP matches the
 * average-rules baseline that is missing the passive bonus(es). Manual or
 * rolled totals that do not match average baselines are left alone; ledger is
 * still set to expected so later level sync does not double-add.
 */
export function reconcilePassiveHpBonuses(input: {
  hpMax: number
  classes: Array<{ name: string; level: number }>
  constitutionMod: number
  draconicResilience: boolean
  raceSlug?: string | null
  /** Tough feat etc. already baked into hpMax (+N × total level). */
  featHpPerLevel?: number
  ledger: PassiveHpBonuses | null
}): {
  delta: number
  ledger: PassiveHpBonuses
  matchedAverage: boolean
} {
  const expected = expectedPassiveHpBonuses({
    classes: input.classes,
    draconicResilience: input.draconicResilience,
    raceSlug: input.raceSlug,
  })

  const featExtra =
    Math.max(0, Math.floor(input.featHpPerLevel ?? 0)) *
    Math.max(
      0,
      input.classes.reduce((sum, row) => sum + Math.max(0, Math.floor(row.level)), 0),
    )

  const builtWithout = buildMaxHpByLevels({
    classes: input.classes,
    constitutionMod: input.constitutionMod,
    draconicResilience: false,
    dwarvenToughness: false,
  })
  const without = builtWithout ? builtWithout.total + featExtra : null
  const withBoth =
    without == null ? null : without + expected.draconic + expected.dwarven
  const hp = Math.floor(input.hpMax)

  if (input.ledger) {
    const rawDelta =
      expected.draconic -
      input.ledger.draconic +
      (expected.dwarven - input.ledger.dwarven)
    if (rawDelta === 0) {
      return { delta: 0, ledger: expected, matchedAverage: false }
    }
    // HP already rebuilt to full expected (e.g. Max HP dialog) — only pin ledger.
    if (withBoth != null && hp === withBoth) {
      return { delta: 0, ledger: expected, matchedAverage: true }
    }
    // Average baseline still matches previous ledger — safe to apply delta.
    if (without != null) {
      const withLedger = without + input.ledger.draconic + input.ledger.dwarven
      if (hp === withLedger) {
        return { delta: rawDelta, ledger: expected, matchedAverage: true }
      }
    }
    // Level-up/create already baked the new bonus into hpMax and should have
    // written ledger in the same draft update. If we still see a gap (subclass
    // picked later, race changed), apply the delta even for non-average totals.
    return { delta: rawDelta, ledger: expected, matchedAverage: false }
  }

  if (without == null || withBoth == null) {
    // Cannot compare — assume bonuses already present.
    return { delta: 0, ledger: expected, matchedAverage: false }
  }

  const withDraconic = without + expected.draconic
  const withDwarven = without + expected.dwarven

  if (hp === withBoth) {
    return { delta: 0, ledger: expected, matchedAverage: true }
  }
  if (hp === without) {
    return {
      delta: expected.draconic + expected.dwarven,
      ledger: expected,
      matchedAverage: true,
    }
  }
  if (hp === withDraconic && expected.dwarven > 0) {
    return { delta: expected.dwarven, ledger: expected, matchedAverage: true }
  }
  if (hp === withDwarven && expected.draconic > 0) {
    return { delta: expected.draconic, ledger: expected, matchedAverage: true }
  }

  // Manual / rolled / buffed: do not change HP; pin ledger so future syncs
  // only apply real deltas (new levels, race/subclass change).
  return { delta: 0, ledger: expected, matchedAverage: false }
}

export function applyPassiveHpReconcile(input: {
  hpMax: number | null
  hpCurrent: number | null
  classes: ClassLevelEntry[]
  constitutionMod: number
  draconicResilience: boolean
  raceSlug?: string | null
  featHpPerLevel?: number
  ledger: PassiveHpBonuses | null
}): {
  hpMax: number | null
  hpCurrent: number | null
  ledger: PassiveHpBonuses
  delta: number
} {
  if (input.hpMax == null) {
    const expected = expectedPassiveHpBonuses({
      classes: input.classes,
      draconicResilience: input.draconicResilience,
      raceSlug: input.raceSlug,
    })
    return {
      hpMax: input.hpMax,
      hpCurrent: input.hpCurrent,
      ledger: expected,
      delta: 0,
    }
  }

  const result = reconcilePassiveHpBonuses({
    hpMax: input.hpMax,
    classes: input.classes,
    constitutionMod: input.constitutionMod,
    draconicResilience: input.draconicResilience,
    raceSlug: input.raceSlug,
    featHpPerLevel: input.featHpPerLevel,
    ledger: input.ledger,
  })

  const next = applyHpDelta({
    hpMax: input.hpMax,
    hpCurrent: input.hpCurrent,
    delta: result.delta,
  })

  return {
    hpMax: next.hpMax,
    hpCurrent: next.hpCurrent,
    ledger: result.ledger,
    delta: result.delta,
  }
}

/** Convenience for level-up / level-down gain extras. */
export function hpExtrasForClassLevel(input: {
  className: string
  draconicResilience: boolean
  dwarvenToughness: boolean
}): HpLevelExtras {
  return {
    draconicResilience:
      Boolean(input.draconicResilience) && isDraconicSorcererClass(input.className),
    dwarvenToughness: Boolean(input.dwarvenToughness),
  }
}

