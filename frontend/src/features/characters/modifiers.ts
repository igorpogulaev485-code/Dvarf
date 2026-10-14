/** Named modifier stack (buffs / debuffs) for sheet stats. */

import { asRecord, ABILITY_KEYS, type AbilityKey } from './sheetTypes'
import { evalFormula, type FormulaVars } from '../../shared/dnd/formulas'

export type BonusOp = '+' | '-' | '='

export type AbilityChannel = 'score' | 'check' | 'save'

/** Where the bonus applies. */
export type BonusTarget =
  | 'ac'
  | 'initiative'
  | 'spell_dc'
  | 'spell_attack'
  | `${AbilityKey}_score`
  | `${AbilityKey}_check`
  | `${AbilityKey}_save`

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

const ABILITY_TARGETS = new Set<BonusTarget>(
  ABILITY_KEYS.flatMap((key) => [
    `${key}_score` as BonusTarget,
    `${key}_check` as BonusTarget,
    `${key}_save` as BonusTarget,
  ]),
)
const TARGETS = new Set<BonusTarget>([
  'ac',
  'initiative',
  'spell_dc',
  'spell_attack',
  ...ABILITY_TARGETS,
])
const OPS = new Set<BonusOp>(['+', '-', '='])

export function abilityBonusTarget(
  ability: AbilityKey,
  channel: AbilityChannel,
): BonusTarget {
  return `${ability}_${channel}`
}

export function isBonusTarget(value: unknown): value is BonusTarget {
  return typeof value === 'string' && TARGETS.has(value as BonusTarget)
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `mod-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

export function createBonusLine(
  partial?: Partial<Omit<BonusLine, 'id'>> & { id?: string },
): BonusLine {
  const target = isBonusTarget(partial?.target) ? partial!.target : 'ac'
  return {
    id: partial?.id?.trim() || newId(),
    target,
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
    if (!isBonusTarget(item.target)) continue
    const expr = typeof item.expr === 'string' ? item.expr.trim() : ''
    if (!expr) continue
    out.push(
      createBonusLine({
        id: typeof item.id === 'string' ? item.id : undefined,
        target: item.target,
        label: typeof item.label === 'string' ? item.label : 'Бонус',
        op:
          typeof item.op === 'string' && OPS.has(item.op as BonusOp)
            ? (item.op as BonusOp)
            : '+',
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
        row.line.op === '=' ? '=' : row.line.op === '-' ? '−' : '+'
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

/** Apply score-channel buffs on top of gear-adjusted ability scores. */
export function applyAbilityScoreBonuses(
  scores: Record<AbilityKey, number>,
  modifiers: BonusLine[],
  vars: FormulaVars,
): Record<AbilityKey, number> {
  const out = { ...scores }
  for (const key of ABILITY_KEYS) {
    const lines = bonusesForTarget(modifiers, abilityBonusTarget(key, 'score'))
    if (lines.length === 0) continue
    const stacked = applyBonusStack(scores[key], lines, vars)
    out[key] = Math.min(30, Math.max(1, stacked.total))
  }
  return out
}

export function abilityCheckBonus(
  ability: AbilityKey,
  modifiers: BonusLine[],
  vars: FormulaVars,
): number {
  const lines = bonusesForTarget(modifiers, abilityBonusTarget(ability, 'check'))
  if (lines.length === 0) return 0
  return applyBonusStack(0, lines, vars).total
}

export function abilitySaveBonus(
  ability: AbilityKey,
  modifiers: BonusLine[],
  vars: FormulaVars,
): number {
  const lines = bonusesForTarget(modifiers, abilityBonusTarget(ability, 'save'))
  if (lines.length === 0) return 0
  return applyBonusStack(0, lines, vars).total
}

/** Flat stack on spell save DC / spell attack (on top of 8+PB+mod / PB+mod). */
export function spellCastBonus(
  target: 'spell_dc' | 'spell_attack',
  modifiers: BonusLine[],
  vars: FormulaVars,
): number {
  const lines = bonusesForTarget(modifiers, target)
  if (lines.length === 0) return 0
  return applyBonusStack(0, lines, vars).total
}

export function withSpellCastBonuses(input: {
  baseDc: number | null
  baseAttack: number | null
  modifiers: BonusLine[]
  vars: FormulaVars
}): { dc: number | null; attack: number | null } {
  const dcExtra = spellCastBonus('spell_dc', input.modifiers, input.vars)
  const atkExtra = spellCastBonus('spell_attack', input.modifiers, input.vars)
  return {
    dc: input.baseDc == null ? null : input.baseDc + dcExtra,
    attack: input.baseAttack == null ? null : input.baseAttack + atkExtra,
  }
}

/** Initiative total: override or DEX+feats, then BonusLine stack. */
export function withInitiativeBonus(input: {
  core: number
  modifiers: BonusLine[]
  vars: FormulaVars
}): { total: number; applied: AppliedBonus[] } {
  const lines = bonusesForTarget(input.modifiers, 'initiative')
  return applyBonusStack(input.core, lines, input.vars)
}
