import { useState } from 'react'
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

/** B6 V2: formula variable encyclopedia collapsed by default. */
export function VariablePicker({ vars, onPick, disabled }: VariablePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <section className="variable-picker" aria-label="Вставить показатель">
      <header className="variable-picker__head">
        <button
          type="button"
          className="variable-picker__toggle"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <h3 className="variable-picker__title">Вставить показатель</h3>
          <span className="variable-picker__chevron" aria-hidden>
            {open ? '▾' : '▸'}
          </span>
        </button>
        <p className="variable-picker__hint">
          {open
            ? 'Без «рытья» по именам — подпись и текущее значение сразу.'
            : 'Расширенные: переменные [STR], [PROF]… для формул.'}
        </p>
      </header>
      {open ? (
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
      ) : null}
    </section>
  )
}
