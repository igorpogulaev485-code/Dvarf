/**
 * Editable weapon attack/damage bonus dialog — same kit shell as Ability /
 * SpellCast / AC breakdown (hero badge + sections + «+ Добавить бонус»).
 * Pre-SC-01 / Wave A pattern restored for compact attack cards (UIKIT-02).
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
  weaponDamageBonusTarget,
  weaponHitBonusTarget,
} from './modifiers'
import { formatModifier } from './sheetTypes'
import { VariablePicker } from './VariablePicker'

type WeaponAttackBreakdownDialogProps = {
  open: boolean
  attackName: string
  /** Ability+PB+gear+style+… before manual weapon_hit lines. */
  baseAttack: number
  /** Short base hint under «Атака», e.g. «СИЛ + БМ + магия». */
  attackBaseHint: string
  /** Ability/gear/… flat before manual weapon_dmg lines. */
  baseDamageBonus: number
  /** Damage die + type for the summary, e.g. «1к8 дробящий». */
  damageDieLabel: string
  formulaVars: FormulaVars
  modifiers: BonusLine[]
  onModifiersChange: (next: BonusLine[]) => void
  attackId: string
  inventoryItemId?: string | null
  onOpenItem?: (itemId: string) => void
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

export function WeaponAttackBreakdownDialog({
  open,
  attackName,
  baseAttack,
  attackBaseHint,
  baseDamageBonus,
  damageDieLabel,
  formulaVars,
  modifiers,
  onModifiersChange,
  attackId,
  inventoryItemId,
  onOpenItem,
  onClose,
}: WeaponAttackBreakdownDialogProps) {
  const hitTarget = weaponHitBonusTarget(attackId)
  const dmgTarget = weaponDamageBonusTarget(attackId)
  const hitLines = bonusesForTarget(modifiers, hitTarget)
  const dmgLines = bonusesForTarget(modifiers, dmgTarget)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sessionOpen, setSessionOpen] = useState(false)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  if (open !== sessionOpen) {
    setSessionOpen(open)
    if (open) {
      setActiveId(hitLines[0]?.id ?? dmgLines[0]?.id ?? null)
    } else {
      setActiveId(null)
    }
  }

  const hitStack = applyBonusStack(baseAttack, hitLines, formulaVars)
  const dmgStack = applyBonusStack(baseDamageBonus, dmgLines, formulaVars)
  const hitHint = formatBonusSummary(hitStack.applied)
  const dmgHint = formatBonusSummary(dmgStack.applied)
  const canOpenItem = Boolean(inventoryItemId && onOpenItem)

  const dmgTotalLabel =
    dmgStack.total === 0
      ? damageDieLabel
      : `${damageDieLabel}${dmgStack.total >= 0 ? '+' : ''}${dmgStack.total}`

  const summary = [
    `Атака ${formatModifier(hitStack.total)}`,
    `урон ${dmgTotalLabel}`,
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
      activeId ?? hitLines[hitLines.length - 1]?.id ?? dmgLines[dmgLines.length - 1]?.id
    if (!targetId) {
      const line = createBonusLine({
        target: hitTarget,
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
      title={attackName ? `Атака: ${attackName}` : 'Бонус атаки'}
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
              {hitHint ? ` · ${hitHint}` : ''}
              {dmgHint ? ` · ${dmgHint}` : ''}
            </Text>
          </div>
          <div
            className="ac-breakdown__badge"
            aria-label={`Бонус атаки ${formatModifier(hitStack.total)}`}
          >
            <b>{formatModifier(hitStack.total)}</b>
            <span>атака</span>
          </div>
        </div>

        {canOpenItem ? (
          <div className="inline-actions" style={{ marginBottom: 8 }}>
            <button
              type="button"
              className="sheet-chip"
              onClick={() => {
                if (!inventoryItemId || !onOpenItem) return
                onOpenItem(inventoryItemId)
              }}
            >
              Открыть предмет
            </button>
          </div>
        ) : null}

        <section className="ac-breakdown__section">
          <h3 className="ac-breakdown__label">Атака</h3>
          <div className="ac-breakdown__base">
            База {formatModifier(baseAttack)}
            {attackBaseHint ? ` · ${attackBaseHint}` : ''}
          </div>
          {renderRows(hitLines, hitTarget)}
        </section>

        <section className="ac-breakdown__section">
          <h3 className="ac-breakdown__label">Урон</h3>
          <div className="ac-breakdown__base">
            {damageDieLabel}
            {baseDamageBonus
              ? ` · мод. ${formatModifier(baseDamageBonus)}`
              : ''}
            {dmgHint ? ` · ${dmgHint}` : ''}
          </div>
          {renderRows(dmgLines, dmgTarget)}
        </section>

        <VariablePicker vars={formulaVars} onPick={pickVariable} />
      </div>
    </Dialog>
  )
}
