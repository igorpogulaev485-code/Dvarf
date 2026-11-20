/**
 * Helpers for deferred physical-dice paths (smite, breath, HD, death save, etc.).
 * EnterOwnNumberDialog does the UI; callers spend resources only on confirm.
 */

import { divineSmiteDice, type DivineSmiteDice } from './divineSmite'
import type { FeatureSlotSpendDef } from '../../shared/dnd/classFeatures'

/** Smite formula for EnterOwn — crit doubles dice count (same as rollDamage crit). */
export function divineSmiteEnterOwnFormula(input: {
  spend: FeatureSlotSpendDef
  slotLevel: number
  vsUndeadOrFiend: boolean
  crit: boolean
}): { formula: string; formulaRu: string; dice: DivineSmiteDice } {
  const dice = divineSmiteDice(input)
  const n = input.crit ? dice.totalDice * 2 : dice.totalDice
  const formulaRu = `${n}к${dice.diceSize}`
  return {
    dice,
    formulaRu,
    formula: `${formulaRu} излучением`,
  }
}

/** Build radiant chip after physical smite faces are known. */
export function formatDivineSmitePhysicalChip(input: {
  total: number
  formulaRu: string
  vsUndeadOrFiend: boolean
  crit: boolean
}): { line: string; chip: string } {
  const vs = input.vsUndeadOrFiend ? ', нежить/исчадие' : ''
  const critNote = input.crit ? ', крит' : ''
  const vsChip = input.vsUndeadOrFiend ? ' · нежить' : ''
  const critChip = input.crit ? ' · крит' : ''
  return {
    line: ` + ${input.total} излучением (Божественная кара, ${input.formulaRu}${vs}${critNote})`,
    chip: `${input.total} излучением · ${input.formulaRu}${vsChip}${critChip}`,
  }
}

/** Hit-die EnterOwn: face only; CON added by caller (same as average path). */
export function hitDieEnterOwnFormula(die: string): string {
  const m = String(die).trim().match(/^к?(\d+)$/i) || String(die).trim().match(/^[dк](\d+)$/i)
  const sides = m ? Number(m[1]) : Number(String(die).replace(/\D/g, ''))
  const n = Number.isFinite(sides) && sides >= 2 ? sides : 8
  return `1к${n}`
}

/** Apply death-save face (1 / 10+ / 20 rules) — shared by header / HP pad / mobile. */
export function applyDeathSaveFace(input: {
  face: number
  successes: number
  fails: number
  onCombatChange: (patch: { hpCurrent?: number | null }) => void
  onPlayChange: (play: {
    isDying: boolean
    deathSuccesses: number
    deathFails: number
    [key: string]: unknown
  }) => void
  play: {
    isDying: boolean
    deathSuccesses: number
    deathFails: number
    [key: string]: unknown
  }
  onToast: (message: string) => void
  resolveDeathSaveRoll: (
    die: number,
    successes: number,
    fails: number,
  ) => {
    successes: number
    fails: number
    revived: boolean
    stabilized: boolean
    note: string
  }
  stabilizePlayPatch: () => Record<string, unknown>
}): void {
  const face = Math.max(1, Math.min(20, Math.floor(input.face)))
  const result = input.resolveDeathSaveRoll(
    face,
    input.successes,
    input.fails,
  )
  const diceNote = `к20=${face}`
  if (result.revived) {
    input.onCombatChange({ hpCurrent: 1 })
    input.onPlayChange({ ...input.play, ...input.stabilizePlayPatch() })
    input.onToast(`${result.note} · ${diceNote}`)
    return
  }
  if (result.stabilized) {
    input.onPlayChange({ ...input.play, ...input.stabilizePlayPatch() })
    input.onToast(`${result.note} · ${diceNote}`)
    return
  }
  input.onPlayChange({
    ...input.play,
    isDying: true,
    deathSuccesses: result.successes,
    deathFails: result.fails,
  })
  input.onToast(`${result.note} · ${diceNote}`)
}
