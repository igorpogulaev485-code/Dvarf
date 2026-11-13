import { useEffect, useState, type InputHTMLAttributes } from 'react'
import type { InputSize } from './Input'

type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'onBlur' | 'size'
> & {
  value: number | null
  min?: number
  max?: number
  /** Default true — levels/scores. Set false for weights and other decimals. */
  integer?: boolean
  emptyValue?: number | null
  onValueChange: (value: number | null) => void
  size?: InputSize
  /** Compact width for amount / «Число» — kit variant, not page CSS. */
  narrow?: boolean
}

function clampNumber(value: number, min?: number, max?: number): number {
  let next = value
  if (min != null) next = Math.max(min, next)
  if (max != null) next = Math.min(max, next)
  return next
}

function normalizeNumber(value: number, integer: boolean): number {
  return integer ? Math.trunc(value) : value
}

export function NumberInput({
  value,
  min,
  max,
  integer = true,
  emptyValue = null,
  onValueChange,
  className = '',
  size,
  narrow = false,
  ...props
}: NumberInputProps) {
  const [text, setText] = useState(value == null ? '' : String(value))

  useEffect(() => {
    setText(value == null ? '' : String(value))
  }, [value])

  function commit(raw: string) {
    if (raw.trim() === '') {
      setText(emptyValue == null ? '' : String(emptyValue))
      onValueChange(emptyValue)
      return
    }
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) {
      setText(value == null ? '' : String(value))
      return
    }
    const next = clampNumber(normalizeNumber(parsed, integer), min, max)
    setText(String(next))
    onValueChange(next)
  }

  const sizeClass = size ? `ui-input--${size}` : ''
  const narrowClass = narrow ? 'ui-input--narrow' : ''
  return (
    <input
      {...props}
      type="number"
      className={`ui-input ${sizeClass} ${narrowClass} ${className}`.trim()}
      min={min}
      max={max}
      value={text}
      onChange={(event) => {
        const raw = event.target.value
        setText(raw)
        if (raw.trim() === '') {
          return
        }
        // Allow typing "1." / "0.5" without forcing a commit mid-keystroke for decimals.
        if (!integer && (raw.endsWith('.') || raw.endsWith(','))) {
          return
        }
        const parsed = Number(raw.replace(',', '.'))
        if (!Number.isFinite(parsed)) {
          return
        }
        onValueChange(clampNumber(normalizeNumber(parsed, integer), min, max))
      }}
      onBlur={(event) => commit(event.target.value.replace(',', '.'))}
    />
  )
}
