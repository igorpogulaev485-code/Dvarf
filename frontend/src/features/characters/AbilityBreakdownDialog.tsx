import { useRef, useState } from 'react'
import type { FormulaVars } from '../../shared/dnd/formulas'
import { Dialog, NumberInput, Text } from '../../ui'
import { BonusRow } from './BonusRow'
import {
  applyBonusStack,
  bonusesForTarget,
  createBonusLine,
  formatBonusSummary,
  type AbilityChannel,
  type BonusLine,
  abilityBonusTarget,
} from './modifiers'
import {
  ABILITY_NAMES,
  abilityModifier,
  formatModifier,
  type AbilityKey,
} from './sheetTypes'
import { VariablePicker } from './VariablePicker'

type AbilityBreakdownDialogProps = {
  open: boolean
  ability: AbilityKey
  /** Raw sheet score (before gear / score buffs). */
  baseScore: number
  /** Score after gear, before manual score buffs (for display hint). */
  gearScore: number
  proficientSave: boolean
  proficiencyBonus: number
  formulaVars: FormulaVars
  modifiers: BonusLine[]
  onBaseScoreChange: (score: number) => void
  onSaveProficiencyChange: (proficient: boolean) => void
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

export function AbilityBreakdownDialog({
  open,
  ability,
  baseScore,
  gearScore,
  proficientSave,
  proficiencyBonus,
  formulaVars,
  modifiers,
  onBaseScoreChange,
  onSaveProficiencyChange,
  onModifiersChange,
  onClose,
}: AbilityBreakdownDialogProps) {
  const scoreTarget = abilityBonusTarget(ability, 'score')
  const checkTarget = abilityBonusTarget(ability, 'check')
  const saveTarget = abilityBonusTarget(ability, 'save')
  const scoreLines = bonusesForTarget(modifiers, scoreTarget)
  const checkLines = bonusesForTarget(modifiers, checkTarget)
  const saveLines = bonusesForTarget(modifiers, saveTarget)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [sessionOpen, setSessionOpen] = useState(false)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  if (open !== sessionOpen) {
    setSessionOpen(open)
    if (open) {
      const first =
        scoreLines[0]?.id ?? checkLines[0]?.id ?? saveLines[0]?.id ?? null
      setActiveId(first)
    } else {
      setActiveId(null)
    }
  }

  const scoreStack = applyBonusStack(gearScore, scoreLines, formulaVars)
  const totalScore = Math.min(30, Math.max(1, scoreStack.total))
  const mod = abilityModifier(totalScore)
  const checkStack = applyBonusStack(mod, checkLines, formulaVars)
  const saveBase = mod + (proficientSave ? proficiencyBonus : 0)
  const saveStack = applyBonusStack(saveBase, saveLines, formulaVars)

  const scoreHint = formatBonusSummary(scoreStack.applied)
  const checkHint = formatBonusSummary(checkStack.applied)
  const saveHint = formatBonusSummary(saveStack.applied)

  const summary = [
    `Значение ${totalScore}`,
    `проверка ${formatModifier(checkStack.total)}`,
    `спас ${formatModifier(saveStack.total)}`,
  ].join(' · ')

  function patchLine(id: string, patch: Partial<BonusLine>) {
    onModifiersChange(
      modifiers.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )
  }

  function removeLine(id: string) {
    onModifiersChange(modifiers.filter((row) => row.id !== id))
    if (activeId === id) setActiveId(null)
  }

  function addLine(channel: AbilityChannel) {
    const line = createBonusLine({
      target: abilityBonusTarget(ability, channel),
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
      scoreLines[scoreLines.length - 1]?.id ??
      checkLines[checkLines.length - 1]?.id ??
      saveLines[saveLines.length - 1]?.id
    if (!targetId) {
      const line = createBonusLine({
        target: scoreTarget,
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

  function renderRows(lines: BonusLine[], channel: AbilityChannel) {
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
          onClick={() => addLine(channel)}
        >
          + Добавить бонус
        </button>
      </div>
    )
  }

  const gearNote =
    gearScore !== baseScore
      ? `${baseScore} до предметов · с предметами ${gearScore}`
      : `${baseScore} до расовых и бафов`

  return (
    <Dialog
      open={open}
      title={ABILITY_NAMES[ability]}
      size="wide"
      primaryLabel="Готово"
      secondaryLabel="Закрыть"
      onPrimary={onClose}
      onSecondary={onClose}
    >
      <div className="ac-breakdown ability-breakdown">
        <div className="ac-breakdown__hero">
          <div className="ac-breakdown__hero-text">
            <Text tone="muted" className="ac-breakdown__summary">
              {summary}
              {scoreHint ? ` · ${scoreHint}` : ''}
            </Text>
          </div>
          <div
            className="ac-breakdown__badge"
            aria-label={`Модификатор ${formatModifier(mod)}`}
          >
            <b>{formatModifier(mod)}</b>
            <span>мод.</span>
          </div>
        </div>

        <section className="ac-breakdown__section">
          <h3 className="ac-breakdown__label">Значение</h3>
          <label className="ability-breakdown__base">
            <span className="ability-breakdown__base-label">Базовое значение</span>
            <NumberInput
              min={1}
              max={30}
              emptyValue={10}
              value={baseScore}
              onValueChange={(next) => onBaseScoreChange(next ?? 10)}
              inputMode="numeric"
            />
            <span className="ability-breakdown__base-hint">{gearNote}</span>
          </label>
          {renderRows(scoreLines, 'score')}
        </section>

        <section className="ac-breakdown__section">
          <h3 className="ac-breakdown__label">Проверки</h3>
          <Text tone="muted" className="ability-breakdown__channel-hint">
            Проверка {formatModifier(checkStack.total)}
            {checkHint ? ` · ${checkHint}` : ''}
          </Text>
          {renderRows(checkLines, 'check')}
        </section>

        <section className="ac-breakdown__section">
          <h3 className="ac-breakdown__label">Спасбросок</h3>
          <div className="ac-breakdown__shield" role="group" aria-label="Владение">
            <button
              type="button"
              className={`ac-breakdown__shield-opt${!proficientSave ? ' is-on' : ''}`}
              aria-pressed={!proficientSave}
              onClick={() => onSaveProficiencyChange(false)}
            >
              Нет
            </button>
            <button
              type="button"
              className={`ac-breakdown__shield-opt${proficientSave ? ' is-on' : ''}`}
              aria-pressed={proficientSave}
              onClick={() => onSaveProficiencyChange(true)}
            >
              Владение
              {proficientSave ? ` (${formatModifier(proficiencyBonus)})` : ''}
            </button>
          </div>
          <Text tone="muted" className="ability-breakdown__channel-hint">
            Спас {formatModifier(saveStack.total)}
            {saveHint ? ` · ${saveHint}` : ''}
          </Text>
          {renderRows(saveLines, 'save')}
        </section>

        <VariablePicker vars={formulaVars} onPick={pickVariable} />
      </div>
    </Dialog>
  )
}
