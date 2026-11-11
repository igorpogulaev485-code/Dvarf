import { useEffect, useState, type InputHTMLAttributes } from 'react'

type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'onBlur'
> & {
  value: number | null
  min?: number
  max?: number
  /** Default true — levels/scores. Set false for weights and other decimals. */
  integer?: boolean
  emptyValue?: number | null
  onValueChange: (value: number | null) => void
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

  return (
    <input
      {...props}
      type="number"
      className={`ui-input ${className}`.trim()}
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
