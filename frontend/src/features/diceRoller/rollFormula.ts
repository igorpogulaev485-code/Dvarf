import { rollFairDie } from './fairRandom'
import { parseFormula } from './parseFormula'
import type {
  AdvantageMode,
  DieFaceResult,
  ParseOk,
  ParsedDieGroup,
  RollResult,
} from './types'

export type RollRng = (sides: number) => number

const defaultRng: RollRng = (sides) => rollFairDie(sides)

function natTag(sides: number, value: number): '20' | '1' | undefined {
  if (sides !== 20) return undefined
  if (value === 20) return '20'
  if (value === 1) return '1'
  return undefined
}

function rollGroup(
  group: ParsedDieGroup,
  rng: RollRng,
): { kept: DieFaceResult[]; dropped: DieFaceResult[]; sum: number } {
  const faces: DieFaceResult[] = []
  for (let i = 0; i < group.count; i += 1) {
    const value = rng(group.sides)
    faces.push({
      sides: group.sides,
      value,
      dropped: false,
      nat: natTag(group.sides, value),
    })
  }

  let keepMask = faces.map(() => true)
  if (group.keepHighest != null) {
    const indexed = faces.map((f, idx) => ({ f, idx }))
    indexed.sort((a, b) => b.f.value - a.f.value || a.idx - b.idx)
    const keep = new Set(indexed.slice(0, group.keepHighest).map((x) => x.idx))
    keepMask = faces.map((_, idx) => keep.has(idx))
  } else if (group.keepLowest != null) {
    const indexed = faces.map((f, idx) => ({ f, idx }))
    indexed.sort((a, b) => a.f.value - b.f.value || a.idx - b.idx)
    const keep = new Set(indexed.slice(0, group.keepLowest).map((x) => x.idx))
    keepMask = faces.map((_, idx) => keep.has(idx))
  }

  const kept: DieFaceResult[] = []
  const dropped: DieFaceResult[] = []
  let sum = 0
  faces.forEach((f, idx) => {
    if (keepMask[idx]) {
      kept.push(f)
      sum += f.value
    } else {
      dropped.push({ ...f, dropped: true })
    }
  })
  return { kept, dropped, sum }
}

/**
 * Apply advantage / disadvantage: requires exactly one plain d20 in the parse.
 * Rolls a second d20 and keeps high or low; the other is marked dropped.
 */
function withAdvantage(
  parsed: ParseOk,
  mode: AdvantageMode,
  rng: RollRng,
): RollResult | { error: string } {
  if (mode === 'none') {
    return rollParsed(parsed, 'none', rng)
  }
  if (!parsed.singleD20Eligible) {
    return { error: 'Нужна одна кость d20' }
  }

  const dice: DieFaceResult[] = []
  let total = 0
  let modifierTotal = 0
  let d20Done = false

  for (const term of parsed.terms) {
    if (term.kind === 'mod') {
      modifierTotal += term.value
      total += term.value
      continue
    }
    if (term.sides === 20 && term.count === 1 && !d20Done) {
      d20Done = true
      const a = rng(20)
      const b = rng(20)
      const keep = mode === 'advantage' ? Math.max(a, b) : Math.min(a, b)
      const drop = mode === 'advantage' ? Math.min(a, b) : Math.max(a, b)
      // Present kept first, then dropped (muted in UI).
      const keptFace: DieFaceResult = {
        sides: 20,
        value: keep,
        dropped: false,
        nat: natTag(20, keep),
      }
      const dropFace: DieFaceResult = {
        sides: 20,
        value: drop,
        dropped: true,
        nat: natTag(20, drop),
      }
      dice.push(keptFace, dropFace)
      total += term.sign * keep
      continue
    }
    const rolled = rollGroup(term, rng)
    for (const f of [...rolled.kept, ...rolled.dropped]) {
      dice.push(f)
    }
    total += term.sign * rolled.sum
  }

  return {
    expression: parsed.canonical,
    advantageMode: mode,
    total,
    dice,
    modifierTotal,
  }
}

function rollParsed(parsed: ParseOk, mode: AdvantageMode, rng: RollRng): RollResult {
  const dice: DieFaceResult[] = []
  let total = 0
  let modifierTotal = 0

  for (const term of parsed.terms) {
    if (term.kind === 'mod') {
      modifierTotal += term.value
      total += term.value
      continue
    }
    const rolled = rollGroup(term, rng)
    for (const f of [...rolled.kept, ...rolled.dropped]) {
      dice.push(f)
    }
    total += term.sign * rolled.sum
  }

  return {
    expression: parsed.canonical,
    advantageMode: mode,
    total,
    dice,
    modifierTotal,
  }
}

export function rollExpression(
  expression: string,
  advantageMode: AdvantageMode = 'none',
  rng: RollRng = defaultRng,
): { ok: true; result: RollResult } | { ok: false; message: string } {
  const parsed = parseFormula(expression)
  if (!parsed.ok) return { ok: false, message: parsed.message }
  if (parsed.totalDice === 0) {
    return { ok: false, message: 'Нужна хотя бы одна кость' }
  }
  const rolled = withAdvantage(parsed, advantageMode, rng)
  if ('error' in rolled) return { ok: false, message: rolled.error }
  return { ok: true, result: rolled }
}
