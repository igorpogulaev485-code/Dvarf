/**
 * Scalar formulas for sheet modifiers (AC / ability stacks).
 * MVP: numbers, + − * /, parentheses, [VAR] placeholders. No dice / if().
 */

export type FormulaVars = Record<string, number>

export type FormulaEvalOk = { ok: true; value: number }
export type FormulaEvalErr = { ok: false; error: string }
export type FormulaEvalResult = FormulaEvalOk | FormulaEvalErr

const VAR_RE = /\[([A-Za-z_][A-Za-z0-9_]*)\]/g

export function extractFormulaVars(expr: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const match of expr.matchAll(VAR_RE)) {
    const key = match[1]!.toUpperCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

function substituteToText(expr: string, vars: FormulaVars): { ok: true; text: string } | FormulaEvalErr {
  let out = ''
  let last = 0
  for (const match of expr.matchAll(VAR_RE)) {
    const full = match[0]!
    const key = match[1]!.toUpperCase()
    const index = match.index ?? 0
    out += expr.slice(last, index)
    if (!(key in vars) || !Number.isFinite(vars[key]!)) {
      return { ok: false, error: `Нет показателя [${key}]` }
    }
    const n = vars[key]!
    out += n < 0 ? `(${n})` : String(n)
    last = index + full.length
  }
  out += expr.slice(last)
  return { ok: true, text: out }
}

/** Safe arithmetic evaluator (no identifiers / calls). */
export function evalArithmetic(expr: string): FormulaEvalResult {
  const cleaned = expr.replace(/\s+/g, '')
  if (!cleaned) return { ok: false, error: 'Пустая формула' }
  if (!/^[0-9+\-*/().]+$/.test(cleaned)) {
    return { ok: false, error: 'Только числа и + − * / ( )' }
  }
  try {
    // eslint-disable-next-line no-new-func -- constrained charset above
    const value = Function(`"use strict"; return (${cleaned});`)() as unknown
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { ok: false, error: 'Нечисловой результат' }
    }
    return { ok: true, value: Math.trunc(value) }
  } catch {
    return { ok: false, error: 'Не удалось посчитать' }
  }
}

export function evalFormula(expr: string, vars: FormulaVars = {}): FormulaEvalResult {
  const raw = expr.trim()
  if (!raw) return { ok: false, error: 'Пустая формула' }
  // Plain integer shortcut
  if (/^[+-]?\d+$/.test(raw)) {
    return { ok: true, value: Math.trunc(Number(raw)) }
  }
  const sub = substituteToText(raw, vars)
  if (!sub.ok) return sub
  return evalArithmetic(sub.text)
}

export type SheetVarDef = {
  key: string
  labelRu: string
  /** Short hint under the label. */
  hintRu?: string
}

/** Built-in variables for picker (mods + PB + level). */
export const SHEET_VAR_DEFS: SheetVarDef[] = [
  { key: 'STR', labelRu: 'Сила (мод)', hintRu: 'модификатор' },
  { key: 'DEX', labelRu: 'Ловкость (мод)', hintRu: 'модификатор' },
  { key: 'CON', labelRu: 'Телосложение (мод)', hintRu: 'модификатор' },
  { key: 'INT', labelRu: 'Интеллект (мод)', hintRu: 'модификатор' },
  { key: 'WIS', labelRu: 'Мудрость (мод)', hintRu: 'модификатор' },
  { key: 'CHA', labelRu: 'Харизма (мод)', hintRu: 'модификатор' },
  { key: 'PROF', labelRu: 'Бонус мастерства', hintRu: 'БМ' },
  { key: 'HALF_PROF', labelRu: '½ БМ (вниз)', hintRu: 'floor(БМ/2)' },
  { key: 'LVL', labelRu: 'Уровень персонажа', hintRu: 'сумма классов' },
]

export function buildSheetFormulaVars(input: {
  mods: Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', number>
  proficiencyBonus: number
  level: number
}): FormulaVars {
  const pb = Math.trunc(input.proficiencyBonus)
  return {
    STR: Math.trunc(input.mods.str),
    DEX: Math.trunc(input.mods.dex),
    CON: Math.trunc(input.mods.con),
    INT: Math.trunc(input.mods.int),
    WIS: Math.trunc(input.mods.wis),
    CHA: Math.trunc(input.mods.cha),
    PROF: pb,
    HALF_PROF: Math.floor(pb / 2),
    LVL: Math.max(1, Math.trunc(input.level)),
  }
}
