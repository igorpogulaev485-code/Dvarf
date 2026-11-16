import type { ButtonHTMLAttributes } from 'react'

type StepperProps = {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Accessible name for the whole control. */
  'aria-label': string
  size?: 'sm' | 'md'
  disabled?: boolean
  className?: string
  /** Optional id on the value readout. */
  id?: string
}

type StepBtnProps = ButtonHTMLAttributes<HTMLButtonElement>

function StepBtn({ className = '', ...props }: StepBtnProps) {
  return (
    <button
      type="button"
      className={`ui-stepper__btn ${className}`.trim()}
      {...props}
    />
  )
}

/**
 * Kit compact stepper — − / value / + in one control-height row.
 * Width hugs content (not a full-width field).
 */
export function Stepper({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  'aria-label': ariaLabel,
  size = 'sm',
  disabled = false,
  className = '',
  id,
}: StepperProps) {
  const sizeClass = size === 'md' ? ' ui-stepper--md' : ' ui-stepper--sm'
  const atMin = min != null && value <= min
  const atMax = max != null && value >= max

  function bump(delta: number) {
    let next = value + delta
    if (min != null) next = Math.max(min, next)
    if (max != null) next = Math.min(max, next)
    if (next !== value) onValueChange(next)
  }

  return (
    <div
      className={`ui-stepper${sizeClass} ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      <StepBtn
        aria-label="Меньше"
        disabled={disabled || atMin}
        onClick={() => bump(-step)}
      >
        −
      </StepBtn>
      <span id={id} className="ui-stepper__value" aria-live="polite">
        {value}
      </span>
      <StepBtn
        aria-label="Больше"
        disabled={disabled || atMax}
        onClick={() => bump(step)}
      >
        +
      </StepBtn>
    </div>
  )
}
