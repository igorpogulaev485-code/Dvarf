/**
 * Edition-aware exhaustion helpers. 2014 = PHB ladder; 2024 = SRD 5.2.1 penalty.
 */

import { conditionLevelLabel } from './conditions'
import {
  clampExhaustionLevel,
  exhaustionHpCurrent,
  exhaustionHpMax,
  exhaustionHpNote,
  exhaustionRollFlags,
  exhaustionSpeedFt,
  exhaustionSpeedNote,
} from './exhaustion2014'
import {
  clampExhaustionLevel2024,
  exhaustionD20Penalty2024,
  exhaustionHpCurrent2024,
  exhaustionHpMax2024,
  exhaustionHpNote2024,
  exhaustionLevelLabel2024,
  exhaustionRollFlags2024,
  exhaustionSpeedFt2024,
  exhaustionSpeedNote2024,
} from './exhaustion2024'

export type RulesEditionLike = '2014' | '2024' | string

export type ExhaustionEdition = RulesEditionLike | null | undefined

function is2024(edition: ExhaustionEdition): boolean {
  return String(edition ?? '2014').trim() === '2024'
}

export function clampExhaustionLevelForEdition(
  level: number,
  edition?: ExhaustionEdition,
): number {
  return is2024(edition) ? clampExhaustionLevel2024(level) : clampExhaustionLevel(level)
}

export function exhaustionSpeedFtForEdition(
  speed: number | null,
  level: number,
  edition?: ExhaustionEdition,
): number | null {
  return is2024(edition)
    ? exhaustionSpeedFt2024(speed, level)
    : exhaustionSpeedFt(speed, level)
}

export function exhaustionHpMaxForEdition(
  hpMax: number | null,
  level: number,
  edition?: ExhaustionEdition,
): number | null {
  return is2024(edition)
    ? exhaustionHpMax2024(hpMax, level)
    : exhaustionHpMax(hpMax, level)
}

export function exhaustionHpCurrentForEdition(
  hpCurrent: number | null,
  hpMax: number | null,
  level: number,
  edition?: ExhaustionEdition,
): number | null {
  return is2024(edition)
    ? exhaustionHpCurrent2024(hpCurrent, hpMax, level)
    : exhaustionHpCurrent(hpCurrent, hpMax, level)
}

export function exhaustionSpeedNoteForEdition(
  level: number,
  edition?: ExhaustionEdition,
): string | null {
  return is2024(edition)
    ? exhaustionSpeedNote2024(level)
    : exhaustionSpeedNote(level)
}

export function exhaustionHpNoteForEdition(
  level: number,
  edition?: ExhaustionEdition,
): string | null {
  return is2024(edition) ? exhaustionHpNote2024(level) : exhaustionHpNote(level)
}

export function exhaustionStageLabelForEdition(
  level: number,
  edition?: ExhaustionEdition,
): string | null {
  if (is2024(edition)) return exhaustionLevelLabel2024(level)
  return level > 0 ? conditionLevelLabel('exhaustion', level) : null
}

export function exhaustionRollFlagsForEdition(
  level: number,
  edition?: ExhaustionEdition,
): {
  d20Penalty: number
  disadvantageOnChecks: boolean
  disadvantageOnAttacksAndSaves: boolean
} {
  if (is2024(edition)) return exhaustionRollFlags2024(level)
  const flags = exhaustionRollFlags(level)
  return { d20Penalty: 0, ...flags }
}

export function exhaustionD20PenaltyForEdition(
  level: number,
  edition?: ExhaustionEdition,
): number {
  return is2024(edition) ? exhaustionD20Penalty2024(level) : 0
}
