import { useRef, useState } from 'react'
import type { FormulaVars } from '../../shared/dnd/formulas'
import { Button, Dialog, NumberInput, Text } from '../../ui'
import { BonusRow } from './BonusRow'
import {
  applyBonusStack,
  bonusesForTarget,
  createBonusLine,
  formatBonusSummary,
  type BonusLine,
} from './modifiers'
import { formatModifier } from './sheetTypes'
import { VariablePicker } from './VariablePicker'

type InitiativeBreakdownDialogProps = {
  open: boolean
  /** DEX mod + feat (or other auto bits), before override / buffs. */
  autoCore: number
  autoLabel: string
  override: number | null
  onOverrideChange: (value: number | null) => void
  formulaVars: FormulaVars
  modifiers: BonusLine[]
  onModifiersChange: (next: BonusLine[]) => void
  onRoll?: () => void
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

export function InitiativeBreakdownDialog({
  open,
  autoCore,
  autoLabel,
  override,
  onOverrideChange,
  formulaVars,
  modifiers,
  onModifiersChange,
  onRoll,
  onClose,
}: InitiativeBreakdownDialogProps) {
  const lines = bonusesForTarget(modifiers, 'initiative')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sessionOpen, setSessionOpen] = useState(false)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  if (open !== sessionOpen) {
    setSessionOpen(open)
    if (open) setActiveId(lines[0]?.id ?? null)
    else setActiveId(null)
  }

  const core = override ?? autoCore
  const stacked = applyBonusStack(core, lines, formulaVars)
  const bonusHint = formatBonusSummary(stacked.applied)

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
      target: 'initiative',
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
    const targetId = activeId ?? lines[lines.length - 1]?.id
    if (!targetId) {
      const line = createBonusLine({
        target: 'initiative',
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

  return (
    <Dialog
      open={open}
      title="Инициатива"
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
              {override != null
                ? `Оверрайд ${formatModifier(override)}`
                : autoLabel}
              {bonusHint ? ` · ${bonusHint}` : ''}
            </Text>
            {onRoll ? (
              <Button
                variant="secondary"
                className="initiative-breakdown__roll"
                onClick={onRoll}
              >
                Бросок инициативы
              </Button>
            ) : null}
          </div>
          <div
            className="ac-breakdown__badge"
            aria-label={`Инициатива ${formatModifier(stacked.total)}`}
          >
            <b>{formatModifier(stacked.total)}</b>
            <span>иниц.</span>
          </div>
        </div>

        <section className="ac-breakdown__section">
          <h3 className="ac-breakdown__label">База</h3>
          <div className="ac-breakdown__base">{autoLabel}</div>
          <label className="ability-breakdown__base" style={{ marginTop: 8 }}>
            <span className="ability-breakdown__base-label">
              Оверрайд (пусто = авто)
            </span>
            <NumberInput
              min={-10}
              max={30}
              emptyValue={null}
              value={override}
              onValueChange={(value) => onOverrideChange(value)}
              inputMode="numeric"
            />
            <span className="ability-breakdown__base-hint">
              {override != null
                ? `Вместо авто (${formatModifier(autoCore)})`
                : 'Считается от Ловкости и черт'}
            </span>
          </label>
        </section>

        <section className="ac-breakdown__section">
          <h3 className="ac-breakdown__label">Бонусы</h3>
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
            <button type="button" className="ac-breakdown__add" onClick={addLine}>
              + Добавить бонус
            </button>
          </div>
        </section>

        <VariablePicker vars={formulaVars} onPick={pickVariable} />
      </div>
    </Dialog>
  )
}
