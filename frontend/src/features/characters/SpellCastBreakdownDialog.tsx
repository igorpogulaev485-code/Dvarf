import { useRef, useState } from 'react'
import type { FormulaVars } from '../../shared/dnd/formulas'
import { Dialog, Text } from '../../ui'
import { BonusRow } from './BonusRow'
import {
  applyBonusStack,
  bonusesForTarget,
  createBonusLine,
  formatBonusSummary,
  type BonusLine,
  type BonusTarget,
} from './modifiers'
import { formatModifier } from './sheetTypes'
import { VariablePicker } from './VariablePicker'

type SpellCastBreakdownDialogProps = {
  open: boolean
  /** Which section to focus when opening. */
  focus?: 'spell_dc' | 'spell_attack'
  baseDc: number
  baseAttack: number
  /** Short base formula hint, e.g. «8+БМ+МУД». */
  baseHint: string
  formulaVars: FormulaVars
  modifiers: BonusLine[]
  onModifiersChange: (next: BonusLine[]) => void
  onClose: () => void
}

function insertToken(expr: string, token: string, caret: number | null): string {
  const trimmed = expr.trim()
  if (!trimmed) return token
  if (caret == null || caret < 0 || caret > expr.length) {
    const needsOp = /[0-9)]$/.test(trimmed) && !/^[+\-*/)]$/.test(token)
    return needsOp ? `${trimmed}+${token}` : `${trimmed}${token}`
  }
  return `${expr.slice(0, caret)}${token}${expr.slice(caret)}`
}

export function SpellCastBreakdownDialog({
  open,
  focus = 'spell_dc',
  baseDc,
  baseAttack,
  baseHint,
  formulaVars,
  modifiers,
  onModifiersChange,
  onClose,
}: SpellCastBreakdownDialogProps) {
  const dcLines = bonusesForTarget(modifiers, 'spell_dc')
  const atkLines = bonusesForTarget(modifiers, 'spell_attack')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sessionOpen, setSessionOpen] = useState(false)
  const [sessionFocus, setSessionFocus] = useState(focus)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  if (open !== sessionOpen || (open && focus !== sessionFocus)) {
    setSessionOpen(open)
    setSessionFocus(focus)
    if (open) {
      const pool = focus === 'spell_attack' ? atkLines : dcLines
      setActiveId(pool[0]?.id ?? null)
    } else {
      setActiveId(null)
    }
  }

  const dcStack = applyBonusStack(baseDc, dcLines, formulaVars)
  const atkStack = applyBonusStack(baseAttack, atkLines, formulaVars)
  const dcHint = formatBonusSummary(dcStack.applied)
  const atkHint = formatBonusSummary(atkStack.applied)

  function patchLine(id: string, patch: Partial<BonusLine>) {
    onModifiersChange(
      modifiers.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )
  }

  function removeLine(id: string) {
    onModifiersChange(modifiers.filter((row) => row.id !== id))
    if (activeId === id) setActiveId(null)
  }

  function addLine(target: BonusTarget) {
    const line = createBonusLine({
      target,
      label: 'Бонус',
      op: '+',
      expr: '1',
      enabled: true,
      source: 'manual',
    })
    onModifiersChange([...modifiers, line])
    setActiveId(line.id)
    queueMicrotask(() => inputRefs.current[line.id]?.focus())
  }

  function pickVariable(token: string) {
    const targetId =
      activeId ??
      (focus === 'spell_attack'
        ? atkLines[atkLines.length - 1]?.id
        : dcLines[dcLines.length - 1]?.id)
    if (!targetId) {
      const line = createBonusLine({
        target: focus,
        label: 'Бонус',
        op: '+',
        expr: token,
        enabled: true,
        source: 'manual',
      })
      onModifiersChange([...modifiers, line])
      setActiveId(line.id)
      return
    }
    const row = modifiers.find((item) => item.id === targetId)
    if (!row) return
    const el = inputRefs.current[targetId]
    const caret = el?.selectionStart ?? null
    const next = insertToken(row.expr, token, caret)
    patchLine(targetId, { expr: next })
    setActiveId(targetId)
    queueMicrotask(() => {
      const input = inputRefs.current[targetId]
      if (!input) return
      input.focus()
      const pos = (caret ?? row.expr.length) + token.length
      input.setSelectionRange(pos, pos)
    })
  }

  function renderRows(lines: BonusLine[], target: BonusTarget) {
    return (
      <div className="ac-breakdown__bonuses">
        {lines.map((line) => (
          <BonusRow
            key={line.id}
            line={line}
            vars={formulaVars}
            active={activeId === line.id}
            onActivate={() => setActiveId(line.id)}
            onChange={(patch) => patchLine(line.id, patch)}
            onRemove={() => removeLine(line.id)}
            formulaInputRef={(el) => {
              inputRefs.current[line.id] = el
            }}
          />
        ))}
        <button
          type="button"
          className="ac-breakdown__add"
          onClick={() => addLine(target)}
        >
          + Добавить бонус
        </button>
      </div>
    )
  }

  return (
    <Dialog
      open={open}
      title="Заклинания: сл. спас. и атака"
      size="wide"
      primaryLabel="Готово"
      secondaryLabel="Закрыть"
      onPrimary={onClose}
      onSecondary={onClose}
    >
      <div className="ac-breakdown">
        <div className="ac-breakdown__hero">
          <div className="ac-breakdown__hero-text">
            <Text tone="muted" className="ac-breakdown__summary">
              {baseHint}
              {dcHint ? ` · ${dcHint}` : ''}
              {atkHint ? ` · ${atkHint}` : ''}
            </Text>
          </div>
          <div className="spell-cast-breakdown__badges">
            <div className="ac-breakdown__badge" aria-label={`Сл. спас. ${dcStack.total}`}>
              <b>{dcStack.total}</b>
              <span>сл. спас.</span>
            </div>
            <div
              className="ac-breakdown__badge"
              aria-label={`Атака ${formatModifier(atkStack.total)}`}
            >
              <b>{formatModifier(atkStack.total)}</b>
              <span>атака</span>
            </div>
          </div>
        </div>

        <section className="ac-breakdown__section">
          <h3 className="ac-breakdown__label">Сл. спасброска</h3>
          <div className="ac-breakdown__base">
            База {baseDc} · 8+БМ+мод
          </div>
          {renderRows(dcLines, 'spell_dc')}
        </section>

        <section className="ac-breakdown__section">
          <h3 className="ac-breakdown__label">Атака заклинанием</h3>
          <div className="ac-breakdown__base">
            База {formatModifier(baseAttack)} · БМ+мод
          </div>
          {renderRows(atkLines, 'spell_attack')}
        </section>

        <VariablePicker vars={formulaVars} onPick={pickVariable} />
      </div>
    </Dialog>
  )
}
