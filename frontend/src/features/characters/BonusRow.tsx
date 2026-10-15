import type { FormulaVars } from '../../shared/dnd/formulas'
import type { BonusLine, BonusOp } from './modifiers'
import { FormulaField } from './FormulaField'
import { Input } from '../../ui'

const OPS: BonusOp[] = ['+', '-', '=']

type BonusRowProps = {
  line: BonusLine
  vars: FormulaVars
  active: boolean
  onActivate: () => void
  onChange: (patch: Partial<BonusLine>) => void
  onRemove: () => void
  formulaInputRef?: (el: HTMLInputElement | null) => void
}

export function BonusRow({
  line,
  vars,
  active,
  onActivate,
  onChange,
  onRemove,
  formulaInputRef,
}: BonusRowProps) {
  return (
    <div className={`bonus-row${active ? ' is-active' : ''}${line.enabled ? '' : ' is-off'}`}>
      <div className="bonus-row__ops" role="group" aria-label="Операция">
        {OPS.map((op) => (
          <button
            key={op}
            type="button"
            className={`bonus-row__op${line.op === op ? ' is-on' : ''}`}
            aria-pressed={line.op === op}
            onClick={() => onChange({ op })}
          >
            {op === '-' ? '−' : op}
          </button>
        ))}
      </div>
      <Input
        className="bonus-row__label"
        value={line.label}
        aria-label="Название бонуса"
        placeholder="Бонус"
        onFocus={onActivate}
        onChange={(event) => onChange({ label: event.target.value })}
      />
      <FormulaField
        value={line.expr}
        vars={vars}
        aria-label="Формула бонуса"
        onFocus={onActivate}
        inputRef={formulaInputRef}
        onChange={(expr) => onChange({ expr })}
      />
      <button
        type="button"
        className={`bonus-row__toggle${line.enabled ? ' is-on' : ''}`}
        aria-pressed={line.enabled}
        aria-label={line.enabled ? 'Выключить бонус' : 'Включить бонус'}
        title={line.enabled ? 'Включён' : 'Выключен'}
        onClick={() => onChange({ enabled: !line.enabled })}
      />
      <button
        type="button"
        className="bonus-row__remove"
        aria-label="Удалить бонус"
        onClick={onRemove}
      >
        ×
      </button>
    </div>
  )
}
