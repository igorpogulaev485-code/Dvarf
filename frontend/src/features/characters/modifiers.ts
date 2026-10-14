/** Named modifier stack (buffs / debuffs) for sheet stats. */

import { asRecord } from './sheetTypes'
import { evalFormula, type FormulaVars } from '../../shared/dnd/formulas'

export type BonusOp = '+' | '-' | '='

/** Where the bonus applies. AC slice first; more targets later. */
export type BonusTarget = 'ac'

export type BonusLine = {
  id: string
  target: BonusTarget
  label: string
  op: BonusOp
  /** Number or scalar formula, e.g. `1` or `[WIS]+2`. */
  expr: string
  enabled: boolean
  source: 'manual' | 'system' | 'gear'
}

const TARGETS = new Set<BonusTarget>(['ac'])
const OPS = new Set<BonusOp>(['+', '-', '='])

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `mod-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

export function createBonusLine(
  partial?: Partial<Omit<BonusLine, 'id'>> & { id?: string },
): BonusLine {
  return {
    id: partial?.id?.trim() || newId(),
    target: partial?.target === 'ac' ? 'ac' : 'ac',
    label: (partial?.label ?? '').trim() || 'Бонус',
    op: partial?.op && OPS.has(partial.op) ? partial.op : '+',
    expr: (partial?.expr ?? '1').trim() || '1',
    enabled: partial?.enabled !== false,
    source:
      partial?.source === 'system' || partial?.source === 'gear'
        ? partial.source
        : 'manual',
  }
}

export function normalizeBonusLines(raw: unknown): BonusLine[] {
  if (!Array.isArray(raw)) return []
  const out: BonusLine[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const target = item.target
    if (typeof target !== 'string' || !TARGETS.has(target as BonusTarget)) continue
    const op = item.op
    const expr = typeof item.expr === 'string' ? item.expr.trim() : ''
    if (!expr) continue
    out.push(
      createBonusLine({
        id: typeof item.id === 'string' ? item.id : undefined,
        target: target as BonusTarget,
        label: typeof item.label === 'string' ? item.label : 'Бонус',
        op: typeof op === 'string' && OPS.has(op as BonusOp) ? (op as BonusOp) : '+',
        expr,
        enabled: item.enabled !== false,
        source:
          item.source === 'system' || item.source === 'gear' ? item.source : 'manual',
      }),
    )
  }
  return out
}

export function readModifiers(sheet: Record<string, unknown>): BonusLine[] {
  return normalizeBonusLines(sheet.modifiers)
}

export function modifiersToSheet(modifiers: BonusLine[]): { modifiers: BonusLine[] } {
  return { modifiers: normalizeBonusLines(modifiers) }
}

export function bonusesForTarget(
  modifiers: BonusLine[],
  target: BonusTarget,
): BonusLine[] {
  return modifiers.filter((row) => row.target === target)
}

export type AppliedBonus = {
  line: BonusLine
  value: number
  ok: boolean
  error?: string
}

/** Apply enabled lines onto a base number. `=` overwrites then later +/- stack. */
export function applyBonusStack(
  base: number,
  lines: BonusLine[],
  vars: FormulaVars,
): { total: number; applied: AppliedBonus[] } {
  let total = Math.trunc(base)
  const applied: AppliedBonus[] = []
  for (const line of lines) {
    if (!line.enabled) continue
    const result = evalFormula(line.expr, vars)
    if (!result.ok) {
      applied.push({ line, value: 0, ok: false, error: result.error })
      continue
    }
    const value = result.value
    if (line.op === '=') total = value
    else if (line.op === '-') total -= value
    else total += value
    applied.push({ line, value, ok: true })
  }
  return { total: Math.trunc(total), applied }
}

export function formatBonusSummary(applied: AppliedBonus[]): string {
  return applied
    .filter((row) => row.ok && row.line.enabled)
    .map((row) => {
      const sign =
        row.line.op === '='
          ? '='
          : row.line.op === '-'
            ? '−'
            : '+'
      const name = row.line.label.trim() || 'бонус'
      return `${name} ${sign}${Math.abs(row.value)}`
    })
    .join(' · ')
}

export function patchModifierList(
  modifiers: BonusLine[],
  nextForTarget: BonusLine[],
  target: BonusTarget,
): BonusLine[] {
  const others = modifiers.filter((row) => row.target !== target)
  return [...others, ...normalizeBonusLines(nextForTarget)]
}

/** Soft-validate sheet object shape for tests. */
export function asModifierSheetPatch(raw: unknown): BonusLine[] {
  const sheet = asRecord(raw)
  return normalizeBonusLines(sheet.modifiers)
}
