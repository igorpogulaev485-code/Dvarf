/**
 * Speed bonus dialog — same kit shell as AC / Initiative (hero badge +
 * «+ Добавить бонус»). Walk always; climb / swim / fly when present in data
 * or already have bonus lines.
 */
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
import { VariablePicker } from './VariablePicker'

export type SpeedChannel = 'speed' | 'speed_climb' | 'speed_swim' | 'speed_fly'

type SpeedChannelSpec = {
  target: SpeedChannel
  label: string
  /** Auto base (race / gear / effects) before manual lines; null = no mode. */
  baseFt: number | null
  baseHint: string
}

type SpeedBreakdownDialogProps = {
  open: boolean
  channels: SpeedChannelSpec[]
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

function channelTotal(
  baseFt: number | null,
  lines: BonusLine[],
  vars: FormulaVars,
): number | null {
  if (baseFt == null && lines.length === 0) return null
  const core = baseFt ?? 0
  return applyBonusStack(core, lines, vars).total
}

export function SpeedBreakdownDialog({
  open,
  channels,
  formulaVars,
  modifiers,
  onModifiersChange,
  onClose,
}: SpeedBreakdownDialogProps) {
  const visible = channels.filter(
    (ch) =>
      ch.baseFt != null ||
      bonusesForTarget(modifiers, ch.target).length > 0 ||
      ch.target === 'speed',
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sessionOpen, setSessionOpen] = useState(false)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  if (open !== sessionOpen) {
    setSessionOpen(open)
    if (open) {
      const first =
        visible
          .flatMap((ch) => bonusesForTarget(modifiers, ch.target))
          .map((line) => line.id)[0] ?? null
      setActiveId(first)
    } else {
      setActiveId(null)
    }
  }

  const walk = visible.find((ch) => ch.target === 'speed') ?? visible[0]
  const walkLines = walk ? bonusesForTarget(modifiers, walk.target) : []
  const walkTotal = walk
    ? channelTotal(walk.baseFt, walkLines, formulaVars)
    : null
  const walkHint = walk
    ? formatBonusSummary(
        applyBonusStack(walk.baseFt ?? 0, walkLines, formulaVars).applied,
      )
    : ''

  const summaryBits = visible
    .map((ch) => {
      const lines = bonusesForTarget(modifiers, ch.target)
      const total = channelTotal(ch.baseFt, lines, formulaVars)
      if (total == null) return null
      return `${ch.label} ${total} фт`
    })
    .filter(Boolean)

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
      expr: '10',
      enabled: true,
      source: 'manual',
    })
    onModifiersChange([...modifiers, line])
    setActiveId(line.id)
    queueMicrotask(() => inputRefs.current[line.id]?.focus())
  }

  function pickVariable(token: string) {
    const pool = visible.flatMap((ch) => bonusesForTarget(modifiers, ch.target))
    const targetId = activeId ?? pool[pool.length - 1]?.id
    const defaultTarget = (walk?.target ?? 'speed') as BonusTarget
    if (!targetId) {
      const line = createBonusLine({
        target: defaultTarget,
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
      title="Скорость"
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
              {summaryBits.join(' · ') || 'Нет скорости'}
              {walkHint ? ` · ${walkHint}` : ''}
            </Text>
          </div>
          <div
            className="ac-breakdown__badge"
            aria-label={
              walkTotal != null ? `Скорость ${walkTotal} фт` : 'Скорость не задана'
            }
          >
            <b>{walkTotal != null ? walkTotal : '—'}</b>
            <span>фт</span>
          </div>
        </div>

        {visible.map((ch) => {
          const lines = bonusesForTarget(modifiers, ch.target)
          const total = channelTotal(ch.baseFt, lines, formulaVars)
          const hint = formatBonusSummary(
            applyBonusStack(ch.baseFt ?? 0, lines, formulaVars).applied,
          )
          return (
            <section key={ch.target} className="ac-breakdown__section">
              <h3 className="ac-breakdown__label">{ch.label}</h3>
              <div className="ac-breakdown__base">
                {ch.baseFt != null
                  ? `База ${ch.baseFt} фт · ${ch.baseHint}`
                  : `База не задана · ${ch.baseHint}`}
                {total != null && total !== (ch.baseFt ?? 0)
                  ? ` · итог ${total} фт`
                  : ''}
                {hint ? ` · ${hint}` : ''}
              </div>
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
                  onClick={() => addLine(ch.target)}
                >
                  + Добавить бонус
                </button>
              </div>
            </section>
          )
        })}

        <VariablePicker vars={formulaVars} onPick={pickVariable} />
      </div>
    </Dialog>
  )
}
