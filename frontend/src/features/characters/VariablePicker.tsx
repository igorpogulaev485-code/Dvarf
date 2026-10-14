import {
  SHEET_VAR_DEFS,
  type FormulaVars,
} from '../../shared/dnd/formulas'
import { formatModifier } from './sheetTypes'

type VariablePickerProps = {
  vars: FormulaVars
  onPick: (token: string) => void
  disabled?: boolean
}

export function VariablePicker({ vars, onPick, disabled }: VariablePickerProps) {
  return (
    <section className="variable-picker" aria-label="Вставить показатель">
      <header className="variable-picker__head">
        <h3 className="variable-picker__title">Вставить показатель</h3>
        <p className="variable-picker__hint">
          Без «рытья» по именам — подпись и текущее значение сразу.
        </p>
      </header>
      <div className="variable-picker__table" role="list">
        <div className="variable-picker__caption">Показатели персонажа</div>
        {SHEET_VAR_DEFS.map((def) => {
          const raw = vars[def.key]
          const valueLabel =
            typeof raw === 'number' && Number.isFinite(raw)
              ? formatModifier(raw)
              : '—'
          return (
            <button
              key={def.key}
              type="button"
              role="listitem"
              className="variable-picker__row"
              disabled={disabled}
              onClick={() => onPick(`[${def.key}]`)}
            >
              <span className="variable-picker__label">
                {def.labelRu}
                {def.hintRu ? (
                  <small className="variable-picker__sub">{def.hintRu}</small>
                ) : null}
              </span>
              <span className="variable-picker__value">
                {valueLabel}
                <code className="variable-picker__token">[{def.key}]</code>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
