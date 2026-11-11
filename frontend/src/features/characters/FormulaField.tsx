import { evalFormula, type FormulaVars } from '../../shared/dnd/formulas'

type FormulaFieldProps = {
  value: string
  vars: FormulaVars
  onChange: (value: string) => void
  onFocus?: () => void
  inputRef?: (el: HTMLInputElement | null) => void
  'aria-label'?: string
}

export function FormulaField({
  value,
  vars,
  onChange,
  onFocus,
  inputRef,
  'aria-label': ariaLabel = 'Формула',
}: FormulaFieldProps) {
  const trimmed = value.trim()
  const result = trimmed
    ? evalFormula(trimmed, vars)
    : { ok: true as const, value: 0 }
  const hint = result.ok ? String(result.value) : result.error

  return (
    <div
      className={`formula-field${result.ok ? '' : ' is-invalid'}`}
      title={result.ok ? `= ${result.value}` : result.error}
    >
      <span className="formula-field__mark" aria-hidden>
        ƒ
      </span>
      <input
        ref={inputRef}
        className="ui-input formula-field__input"
        value={value}
        aria-label={ariaLabel}
        spellCheck={false}
        autoComplete="off"
        onFocus={onFocus}
        onChange={(event) => onChange(event.target.value)}
        onSelect={(event) => {
          const el = event.currentTarget
          // Keep caret for VariablePicker insert when focus leaves briefly.
          el.dataset.caret = String(el.selectionStart ?? el.value.length)
        }}
      />
      <span className="formula-field__hint" aria-hidden>
        {hint}
      </span>
    </div>
  )
}
