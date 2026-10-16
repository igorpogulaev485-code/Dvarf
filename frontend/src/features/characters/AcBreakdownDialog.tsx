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
} from './modifiers'
import { VariablePicker } from './VariablePicker'

type AcBreakdownDialogProps = {
  open: boolean
  /** Final AC (with shield, style, gear, active bonuses). */
  totalAc: number
  /** Header subtitle — armor · shield · style · etc. */
  summary: string
  /** Read-only base line under «База». */
  baseLabel: string
  shieldBonus: number
  shieldInHand: boolean
  shieldAvailable: boolean
  onToggleShield: () => void
  formulaVars: FormulaVars
  /** All sheet modifiers; dialog edits only `ac` rows. */
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

export function AcBreakdownDialog({
  open,
  totalAc,
  summary,
  baseLabel,
  shieldBonus,
  shieldInHand,
  shieldAvailable,
  onToggleShield,
  formulaVars,
  modifiers,
  onModifiersChange,
  onClose,
}: AcBreakdownDialogProps) {
  const acLines = bonusesForTarget(modifiers, 'ac')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sessionOpen, setSessionOpen] = useState(false)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const caretRef = useRef<number | null>(null)

  // Reset selection when the dialog opens / closes (derive during render).
  if (open !== sessionOpen) {
    setSessionOpen(open)
    caretRef.current = null
    if (open) {
      setActiveId(acLines[0]?.id ?? null)
    } else {
      setActiveId(null)
    }
  }

  const bonusHint = formatBonusSummary(
    applyBonusStack(0, acLines, formulaVars).applied,
  )

  function patchLine(id: string, patch: Partial<BonusLine>) {
    onModifiersChange(
      modifiers.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )
  }

  function removeLine(id: string) {
    onModifiersChange(modifiers.filter((row) => row.id !== id))
    if (activeId === id) setActiveId(null)
  }

  function addLine() {
    const line = createBonusLine({
      target: 'ac',
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
    const targetId = activeId ?? acLines[acLines.length - 1]?.id
    if (!targetId) {
      const line = createBonusLine({
        target: 'ac',
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
    const caret = el ? el.selectionStart : caretRef.current
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

  return (
    <Dialog
      open={open}
      title="Класс защиты"
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
              {summary}
              {bonusHint ? ` · ${bonusHint}` : ''}
            </Text>
          </div>
          <div className="ac-breakdown__badge" aria-label={`Итого ${totalAc} КД`}>
            <b>{totalAc}</b>
            <span>КД</span>
          </div>
        </div>

        <section className="ac-breakdown__section">
          <h3 className="ac-breakdown__label">База</h3>
          <div className="ac-breakdown__base">{baseLabel}</div>
        </section>

        <section className="ac-breakdown__section">
          <h3 className="ac-breakdown__label">Щит</h3>
          <div className="ac-breakdown__shield" role="group" aria-label="Щит">
            <button
              type="button"
              className={`ac-breakdown__shield-opt${!shieldInHand ? ' is-on' : ''}`}
              aria-pressed={!shieldInHand}
              onClick={() => {
                if (shieldInHand) onToggleShield()
              }}
            >
              Нет
            </button>
            <button
              type="button"
              className={`ac-breakdown__shield-opt${shieldInHand ? ' is-on' : ''}`}
              aria-pressed={shieldInHand}
              disabled={!shieldAvailable && !shieldInHand}
              onClick={() => {
                if (!shieldInHand) onToggleShield()
              }}
            >
              {shieldBonus > 0 ? `В руке (+${shieldBonus})` : 'В руке'}
            </button>
          </div>
        </section>

        <section className="ac-breakdown__section">
          <h3 className="ac-breakdown__label">Бонусы</h3>
          <div className="ac-breakdown__bonuses">
            {acLines.map((line) => (
              <BonusRow
                key={line.id}
                line={line}
                vars={formulaVars}
                active={activeId === line.id}
                onActivate={() => {
                  setActiveId(line.id)
                  const el = inputRefs.current[line.id]
                  caretRef.current = el?.selectionStart ?? null
                }}
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
              onClick={addLine}
            >
              + Добавить бонус
            </button>
          </div>
        </section>

        <VariablePicker
          vars={formulaVars}
          onPick={pickVariable}
          disabled={false}
        />
      </div>
    </Dialog>
  )
}
