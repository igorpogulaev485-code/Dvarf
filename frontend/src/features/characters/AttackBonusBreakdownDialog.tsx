import type { FormulaVars } from '../../shared/dnd/formulas'
import { Dialog, Text } from '../../ui'
import {
  sumAttackBonusParts,
  type AttackBonusPart,
} from './attackBonusBreakdown'
import { formatModifier } from './sheetTypes'
import { VariablePicker } from './VariablePicker'

type AttackBonusBreakdownDialogProps = {
  open: boolean
  /** Attack name for the title line. */
  attackName: string
  parts: AttackBonusPart[]
  /** Same collapsed VariablePicker shell as AC / initiative (B6 V2) — read-only here. */
  formulaVars: FormulaVars
  onClose: () => void
}

/** U09 / B8: read-only attack bonus breakdown (BM + ability + magic + other). */
export function AttackBonusBreakdownDialog({
  open,
  attackName,
  parts,
  formulaVars,
  onClose,
}: AttackBonusBreakdownDialogProps) {
  const total = sumAttackBonusParts(parts)
  const summary = parts
    .map((part) => {
      const bit = `${part.label} ${formatModifier(part.value)}`
      return part.hint ? `${bit} (${part.hint})` : bit
    })
    .join(' · ')

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
              {summary || 'Нет слагаемых'}
            </Text>
          </div>
          <div
            className="ac-breakdown__badge"
            aria-label={`Бонус атаки ${formatModifier(total)}`}
          >
            <b>{formatModifier(total)}</b>
            <span>атака</span>
          </div>
        </div>

        <section className="ac-breakdown__section">
          <h3 className="ac-breakdown__label">Из чего сложилось</h3>
          <div className="ac-breakdown__bonuses attack-bonus-breakdown__rows">
            {parts.map((part) => (
              <div key={part.id} className="ac-breakdown__base attack-bonus-breakdown__row">
                <span className="attack-bonus-breakdown__label">
                  {part.label}
                  {part.hint ? (
                    <small className="attack-bonus-breakdown__hint"> · {part.hint}</small>
                  ) : null}
                </span>
                <strong className="attack-bonus-breakdown__value">
                  {formatModifier(part.value)}
                </strong>
              </div>
            ))}
          </div>
        </section>

        <VariablePicker vars={formulaVars} onPick={() => undefined} disabled />
      </div>
    </Dialog>
  )
}
